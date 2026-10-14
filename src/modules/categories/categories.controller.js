'use strict';

/**
 * categories.controller — HTTP route handlers for public and admin category endpoints.
 */

const categoriesService = require('./categories.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const { parsePagination } = require('../../core/utils/pagination');

// -----------------------------------------------------------------------------
// Public Endpoints
// -----------------------------------------------------------------------------

/**
 * GET /api/v1/categories
 */
const getPublicCategories = asyncHandler(async (req, res) => {
  const tree = await categoriesService.getPublicCategoryTree();
  sendSuccess(res, tree);
});

/**
 * GET /api/v1/categories/:id
 */
const getPublicCategoryDetail = asyncHandler(async (req, res) => {
  const category = await categoriesService.getPublicCategoryDetail(req.params.id);
  sendSuccess(res, category);
});

/**
 * GET /api/v1/categories/:id/products
 */
const getCategoryProducts = asyncHandler(async (req, res) => {
  const { page, pageSize, sort } = parsePagination(req.query);
  const { category, products, total } = await categoriesService.getCategoryProducts(req.params.id, { page, pageSize, sort });
  const totalPages = Math.ceil(total / pageSize);

  sendSuccess(res, { category, products }, 200, { page, pageSize, total, totalPages });
});

/**
 * GET /api/v1/categories/:id/filters
 */
const getCategoryFilters = asyncHandler(async (req, res) => {
  const filters = await categoriesService.getCategoryFilters(req.params.id);
  sendSuccess(res, filters);
});

// -----------------------------------------------------------------------------
// Admin Endpoints
// -----------------------------------------------------------------------------

/**
 * GET /api/v1/admin/categories
 */
const getAdminCategories = asyncHandler(async (req, res) => {
  const { page, pageSize, sort } = parsePagination(req.query);
  const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;

  const { total, items } = await categoriesService.getAdminCategories({ page, pageSize, sort, isActive });
  const totalPages = Math.ceil(total / pageSize);

  sendSuccess(res, items, 200, { page, pageSize, total, totalPages });
});

/**
 * GET /api/v1/admin/categories/:id
 */
const getAdminCategoryDetail = asyncHandler(async (req, res) => {
  const category = await categoriesService.getAdminCategoryDetail(req.params.id);
  sendSuccess(res, category);
});

/**
 * POST /api/v1/admin/categories
 */
const createCategory = asyncHandler(async (req, res) => {
  const newCategory = await categoriesService.createCategory(req.user.id, req.body);
  sendSuccess(res, newCategory, 201);
});

/**
 * PATCH /api/v1/admin/categories/:id
 */
const updateCategory = asyncHandler(async (req, res) => {
  const updatedCategory = await categoriesService.updateCategory(req.user.id, req.params.id, req.body);
  sendSuccess(res, updatedCategory, 200);
});

module.exports = {
  getPublicCategories,
  getPublicCategoryDetail,
  getCategoryProducts,
  getCategoryFilters,
  getAdminCategories,
  getAdminCategoryDetail,
  createCategory,
  updateCategory,
};
