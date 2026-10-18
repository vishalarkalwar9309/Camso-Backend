'use strict';

/**
 * products.repository — Prisma operations for the products module.
 *
 * IMPORTANT: Only this file imports Prisma for the products module.
 */

const prisma = require('../../config/database');

/**
 * Find paginated products supporting multi-attribute specification filters.
 *
 * @param {{
 *   categoryId?: string,
 *   q?: string,
 *   specFilters?: Array<{ key: string, value: string }>,
 *   page?: number,
 *   pageSize?: number,
 *   sort?: string,
 *   activeOnly?: boolean
 * }} params
 * @returns {Promise<{ total: number, items: import('@prisma/client').Product[] }>}
 */
async function findProducts({
  categoryId,
  q,
  specFilters = [],
  page = 1,
  pageSize = 20,
  sort = 'newest',
  activeOnly = true,
  is_new,
  is_featured,
} = {}) {
  const where = {};

  if (activeOnly) {
    where.is_active = true;
  }

  if (categoryId && categoryId.trim() && categoryId.trim().toLowerCase() !== 'all') {
    where.category = {
      OR: [
        { id: categoryId.trim() },
        { slug: categoryId.trim() },
      ],
    };
  }

  if (is_featured !== undefined) {
    where.is_featured = Boolean(is_featured === true || is_featured === 'true');
  }

  if (is_new !== undefined && (is_new === true || is_new === 'true')) {
    where.is_featured = false;
    where.OR = [
      { pid: 'CTL400-400X86X52' },
      { launch_date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    ];
  }

  if (q && q.trim()) {
    const query = q.trim();
    where.OR = [
      { pid: { contains: query, mode: 'insensitive' } },
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (specFilters.length > 0) {
    where.AND = specFilters.map((f) => ({
      specifications: {
        some: {
          spec_key: { equals: f.key, mode: 'insensitive' },
          spec_value: { equals: f.value, mode: 'insensitive' },
        },
      },
    }));
  }

  let orderBy = [{ created_at: 'desc' }];
  if (sort === 'name_asc') orderBy = [{ name: 'asc' }];
  else if (sort === 'name_desc') orderBy = [{ name: 'desc' }];
  else if (sort === 'oldest') orderBy = [{ created_at: 'asc' }];
  else if (sort === 'pid_asc') orderBy = [{ pid: 'asc' }];

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: [
            { is_primary: 'desc' },
            { sort_order: 'asc' },
          ],
        },
        specifications: {
          orderBy: [{ sort_order: 'asc' }],
        },
      },
    }),
  ]);

  return { total, items };
}

/**
 * Find single product by primary key `id`, `slug`, or `pid`.
 *
 * @param {string} identifier
 * @param {{ activeOnly?: boolean }} [options]
 * @returns {Promise<import('@prisma/client').Product | null>}
 */
async function findProductByIdOrSlug(identifier, { activeOnly = false } = {}) {
  const where = {
    OR: [
      { id: identifier },
      { slug: identifier },
      { pid: identifier },
    ],
  };

  if (activeOnly) {
    where.is_active = true;
  }

  return prisma.product.findFirst({
    where,
    include: {
      category: {
        select: { id: true, name: true, slug: true, parent_id: true },
      },
      images: {
        orderBy: [
          { is_primary: 'desc' },
          { sort_order: 'asc' },
        ],
      },
      specifications: {
        orderBy: [
          { spec_type: 'asc' },
          { sort_order: 'asc' },
        ],
      },
    },
  });
}

/**
 * Check if a PID already exists.
 *
 * @param {string} pid
 * @param {string} [excludeId]
 * @returns {Promise<boolean>}
 */
async function isPidTaken(pid, excludeId = null) {
  const existing = await prisma.product.findUnique({ where: { pid } });
  if (!existing) return false;
  if (excludeId && existing.id === excludeId) return false;
  return true;
}

/**
 * Check if a slug already exists.
 *
 * @param {string} slug
 * @param {string} [excludeId]
 * @returns {Promise<boolean>}
 */
async function isSlugTaken(slug, excludeId = null) {
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (!existing) return false;
  if (excludeId && existing.id === excludeId) return false;
  return true;
}

/**
 * Create a new product with optional initial specifications.
 *
 * @param {object} productData
 * @param {Array<object>} [specifications]
 * @returns {Promise<import('@prisma/client').Product>}
 */
async function createProduct(productData, specifications = []) {
  return prisma.product.create({
    data: {
      ...productData,
      specifications: specifications.length > 0 ? { create: specifications } : undefined,
    },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
      specifications: true,
      images: true,
    },
  });
}

/**
 * Update an existing product.
 *
 * @param {string} id
 * @param {object} data
 * @returns {Promise<import('@prisma/client').Product>}
 */
async function updateProduct(id, data) {
  return prisma.product.update({
    where: { id },
    data,
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
      images: true,
      specifications: true,
    },
  });
}

/**
 * Attach an image to a product.
 *
 * If `is_primary` is true, clears primary flag on other images for this product.
 *
 * @param {string} productId
 * @param {{ url: string, media_asset_id?: string | null, sort_order?: number, is_primary?: boolean }} data
 * @returns {Promise<import('@prisma/client').ProductImage>}
 */
async function attachProductImage(productId, { url, media_asset_id = null, sort_order = 0, is_primary = false }) {
  if (is_primary) {
    await prisma.productImage.updateMany({
      where: { product_id: productId, is_primary: true },
      data: { is_primary: false },
    });
  }

  return prisma.productImage.create({
    data: {
      product_id: productId,
      url,
      media_asset_id,
      sort_order,
      is_primary,
    },
  });
}

module.exports = {
  findProducts,
  findProductByIdOrSlug,
  isPidTaken,
  isSlugTaken,
  createProduct,
  updateProduct,
  attachProductImage,
};
