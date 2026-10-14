'use strict';

/**
 * categories.repository — Prisma operations for the categories module.
 *
 * IMPORTANT: Only this file imports Prisma for the categories module.
 */

const prisma = require('../../config/database');

/**
 * Retrieve all active categories for public hierarchy assembly.
 *
 * @returns {Promise<import('@prisma/client').Category[]>}
 */
async function findActiveCategories() {
  return prisma.category.findMany({
    where: { is_active: true },
    orderBy: [
      { sort_order: 'asc' },
      { name: 'asc' },
    ],
  });
}

/**
 * Retrieve paginated categories for administrative CMS (includes inactive).
 *
 * @param {{ page: number, pageSize: number, isActive?: boolean }} params
 * @returns {Promise<{ total: number, items: import('@prisma/client').Category[] }>}
 */
async function findAllCategoriesAdmin({ page = 1, pageSize = 20, isActive } = {}) {
  const where = {};
  if (typeof isActive === 'boolean') {
    where.is_active = isActive;
  }

  const [total, items] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [
        { sort_order: 'asc' },
        { created_at: 'desc' },
      ],
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { children: true },
        },
      },
    }),
  ]);

  return { total, items };
}

/**
 * Find category by primary key `id` or unique `slug`.
 *
 * @param {string} identifier - cuid or slug
 * @param {{ activeOnly?: boolean }} [options]
 * @returns {Promise<import('@prisma/client').Category | null>}
 */
async function findCategoryByIdOrSlug(identifier, { activeOnly = false } = {}) {
  const where = {
    OR: [
      { id: identifier },
      { slug: identifier },
    ],
  };

  if (activeOnly) {
    where.is_active = true;
  }

  return prisma.category.findFirst({
    where,
    include: {
      parent: {
        select: { id: true, name: true, slug: true },
      },
      children: {
        where: activeOnly ? { is_active: true } : undefined,
        orderBy: [
          { sort_order: 'asc' },
          { name: 'asc' },
        ],
      },
    },
  });
}

/**
 * Check if a slug already exists (excluding a specific category id if updating).
 *
 * @param {string} slug
 * @param {string} [excludeId]
 * @returns {Promise<boolean>}
 */
async function isSlugTaken(slug, excludeId = null) {
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (!existing) return false;
  if (excludeId && existing.id === excludeId) return false;
  return true;
}

/**
 * Create a new category record.
 *
 * @param {object} data
 * @returns {Promise<import('@prisma/client').Category>}
 */
async function createCategory(data) {
  return prisma.category.create({ data });
}

/**
 * Update an existing category by ID.
 *
 * @param {string} id
 * @param {object} data
 * @returns {Promise<import('@prisma/client').Category>}
 */
async function updateCategory(id, data) {
  return prisma.category.update({
    where: { id },
    data,
    include: {
      parent: { select: { id: true, name: true, slug: true } },
    },
  });
}

/**
 * Find products belonging to a category (with pagination).
 * Gracefully queries prisma.product if available.
 *
 * @param {string} categoryId
 * @param {{ page: number, pageSize: number }} pagination
 * @returns {Promise<{ total: number, items: any[] }>}
 */
async function findCategoryProducts(categoryId, { page = 1, pageSize = 20 } = {}) {
  if (prisma.product && typeof prisma.product.findMany === 'function') {
    const where = { category_id: categoryId, is_active: true };
    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return { total, items };
  }
  return { total: 0, items: [] };
}

/**
 * Find filterable specifications available for a category.
 *
 * @param {string} categoryId
 * @returns {Promise<any[]>}
 */
async function findCategoryFilters(categoryId) {
  if (prisma.productSpecification && typeof prisma.productSpecification.findMany === 'function') {
    return prisma.productSpecification.findMany({
      where: {
        product: { category_id: categoryId, is_active: true },
        is_filterable: true,
      },
      distinct: ['spec_key', 'spec_value'],
      orderBy: { sort_order: 'asc' },
    });
  }
  return [];
}

module.exports = {
  findActiveCategories,
  findAllCategoriesAdmin,
  findCategoryByIdOrSlug,
  isSlugTaken,
  createCategory,
  updateCategory,
  findCategoryProducts,
  findCategoryFilters,
};
