'use strict';

/**
 * products.service — Business logic for product catalogue, specification filtering, and admin CRUD.
 */

const repo = require('./products.repository');
const categoriesRepo = require('../categories/categories.repository');
const ApiError = require('../../core/utils/ApiError');
const auditService = require('../../core/services/auditService');

/**
 * Helper to generate slug.
 *
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract specification filters from query object (e.g. spec_width=300mm -> { key: 'width', value: '300mm' }).
 *
 * @param {object} query
 * @returns {Array<{ key: string, value: string }>}
 */
function extractSpecFilters(query) {
  const specFilters = [];

  Object.keys(query).forEach((paramKey) => {
    if (paramKey.startsWith('spec_') && paramKey.length > 5) {
      const rawKey = paramKey.slice(5).trim();
      const val = query[paramKey];
      if (val !== undefined && val !== null && val !== '') {
        specFilters.push({
          key: rawKey.replace(/_/g, ' '),
          value: String(val).trim(),
        });
      }
    }
  });

  return specFilters;
}

/**
 * GET /api/v1/products — public product listing with multi-attribute filtering.
 *
 * @param {object} query
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function getPublicProducts(query) {
  const { category, q, page = 1, pageSize = 20, sort = 'newest' } = query;
  const specFilters = extractSpecFilters(query);

  return repo.findProducts({
    categoryId: category,
    q,
    specFilters,
    page: Number(page),
    pageSize: Number(pageSize),
    sort,
    activeOnly: true,
  });
}

/**
 * GET /api/v1/products/:idOrSlug — public product detail.
 *
 * @param {string} identifier
 * @returns {Promise<object>}
 */
async function getPublicProductDetail(identifier) {
  const product = await repo.findProductByIdOrSlug(identifier, { activeOnly: true });
  if (!product) {
    throw ApiError.notFound('Product not found.');
  }
  return product;
}

/**
 * GET /api/v1/admin/products — Admin product list (includes inactive).
 *
 * @param {object} query
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function getAdminProducts(query) {
  const { category, q, page = 1, pageSize = 20, sort = 'newest', is_active } = query;
  const activeOnly = is_active !== undefined ? is_active === 'true' || is_active === true : false;

  return repo.findProducts({
    categoryId: category,
    q,
    page: Number(page),
    pageSize: Number(pageSize),
    sort,
    activeOnly,
  });
}

/**
 * GET /api/v1/admin/products/:id — Admin product detail view.
 *
 * @param {string} identifier
 * @returns {Promise<object>}
 */
async function getAdminProductDetail(identifier) {
  const product = await repo.findProductByIdOrSlug(identifier, { activeOnly: false });
  if (!product) {
    throw ApiError.notFound('Product not found.');
  }
  return product;
}

/**
 * POST /api/v1/admin/products — create product with specifications & audit logging.
 *
 * @param {string} adminId
 * @param {object} payload
 * @returns {Promise<object>}
 */
async function createProduct(adminId, payload) {
  const pid = payload.pid.trim().toUpperCase();

  const pidTaken = await repo.isPidTaken(pid);
  if (pidTaken) {
    throw ApiError.badRequest(`Product ID (PID) '${pid}' already exists.`);
  }

  // Verify category exists
  const category = await categoriesRepo.findCategoryByIdOrSlug(payload.category_id);
  if (!category) {
    throw ApiError.badRequest('Specified category does not exist.');
  }

  const finalSlug = payload.slug ? slugify(payload.slug) : slugify(`${payload.name}-${pid}`);
  const slugTaken = await repo.isSlugTaken(finalSlug);
  if (slugTaken) {
    throw ApiError.badRequest(`Product slug '${finalSlug}' already exists.`);
  }

  const productData = {
    pid,
    category_id: category.id,
    name:        payload.name.trim(),
    slug:        finalSlug,
    description: payload.description || null,
    is_active:   payload.is_active ?? true,
  };

  const specifications = Array.isArray(payload.specifications) ? payload.specifications : [];

  const created = await repo.createProduct(productData, specifications);

  await auditService.record({
    actorId: adminId,
    action: 'CREATE',
    entityType: 'PRODUCT',
    entityId: created.id,
    before: null,
    after: created,
  });

  return created;
}

/**
 * PATCH /api/v1/admin/products/:id — update product with audit logging.
 *
 * @param {string} adminId
 * @param {string} id
 * @param {object} payload
 * @returns {Promise<object>}
 */
async function updateProduct(adminId, id, payload) {
  const existing = await repo.findProductByIdOrSlug(id);
  if (!existing) {
    throw ApiError.notFound('Product not found.');
  }

  const updateData = { ...payload };

  if (payload.category_id) {
    const category = await categoriesRepo.findCategoryByIdOrSlug(payload.category_id);
    if (!category) {
      throw ApiError.badRequest('Specified category does not exist.');
    }
    updateData.category_id = category.id;
  }

  if (payload.slug) {
    const finalSlug = slugify(payload.slug);
    const slugTaken = await repo.isSlugTaken(finalSlug, existing.id);
    if (slugTaken) {
      throw ApiError.badRequest(`Product slug '${finalSlug}' already exists.`);
    }
    updateData.slug = finalSlug;
  }

  const updated = await repo.updateProduct(existing.id, updateData);

  await auditService.record({
    actorId: adminId,
    action: 'UPDATE',
    entityType: 'PRODUCT',
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}

/**
 * POST /api/v1/admin/products/:id/images — attach image asset to product with audit logging.
 *
 * @param {string} adminId
 * @param {string} productId
 * @param {object} imageData
 * @returns {Promise<object>}
 */
async function attachProductImage(adminId, productId, imageData) {
  const existing = await repo.findProductByIdOrSlug(productId);
  if (!existing) {
    throw ApiError.notFound('Product not found.');
  }

  const image = await repo.attachProductImage(existing.id, imageData);

  await auditService.record({
    actorId: adminId,
    action: 'CREATE',
    entityType: 'PRODUCT_IMAGE',
    entityId: image.id,
    before: null,
    after: image,
  });

  return image;
}

module.exports = {
  extractSpecFilters,
  getPublicProducts,
  getPublicProductDetail,
  getAdminProducts,
  getAdminProductDetail,
  createProduct,
  updateProduct,
  attachProductImage,
};
