'use strict';

/**
 * src/modules/media/media.controller.js
 *
 * Controller for administrative media file uploads.
 * Integrates with Multer and Firebase Storage / local fallback utility.
 */

const { uploadFileToStorage } = require('../../core/utils/mediaUpload');
const { recordAudit } = require('../../core/services/auditService');
const { sendSuccess } = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const ApiError = require('../../core/utils/ApiError');

const ALLOWED_FOLDERS = ['general', 'products', 'categories', 'documents', 'banners'];

/**
 * POST /api/v1/admin/media/upload
 *
 * Expects multipart/form-data with field 'file' and optional field 'folder'.
 */
const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No file provided in form-data field "file".');
  }

  let folder = req.body.folder || 'general';
  if (!ALLOWED_FOLDERS.includes(folder)) {
    folder = 'general';
  }

  const result = await uploadFileToStorage({
    file: req.file,
    folder,
  });

  // Record audit log for media asset upload
  await recordAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    action: 'CREATE',
    entityType: 'MEDIA_ASSET',
    details: {
      filename: result.filename,
      mimetype: result.mimetype,
      size: result.size,
      folder,
      is_mock: result.is_mock,
    },
  });

  sendSuccess(res, result, 201);
});

module.exports = {
  uploadMedia,
  ALLOWED_FOLDERS,
};
