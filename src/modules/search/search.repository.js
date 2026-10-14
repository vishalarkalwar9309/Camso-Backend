'use strict';

/**
 * search.repository — Data access layer for product search, query logging, and popular searches.
 *
 * Implements PostgreSQL 6-tier search ranking:
 * 1. Exact PID
 * 2. Exact product name
 * 3. Prefix product name
 * 4. Category match
 * 5. Specification match
 * 6. Partial product-name or description match
 */

const prisma = require('../../config/database');
const { Prisma } = require('@prisma/client');

/**
 * Execute 6-tier ranked product search in PostgreSQL.
 *
 * @param {{
 *   query?: string,
 *   categoryId?: string,
 *   specFilters?: Array<{ key: string, value: string }>,
 *   page?: number,
 *   pageSize?: number
 * }} params
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function searchRankedProducts({
  query = '',
  categoryId = null,
  specFilters = [],
  page = 1,
  pageSize = 20,
}) {
  const normalizedQuery = (query || '').trim();
  const offset = (page - 1) * pageSize;

  // Build SQL conditions safely using Prisma.sql fragments
  const conditions = [Prisma.sql`p.is_active = true`];

  if (categoryId) {
    conditions.push(
      Prisma.sql`(c.id = ${categoryId} OR c.slug = ${categoryId.toLowerCase()})`
    );
  }

  if (Array.isArray(specFilters) && specFilters.length > 0) {
    for (const sf of specFilters) {
      const specKey = sf.key.toLowerCase();
      const specVal = `%${sf.value.toLowerCase()}%`;
      conditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM product_specifications ps
          WHERE ps.product_id = p.id
            AND LOWER(ps.spec_key) = ${specKey}
            AND LOWER(ps.spec_value) LIKE ${specVal}
        )`
      );
    }
  }

  let rankSelectSql;
  let orderSql;

  if (normalizedQuery) {
    const queryExact = normalizedQuery;
    const queryPrefix = `${normalizedQuery.toLowerCase()}%`;
    const queryLike = `%${normalizedQuery.toLowerCase()}%`;

    rankSelectSql = Prisma.sql`,
      CASE
        WHEN UPPER(p.pid) = UPPER(${queryExact}) THEN 1
        WHEN LOWER(p.name) = LOWER(${queryExact}) THEN 2
        WHEN LOWER(p.name) LIKE ${queryPrefix} THEN 3
        WHEN LOWER(c.name) LIKE ${queryLike} OR LOWER(c.slug) LIKE ${queryLike} THEN 4
        WHEN EXISTS (
          SELECT 1 FROM product_specifications ps
          WHERE ps.product_id = p.id
            AND (LOWER(ps.spec_value) LIKE ${queryLike} OR LOWER(ps.spec_key) LIKE ${queryLike})
        ) THEN 5
        WHEN LOWER(p.name) LIKE ${queryLike} OR (p.description IS NOT NULL AND LOWER(p.description) LIKE ${queryLike}) THEN 6
        ELSE 7
      END AS rank_tier
    `;

    // Only include products matching one of the 6 tiers
    conditions.push(Prisma.sql`(
      UPPER(p.pid) = UPPER(${queryExact})
      OR LOWER(p.name) LIKE ${queryLike}
      OR LOWER(c.name) LIKE ${queryLike}
      OR LOWER(c.slug) LIKE ${queryLike}
      OR (p.description IS NOT NULL AND LOWER(p.description) LIKE ${queryLike})
      OR EXISTS (
        SELECT 1 FROM product_specifications ps
        WHERE ps.product_id = p.id
          AND (LOWER(ps.spec_value) LIKE ${queryLike} OR LOWER(ps.spec_key) LIKE ${queryLike})
      )
    )`);

    orderSql = Prisma.sql`ORDER BY rank_tier ASC, p.name ASC, p.id ASC`;
  } else {
    rankSelectSql = Prisma.sql`, 1 AS rank_tier`;
    orderSql = Prisma.sql`ORDER BY p.name ASC, p.id ASC`;
  }

  const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

  // 1. Get total count
  const countResult = await prisma.$queryRaw(
    Prisma.sql`
      SELECT COUNT(DISTINCT p.id)::int as total
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ${whereSql}
    `
  );
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { items: [], total: 0 };
  }

  // 2. Fetch ranked product IDs with pagination
  const rankedRows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT p.id ${rankSelectSql}
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ${whereSql}
      ${orderSql}
      LIMIT ${pageSize} OFFSET ${offset}
    `
  );

  const matchingIds = rankedRows.map((r) => r.id);

  // 3. Hydrate full product relations (category, images, specifications)
  const products = await prisma.product.findMany({
    where: { id: { in: matchingIds } },
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

  // Preserve the exact PostgreSQL ranking tier order
  const productMap = new Map(products.map((p) => [p.id, p]));
  const rankTierMap = new Map(rankedRows.map((r) => [r.id, r.rank_tier]));

  const items = matchingIds
    .map((id) => {
      const prod = productMap.get(id);
      if (!prod) return null;
      return {
        ...prod,
        rank_tier: rankTierMap.get(id) ?? null,
      };
    })
    .filter(Boolean);

  return { items, total };
}

/**
 * Log a search query execution to search_logs.
 *
 * @param {{
 *   userId?: string | null,
 *   deviceId?: string | null,
 *   queryText: string,
 *   filters?: object | null,
 *   resultsCount: number
 * }} params
 * @returns {Promise<import('@prisma/client').SearchLog>}
 */
async function logSearch({ userId = null, deviceId = null, queryText, filters = null, resultsCount = 0 }) {
  return prisma.searchLog.create({
    data: {
      user_id:       userId || null,
      device_id:     deviceId || null,
      query_text:    queryText,
      filters:       filters || undefined,
      results_count: resultsCount,
    },
  });
}

/**
 * Atomically increment hit_count for popular search terms.
 *
 * Uses PostgreSQL ON CONFLICT for concurrency safety.
 *
 * @param {string} queryText
 * @returns {Promise<void>}
 */
async function incrementPopularSearch(queryText) {
  const normalized = queryText.trim().toLowerCase();
  if (!normalized) return;

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO popular_searches (query_text, hit_count, last_updated)
      VALUES (${normalized}, 1, NOW())
      ON CONFLICT (query_text)
      DO UPDATE SET hit_count = popular_searches.hit_count + 1, last_updated = NOW();
    `
  );
}

/**
 * Retrieve recent search queries for a specific user.
 *
 * Scoped strictly to authenticated user_id; de-duplicated with latest search timestamp.
 *
 * @param {string} userId
 * @param {number} [limit=10]
 * @returns {Promise<Array<{ query_text: string, last_searched_at: Date, results_count: number }>>}
 */
async function findRecentSearches(userId, limit = 10) {
  return prisma.$queryRaw(
    Prisma.sql`
      SELECT 
        query_text, 
        MAX(created_at) as last_searched_at, 
        MAX(results_count)::int as results_count
      FROM search_logs
      WHERE user_id = ${userId}
      GROUP BY query_text
      ORDER BY last_searched_at DESC
      LIMIT ${limit}
    `
  );
}

/**
 * Retrieve top popular search queries aggregated across all users.
 *
 * @param {number} [limit=10]
 * @returns {Promise<Array<{ query_text: string, hit_count: number, last_updated: Date }>>}
 */
async function findPopularSearches(limit = 10) {
  return prisma.popularSearch.findMany({
    orderBy: [
      { hit_count: 'desc' },
      { last_updated: 'desc' },
    ],
    take: limit,
  });
}

module.exports = {
  searchRankedProducts,
  logSearch,
  incrementPopularSearch,
  findRecentSearches,
  findPopularSearches,
};
