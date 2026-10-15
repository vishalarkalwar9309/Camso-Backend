'use strict';

/**
 * Unit tests for src/core/utils/mediaUpload.js
 */

const { uploadFileToStorage, ALLOWED_MIME_TYPES } = require('../../src/core/utils/mediaUpload');
const firebaseConfig = require('../../src/config/firebase');
const fs = require('fs');
const path = require('path');

describe('Media Upload Utility (src/core/utils/mediaUpload.js)', () => {
  const dummyFile = {
    originalname: 'test_tyre.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('fake-image-bytes'),
  };

  afterAll(() => {
    // Clean up created test uploads folder if present
    const testDir = path.resolve(process.cwd(), 'uploads/test_folder');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('rejects upload if file or buffer is missing', async () => {
    await expect(uploadFileToStorage({ file: null })).rejects.toThrow(
      /No file uploaded or file buffer is empty/
    );
    await expect(uploadFileToStorage({ file: { buffer: null } })).rejects.toThrow(
      /No file uploaded or file buffer is empty/
    );
  });

  it('uploads to local filesystem fallback when Firebase is not configured (is_mock: true)', async () => {
    jest.spyOn(firebaseConfig, 'getIsFirebaseReady').mockReturnValue(false);

    const result = await uploadFileToStorage({ file: dummyFile, folder: 'test_folder' });

    expect(result).toHaveProperty('url');
    expect(result.url).toContain('/uploads/test_folder/');
    expect(result.filename).toContain('test_tyre.jpg');
    expect(result.mimetype).toBe('image/jpeg');
    expect(result.size).toBe(1024);
    expect(result.is_mock).toBe(true);

    // Verify file actually written to local filesystem
    const expectedPath = path.resolve(process.cwd(), 'uploads/test_folder', result.filename);
    expect(fs.existsSync(expectedPath)).toBe(true);
  });

  it('uploads to Firebase Storage bucket when Firebase is ready (is_mock: false)', async () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    const mockMakePublic = jest.fn().mockResolvedValue(true);
    const mockFile = jest.fn().mockReturnValue({
      save: mockSave,
      makePublic: mockMakePublic,
    });
    const mockBucket = {
      name: 'camso-mock-bucket',
      file: mockFile,
    };

    jest.spyOn(firebaseConfig, 'getIsFirebaseReady').mockReturnValue(true);
    jest.spyOn(firebaseConfig, 'getStorageBucket').mockReturnValue(mockBucket);

    const result = await uploadFileToStorage({ file: dummyFile, folder: 'cloud_images' });

    expect(mockFile).toHaveBeenCalledWith(expect.stringContaining('cloud_images/'));
    expect(mockSave).toHaveBeenCalledWith(dummyFile.buffer, {
      metadata: { contentType: 'image/jpeg' },
      resumable: false,
    });
    expect(result.is_mock).toBe(false);
    expect(result.url).toContain('https://storage.googleapis.com/camso-mock-bucket/cloud_images/');
  });

  it('defines the required MIME types for tyres, documents, and videos', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
    expect(ALLOWED_MIME_TYPES).toContain('image/png');
    expect(ALLOWED_MIME_TYPES).toContain('application/pdf');
    expect(ALLOWED_MIME_TYPES).toContain('video/mp4');
  });

  it('throws in production mode if Firebase Storage is not configured (no silent fallback)', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    jest.spyOn(firebaseConfig, 'getIsFirebaseReady').mockReturnValue(false);

    try {
      await expect(
        uploadFileToStorage({ file: dummyFile, folder: 'test_folder' })
      ).rejects.toThrow(/Cloud storage service is not configured or unavailable in production/);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
