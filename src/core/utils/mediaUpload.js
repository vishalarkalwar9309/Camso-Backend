'use strict';

/**
 * src/core/utils/mediaUpload.js
 *
 * WHAT THIS FILE DOES:
 *   Handles server-side file uploads to Firebase Storage and creates
 *   the corresponding MediaAsset database record.
 *
 * OVERALL DESIGN:
 *   All file uploads go through this single module.
 *   Upload flow: multipart/form-data → multer (memory) → Firebase Admin SDK → media_assets row.
 *   No signed URLs. No client-to-Firebase-direct uploads.
 *   Server is the only entity that writes to Firebase Storage (Admin SDK).
 *
 * ELEMENTS:
 *   upload        — multer middleware for multipart parsing (memory storage)
 *   uploadToFirebase(file, adminUserId, prismaClient) — uploads to Storage + creates DB record
 *
 * FINAL OUTPUT:
 *   module.exports = { upload, uploadToFirebase }
 *
 * IMPORTED BY:
 *   src/modules/documents/documents.controller.js (POST /admin/documents/:id/files)
 *   src/modules/testimonials/testimonials.controller.js (optional media)
 *   src/modules/products/products.controller.js (Vishal's module, POST /admin/products/:id/images)
 *
 * SECURITY:
 *   Files are uploaded server-side only. Firebase credentials never leave the server.
 *   File size and MIME type validation is enforced by multer limits + fileFilter.
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 13 (Admin CMS & file uploads)
 *            docs/CAMSO_Backend_Plan.md Section 14 (Firebase: Storage)
 */

const multer = require('multer');
const path = require('path');
const ApiError = require('./ApiError');

// ─── Multer Configuration ─────────────────────────────────────────────────────

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

/**
 * upload
 *
 * USE: Multer middleware for parsing multipart/form-data file uploads.
 *      Stores file in memory (Buffer) before Firebase upload.
 *
 * HOW IT WORKS:
 *   memoryStorage keeps the file in req.file.buffer.
 *   fileFilter rejects disallowed MIME types before upload.
 *   limits.fileSize rejects oversized uploads.
 *
 * CONCEPTS: Multer memory storage, MIME type validation.
 *
 * EXAMPLE:
 *   router.post('/files', upload.single('file'), asyncHandler(controller.uploadFile));
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        ApiError.validation(`File type not allowed: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`),
        false,
      );
    }
  },
});

const mediaAssetRepository = require('../repositories/mediaAsset.repository');

/**
 * uploadToFirebase
 *
 * USE: Uploads a file (from req.file) to Firebase Storage and creates
 *      a MediaAsset database record via mediaAssetRepository.
 *
 * HOW IT WORKS:
 *   1. Checks Firebase is initialized (isFirebaseReady).
 *   2. Generates a unique storage path using timestamp + original filename.
 *   3. Saves the file buffer to Firebase Storage via Admin SDK.
 *   4. Makes the file public.
 *   5. Creates a media_assets row via mediaAssetRepository.
 *   6. Returns the created MediaAsset record.
 *
 * CONCEPTS:
 *   Firebase Admin SDK Storage. Server-mediated upload. Repository pattern.
 *
 * BEFORE: File exists only in memory (req.file.buffer).
 * AFTER:  File in Firebase Storage + media_assets record in PostgreSQL.
 *
 * @param {object} file         — multer file object (req.file)
 * @param {number} adminUserId  — ID of the admin performing the upload
 * @param {object} [prismaClient] — optional Prisma client instance (passed to repository)
 * @param {string} [folder]     — optional subfolder in Firebase Storage (e.g. 'documents')
 * @returns {Promise<object>}   — created MediaAsset record
 */
async function uploadToFirebase(file, adminUserId, prismaClient, folder = 'uploads') {
  const { isFirebaseReady, admin } = require('../../config/firebase');

  if (!isFirebaseReady) {
    throw ApiError.internal(
      'Firebase Storage is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, ' +
        'FIREBASE_PRIVATE_KEY, and FIREBASE_STORAGE_BUCKET in your environment.',
    );
  }

  const ext = path.extname(file.originalname);
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const bucket = admin.storage().bucket();
  const fileRef = bucket.file(filename);

  await fileRef.save(file.buffer, {
    metadata: { contentType: file.mimetype },
  });

  await fileRef.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

  const mediaAsset = await mediaAssetRepository.createMediaAsset(
    {
      url: publicUrl,
      filename: file.originalname,
      mime_type: file.mimetype,
      size_bytes: file.size,
      uploaded_by_admin_id: adminUserId,
    },
    prismaClient,
  );

  return mediaAsset;
}

module.exports = { upload, uploadToFirebase };
