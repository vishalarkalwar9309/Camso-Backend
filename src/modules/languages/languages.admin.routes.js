'use strict';

/**
 * languages.admin.routes — Administrative CMS endpoints for languages.
 *
 * Mounted at /api/v1/admin/languages.
 */

const { Router } = require('express');
const adminGuard = require('../../core/middleware/adminGuard');
const requireRole = require('../../core/middleware/requireRole');
const controller = require('./languages.controller');
const {
  validate,
  createLanguageSchema,
  updateLanguageSchema,
  languageCodeParamSchema,
} = require('./languages.validation');

const router = Router();

router.use(adminGuard);

// GET /api/v1/admin/languages — list all languages (including inactive)
router.get('/', requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'), controller.getAdminLanguages);

// POST /api/v1/admin/languages — create new language with audit logging
router.post(
  '/',
  requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'),
  validate(createLanguageSchema, 'body'),
  controller.createLanguage
);

// PATCH /api/v1/admin/languages/:code — update language / toggle active status
router.patch(
  '/:code',
  requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'),
  validate(languageCodeParamSchema, 'params'),
  validate(updateLanguageSchema, 'body'),
  controller.updateLanguage
);

module.exports = router;
