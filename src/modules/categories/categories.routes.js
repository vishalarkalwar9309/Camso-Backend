'use strict';

/**
 * categories.routes — Public category browsing endpoints.
 *
 * Mounted at /api/v1/categories in src/routes/index.js.
 * No authentication required for public browse.
 */

const { Router } = require('express');
const controller = require('./categories.controller');
const {
  validate,
  categoryIdParamSchema,
  categoryProductsQuerySchema,
} = require('./categories.validation');

const router = Router();

// GET /api/v1/categories — public hierarchy tree (active only)
router.get('/', controller.getPublicCategories);

// GET /api/v1/categories/:id — public category detail + child categories
router.get('/:id', validate(categoryIdParamSchema, 'params'), controller.getPublicCategoryDetail);

// GET /api/v1/categories/:id/products — products under category (paginated)
router.get(
  '/:id/products',
  validate(categoryIdParamSchema, 'params'),
  validate(categoryProductsQuerySchema, 'query'),
  controller.getCategoryProducts
);

// GET /api/v1/categories/:id/filters — available filterable specification attributes
router.get('/:id/filters', validate(categoryIdParamSchema, 'params'), controller.getCategoryFilters);

module.exports = router;
