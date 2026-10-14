'use strict';

/**
 * src/core/utils/mediaUpload.js
 *
 * Handles file upload validation and storage.
 * Supports:
 * 1. Multer memory-storage middleware for multipart form-data.
 * 2. Upload to Firebase Storage when credentials are configured.
 * 3. Transparent local mock/filesystem fallback when offline (clearly flagged as is_mock: true).
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('./ApiError');
const firebase = require('../../config/firebase');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
];

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// Multer memory-storage upload middleware
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        ApiError.badRequest(
          `File type not allowed: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
        ),
        false
      );
    }
  },
});

/**
 * Uploads a file buffer to Firebase Storage or local fallback.
 *
 * @param {object} params
 * @param {object} params.file - Express/Multer file object (buffer, originalname, mimetype, size)
 * @param {string} [params.folder='uploads'] - Target folder in bucket or local storage
 * @returns {Promise<{ url: string, filename: string, mimetype: string, size: number, is_mock: boolean }>}
 */
async function uploadFileToStorage({ file, folder = 'uploads' }) {
  if (!file || !file.buffer) {
    throw ApiError.badRequest('No file uploaded or file buffer is empty.');
  }

  const timestamp = Date.now();
  const sanitizedOriginal = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${timestamp}_${sanitizedOriginal}`;
  const destination = `${folder}/${filename}`;

  // Check if Firebase Storage is live
  if (firebase.getIsFirebaseReady()) {
    const bucket = firebase.getStorageBucket();
    const gcsFile = bucket.file(destination);

    await gcsFile.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
      resumable: false,
    });

    // Make public or build standard Firebase public storage URL
    try {
      await gcsFile.makePublic();
    } catch {
      // In case uniform bucket-level access is enabled
    }

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
    return {
      url: publicUrl,
      filename,
      mimetype: file.mimetype,
      size: file.size,
      is_mock: false,
    };
  }

  // Safe local development fallback:
  // Write to local uploads directory and return local URL path
  const localDir = path.resolve(process.cwd(), 'uploads', folder);
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  const localFilePath = path.join(localDir, filename);
  fs.writeFileSync(localFilePath, file.buffer);

  const localUrl = `/uploads/${folder}/${filename}`;
  return {
    url: localUrl,
    filename,
    mimetype: file.mimetype,
    size: file.size,
    is_mock: true,
  };
}

const mediaAssetRepository = require('../repositories/mediaAsset.repository');

/**
 * Uploads a file (to Firebase Storage or local fallback) and creates a MediaAsset record.
 *
 * @param {object} file - Multer file object
 * @param {string|number} adminUserId - Uploading admin ID
 * @param {object} [prismaClient] - Optional Prisma client instance
 * @param {string} [folder='uploads'] - Target folder
 * @returns {Promise<object>} Created MediaAsset record
 */
async function uploadToFirebase(file, adminUserId, prismaClient, folder = 'uploads') {
  if (!file || !file.buffer) {
    throw ApiError.badRequest('No file provided or file buffer is empty.');
  }

  const uploadResult = await uploadFileToStorage({ file, folder });

  const mediaAsset = await mediaAssetRepository.createMediaAsset(
    {
      url: uploadResult.url,
      filename: file.originalname || uploadResult.filename,
      mime_type: file.mimetype,
      size_bytes: file.size,
      uploaded_by_admin_id: adminUserId ? String(adminUserId) : null,
    },
    prismaClient
  );

  return mediaAsset;
}

module.exports = {
  upload,
  uploadFileToStorage,
  uploadToFirebase,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
};

