'use strict';

/**
 * src/core/utils/supabaseStorage.js
 *
 * Supabase Storage transport engine for private buckets (e.g. "Camso documents").
 * Handles multipart file uploads and time-limited signed URL generation.
 */

const path = require('path');
const ApiError = require('./ApiError');
const supabaseConfig = require('../../config/supabase');

/**
 * Normalizes a storage path, removing any "supabase://<bucket>/" prefix if stored in DB.
 *
 * @param {string} fullOrRelativePath
 * @returns {string} clean relative object path (e.g. "documents/1792080000000_sample.pdf")
 */
function normalizeStoragePath(fullOrRelativePath) {
  if (!fullOrRelativePath) return '';
  if (fullOrRelativePath.startsWith('supabase://')) {
    const withoutScheme = fullOrRelativePath.slice('supabase://'.length);
    const slashIdx = withoutScheme.indexOf('/');
    if (slashIdx !== -1) {
      return withoutScheme.slice(slashIdx + 1);
    }
    return withoutScheme;
  }
  return fullOrRelativePath;
}

/**
 * Uploads a file buffer to the private Supabase Storage bucket.
 *
 * @param {object} params
 * @param {object} params.file - Express/Multer file object (buffer, originalname, mimetype, size)
 * @param {string} [params.folder='documents'] - Subfolder in the bucket
 * @returns {Promise<{ storage_path: string, bucket: string, filename: string, mimetype: string, size: number, url: string }>}
 */
async function uploadFileToSupabase({ file, folder = 'documents' }) {
  if (!file || !file.buffer) {
    throw ApiError.badRequest('No file uploaded or file buffer is empty.');
  }

  const { url, secretKey, bucket, isReady } = supabaseConfig.getSupabaseConfig();
  if (!isReady) {
    throw ApiError.internal('Supabase Storage is not configured or credentials are missing.');
  }

  const timestamp = Date.now();
  const sanitizedOriginal = path.basename(file.originalname || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${timestamp}_${sanitizedOriginal}`;
  const destination = `${folder}/${filename}`;

  const uploadEndpoint = `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${destination}`;

  try {
    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'apikey': secretKey,
        'Content-Type': file.mimetype || 'application/pdf',
        'x-upsert': 'true',
      },
      body: file.buffer,
    });

    if (!response.ok) {
      const errBody = await response.text();
      let errorMsg = `Upload failed with HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errBody);
        errorMsg = parsed.message || parsed.error || errorMsg;
      } catch (_) {
        // use fallback message
      }
      throw ApiError.internal(`Storage upload rejected: ${errorMsg}`);
    }

    return {
      storage_path: destination,
      bucket,
      filename,
      mimetype: file.mimetype || 'application/pdf',
      size: file.size,
      url: `supabase://${bucket}/${destination}`,
    };
  } catch (err) {
    if (err.isApiError) throw err;
    throw ApiError.internal(`Failed to upload file to storage: ${err.message}`);
  }
}

/**
 * Generates a time-limited signed URL for an object in the private bucket.
 *
 * @param {string} rawStoragePath - relative path or "supabase://bucket/path"
 * @param {number} [expiresInSeconds=3600] - URL validity in seconds (default 1 hour)
 * @returns {Promise<string>} Full HTTP signed download URL
 */
async function createSignedDownloadUrl(rawStoragePath, expiresInSeconds = 3600) {
  const cleanPath = normalizeStoragePath(rawStoragePath);
  if (!cleanPath) {
    throw ApiError.badRequest('Invalid storage path for signed URL generation.');
  }

  const { url, secretKey, bucket, isReady } = supabaseConfig.getSupabaseConfig();
  if (!isReady) {
    throw ApiError.internal('Supabase Storage is not configured or credentials are missing.');
  }

  const signEndpoint = `${url}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${cleanPath}`;

  try {
    const response = await fetch(signEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'apikey': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      let errorMsg = `Signing failed with HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errBody);
        errorMsg = parsed.message || parsed.error || errorMsg;
      } catch (_) {
        // use fallback message
      }
      throw ApiError.internal(`Storage signed URL error: ${errorMsg}`);
    }

    const data = await response.json();
    if (!data.signedURL) {
      throw ApiError.internal('Storage service returned invalid signed URL payload.');
    }

    // Ensure leading slash alignment
    const relativeSignedUrl = data.signedURL.startsWith('/') ? data.signedURL : `/${data.signedURL}`;
    return `${url}/storage/v1${relativeSignedUrl}`;
  } catch (err) {
    if (err.isApiError) throw err;
    throw ApiError.internal(`Failed to generate signed download URL: ${err.message}`);
  }
}

/**
 * Deletes a file from Supabase Storage.
 *
 * @param {string} rawStoragePath
 * @returns {Promise<boolean>}
 */
async function deleteFileFromSupabase(rawStoragePath) {
  const cleanPath = normalizeStoragePath(rawStoragePath);
  if (!cleanPath) return false;

  const { url, secretKey, bucket, isReady } = supabaseConfig.getSupabaseConfig();
  if (!isReady) return false;

  const deleteEndpoint = `${url}/storage/v1/object/${encodeURIComponent(bucket)}`;

  try {
    const response = await fetch(deleteEndpoint, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'apikey': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: [cleanPath] }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

module.exports = {
  uploadFileToSupabase,
  createSignedDownloadUrl,
  deleteFileFromSupabase,
  normalizeStoragePath,
};
