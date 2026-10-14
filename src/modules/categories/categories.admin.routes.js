'use strict';

/**
 * categories.admin.routes — Administrative CMS category management endpoints.
 *
 * Mounted at /api/v1/admin/categories in src/routes/index.js.
 * Requires admin authentication and appropriate role permissions.
 */

const { Router } = require('express');
const adminGuard = require('../../core/middleware/adminGuard');
const requireRole = require('../../core/middleware/requireRole');
const controller = require('./categories.controller');
const {
  validate,
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} = require('./categories.validation');

const router = Router();

// Protect all admin category routes
router.use(adminGuard);

// GET /api/v1/admin/categories — list all categories (including inactive)
router.get('/', requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'), controller.getAdminCategories);

// GET /api/v1/admin/categories/:id — category detail for Admin CMS
router.get(
  '/:id',
  requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'),
  validate(categoryIdParamSchema, 'params'),
  controller.getAdminCategoryDetail
);

// POST /api/v1/admin/categories — create category with audit logging
router.post(
  '/',
  requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'),
  validate(createCategorySchema, 'body'),
  controller.createCategory
);

// PATCH /api/v1/admin/categories/:id — update category / toggle active status
router.patch(
  '/:id',
  requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'),
  validate(categoryIdParamSchema, 'params'),
  validate(updateCategorySchema, 'body'),
  controller.updateCategory
);

module.exports = router;
