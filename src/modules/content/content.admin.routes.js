'use strict';

/**
 * content.admin.routes — Administrative CMS endpoints for content & settings.
 *
 * Mounted at /api/v1/admin/content.
 */

const { Router } = require('express');
const adminGuard = require('../../core/middleware/adminGuard');
const requireRole = require('../../core/middleware/requireRole');
const controller = require('./content.controller');
const {
  validate,
  contentKeyParamSchema,
  updateContentSchema,
} = require('./content.validation');

const router = Router();

router.use(adminGuard);

// GET /api/v1/admin/content/:key — view content/settings by key (includes inactive)
router.get(
  '/:key',
  requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'),
  validate(contentKeyParamSchema, 'params'),
  controller.getAdminContentByKey
);

// PUT /api/v1/admin/content/:key — create or update content/settings with audit logging
router.put(
  '/:key',
  requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'),
  validate(contentKeyParamSchema, 'params'),
  validate(updateContentSchema, 'body'),
  controller.updateContent
);

module.exports = router;
