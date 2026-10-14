'use strict';

/**
 * categories.service — Business logic for category hierarchy, filtering, and admin CRUD.
 */

const repo = require('./categories.repository');
const ApiError = require('../../core/utils/ApiError');
const auditService = require('../../core/services/auditService');

/**
 * Helper to generate an SEO-friendly slug from a category name.
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
 * Build a nested hierarchy tree from a flat list of categories.
 *
 * @param {object[]} categories
 * @returns {object[]}
 */
function buildCategoryTree(categories) {
  const map = new Map();
  const roots = [];

  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });

  categories.forEach((cat) => {
    const node = map.get(cat.id);
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/**
 * GET /api/v1/categories — public hierarchy tree.
 *
 * @returns {Promise<object[]>}
 */
async function getPublicCategoryTree() {
  const activeCategories = await repo.findActiveCategories();
  return buildCategoryTree(activeCategories);
}

/**
 * GET /api/v1/categories/:id — public category detail with immediate children.
 *
 * @param {string} identifier - cuid or slug
 * @returns {Promise<object>}
 */
async function getPublicCategoryDetail(identifier) {
  const category = await repo.findCategoryByIdOrSlug(identifier, { activeOnly: true });
  if (!category) {
    throw ApiError.notFound('Category not found.');
  }
  return category;
}

/**
 * GET /api/v1/categories/:id/products — paginated products under category.
 *
 * @param {string} identifier
 * @param {{ page: number, pageSize: number }} pagination
 * @returns {Promise<{ category: object, products: object[], total: number }>}
 */
async function getCategoryProducts(identifier, pagination) {
  const category = await repo.findCategoryByIdOrSlug(identifier, { activeOnly: true });
  if (!category) {
    throw ApiError.notFound('Category not found.');
  }

  const { total, items } = await repo.findCategoryProducts(category.id, pagination);
  return { category, products: items, total };
}

/**
 * GET /api/v1/categories/:id/filters — available specification attributes for category.
 *
 * @param {string} identifier
 * @returns {Promise<object>}
 */
async function getCategoryFilters(identifier) {
  const category = await repo.findCategoryByIdOrSlug(identifier, { activeOnly: true });
  if (!category) {
    throw ApiError.notFound('Category not found.');
  }

  const rawFilters = await repo.findCategoryFilters(category.id);

  // Group by spec_key: { spec_key, values: [...] }
  const grouped = new Map();
  rawFilters.forEach((item) => {
    if (!grouped.has(item.spec_key)) {
      grouped.set(item.spec_key, new Set());
    }
    grouped.get(item.spec_key).add(item.spec_value);
  });

  const filters = Array.from(grouped.entries()).map(([key, valueSet]) => ({
    key,
    values: Array.from(valueSet),
  }));

  return {
    category_id: category.id,
    category_name: category.name,
    filters,
  };
}

/**
 * GET /api/v1/admin/categories — list all categories for Admin CMS.
 *
 * @param {{ page?: number, pageSize?: number, isActive?: boolean }} params
 * @returns {Promise<{ total: number, items: object[] }>}
 */
async function getAdminCategories(params) {
  return repo.findAllCategoriesAdmin(params);
}

/**
 * GET /api/v1/admin/categories/:id — Admin category detail.
 *
 * @param {string} identifier
 * @returns {Promise<object>}
 */
async function getAdminCategoryDetail(identifier) {
  const category = await repo.findCategoryByIdOrSlug(identifier, { activeOnly: false });
  if (!category) {
    throw ApiError.notFound('Category not found.');
  }
  return category;
}

/**
 * POST /api/v1/admin/categories — create category with audit logging.
 *
 * @param {string} adminId
 * @param {object} data
 * @returns {Promise<object>}
 */
async function createCategory(adminId, data) {
  const finalSlug = data.slug ? slugify(data.slug) : slugify(data.name);

  const slugTaken = await repo.isSlugTaken(finalSlug);
  if (slugTaken) {
    throw ApiError.badRequest(`Category slug '${finalSlug}' already exists.`);
  }

  if (data.parent_id) {
    const parent = await repo.findCategoryByIdOrSlug(data.parent_id);
    if (!parent) {
      throw ApiError.badRequest('Specified parent category does not exist.');
    }
  }

  const newCategory = await repo.createCategory({
    name:        data.name,
    slug:        finalSlug,
    parent_id:   data.parent_id || null,
    description: data.description || null,
    icon_url:    data.icon_url || null,
    banner_url:  data.banner_url || null,
    sort_order:  data.sort_order ?? 0,
    is_active:   data.is_active ?? true,
  });

  await auditService.record({
    actorId: adminId,
    action: 'CREATE',
    entityType: 'CATEGORY',
    entityId: newCategory.id,
    before: null,
    after: newCategory,
  });

  return newCategory;
}

/**
 * PATCH /api/v1/admin/categories/:id — update category with audit logging.
 *
 * @param {string} adminId
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
async function updateCategory(adminId, id, data) {
  const existing = await repo.findCategoryByIdOrSlug(id);
  if (!existing) {
    throw ApiError.notFound('Category not found.');
  }

  const updatePayload = { ...data };

  if (data.slug) {
    const finalSlug = slugify(data.slug);
    const slugTaken = await repo.isSlugTaken(finalSlug, existing.id);
    if (slugTaken) {
      throw ApiError.badRequest(`Category slug '${finalSlug}' already exists.`);
    }
    updatePayload.slug = finalSlug;
  }

  if (data.parent_id !== undefined) {
    if (data.parent_id === existing.id) {
      throw ApiError.badRequest('A category cannot be its own parent.');
    }
    if (data.parent_id !== null) {
      const parent = await repo.findCategoryByIdOrSlug(data.parent_id);
      if (!parent) {
        throw ApiError.badRequest('Specified parent category does not exist.');
      }
    }
  }

  const updated = await repo.updateCategory(existing.id, updatePayload);

  await auditService.record({
    actorId: adminId,
    action: 'UPDATE',
    entityType: 'CATEGORY',
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}

module.exports = {
  buildCategoryTree,
  getPublicCategoryTree,
  getPublicCategoryDetail,
  getCategoryProducts,
  getCategoryFilters,
  getAdminCategories,
  getAdminCategoryDetail,
  createCategory,
  updateCategory,
};
