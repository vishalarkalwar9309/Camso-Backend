'use strict';

/**
 * products.routes — Public product catalogue endpoints.
 *
 * Mounted at /api/v1/products in src/routes/index.js.
 * No authentication required for public product browsing.
 */

const { Router } = require('express');
const controller = require('./products.controller');
const {
  validate,
  listProductsQuerySchema,
  productIdParamSchema,
} = require('./products.validation');

const router = Router();

// GET /api/v1/products — public product listing with specification filtering
router.get('/', validate(listProductsQuerySchema, 'query', true), controller.getPublicProducts);

// GET /api/v1/products/:idOrSlug — public product detail with specs and images
router.get('/:idOrSlug', validate(productIdParamSchema, 'params'), controller.getPublicProductDetail);

module.exports = router;
