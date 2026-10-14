'use strict';

/**
 * products.controller — HTTP route handlers for public and admin product endpoints.
 */

const productsService = require('./products.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const { parsePagination } = require('../../core/utils/pagination');

// -----------------------------------------------------------------------------
// Public Endpoints
// -----------------------------------------------------------------------------

/**
 * GET /api/v1/products
 */
const getPublicProducts = asyncHandler(async (req, res) => {
  const { page, pageSize, sort } = parsePagination(req.query);
  const query = { ...req.query, page, pageSize, sort };

  const { items, total } = await productsService.getPublicProducts(query);
  const totalPages = Math.ceil(total / pageSize);

  sendSuccess(res, items, 200, { page, pageSize, total, totalPages });
});

/**
 * GET /api/v1/products/:idOrSlug
 */
const getPublicProductDetail = asyncHandler(async (req, res) => {
  const identifier = req.params.idOrSlug || req.params.id;
  const product = await productsService.getPublicProductDetail(identifier);
  sendSuccess(res, product);
});

// -----------------------------------------------------------------------------
// Admin Endpoints
// -----------------------------------------------------------------------------

/**
 * GET /api/v1/admin/products
 */
const getAdminProducts = asyncHandler(async (req, res) => {
  const { page, pageSize, sort } = parsePagination(req.query);
  const query = { ...req.query, page, pageSize, sort };

  const { items, total } = await productsService.getAdminProducts(query);
  const totalPages = Math.ceil(total / pageSize);

  sendSuccess(res, items, 200, { page, pageSize, total, totalPages });
});

/**
 * GET /api/v1/admin/products/:id
 */
const getAdminProductDetail = asyncHandler(async (req, res) => {
  const product = await productsService.getAdminProductDetail(req.params.id);
  sendSuccess(res, product);
});

/**
 * POST /api/v1/admin/products
 */
const createProduct = asyncHandler(async (req, res) => {
  const product = await productsService.createProduct(req.user.id, req.body);
  sendSuccess(res, product, 201);
});

/**
 * PATCH /api/v1/admin/products/:id
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await productsService.updateProduct(req.user.id, req.params.id, req.body);
  sendSuccess(res, product, 200);
});

/**
 * POST /api/v1/admin/products/:id/images
 */
const attachImage = asyncHandler(async (req, res) => {
  const image = await productsService.attachProductImage(req.user.id, req.params.id, req.body);
  sendSuccess(res, image, 201);
});

module.exports = {
  getPublicProducts,
  getPublicProductDetail,
  getAdminProducts,
  getAdminProductDetail,
  createProduct,
  updateProduct,
  attachImage,
};
