'use strict';

/**
 * src/modules/media/media.admin.routes.js
 *
 * Administrative routes for uploading and managing media assets.
 * Mounted at /api/v1/admin/media in src/routes/index.js.
 */

const { Router } = require('express');
const adminGuard = require('../../core/middleware/adminGuard');
const requireRole = require('../../core/middleware/requireRole');
const { upload } = require('../../core/utils/mediaUpload');
const controller = require('./media.controller');

const router = Router();

// Protect all admin media routes with JWT verification
router.use(adminGuard);

/**
 * POST /api/v1/admin/media/upload
 * Requires CONTENT_ADMIN, MARKETING, or SUPER_ADMIN role.
 */
router.post(
  '/upload',
  requireRole('CONTENT_ADMIN', 'MARKETING', 'SUPER_ADMIN'),
  upload.single('file'),
  controller.uploadMedia
);

module.exports = router;
