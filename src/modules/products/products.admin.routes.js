'use strict';

/**
 * products.admin.routes — Administrative CMS product management endpoints.
 *
 * Mounted at /api/v1/admin/products in src/routes/index.js.
 * Requires admin authentication and appropriate role permissions.
 */

const { Router } = require('express');
const adminGuard = require('../../core/middleware/adminGuard');
const requireRole = require('../../core/middleware/requireRole');
const controller = require('./products.controller');
const {
  validate,
  createProductSchema,
  updateProductSchema,
  attachImageSchema,
  productIdParamSchema,
} = require('./products.validation');

const router = Router();

// Protect all admin product routes
router.use(adminGuard);

// GET /api/v1/admin/products — list all products (including inactive)
router.get('/', requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'), controller.getAdminProducts);

// GET /api/v1/admin/products/:id — product detail for Admin CMS
router.get(
  '/:id',
  requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'),
  validate(productIdParamSchema, 'params'),
  controller.getAdminProductDetail
);

// POST /api/v1/admin/products — create product with specifications & audit logging
router.post(
  '/',
  requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'),
  validate(createProductSchema, 'body'),
  controller.createProduct
);

// PATCH /api/v1/admin/products/:id — update product / toggle active status
router.patch(
  '/:id',
  requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'),
  validate(productIdParamSchema, 'params'),
  validate(updateProductSchema, 'body'),
  controller.updateProduct
);

// POST /api/v1/admin/products/:id/images — attach image asset to product
router.post(
  '/:id/images',
  requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'),
  validate(productIdParamSchema, 'params'),
  validate(attachImageSchema, 'body'),
  controller.attachImage
);

module.exports = router;
