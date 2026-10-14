'use strict';

const prisma = require('../../config/database');

/**
 * Get catalogue summary counts.
 */
async function getCatalogueSummary() {
  const [totalProducts, totalCategories, totalBookmarks, totalSearchesLogged] = await Promise.all([
    prisma.product.count({ where: { is_active: true } }),
    prisma.category.count({ where: { is_active: true } }),
    prisma.bookmark.count(),
    prisma.searchLog.count(),
  ]);

  return {
    total_products: totalProducts,
    total_categories: totalCategories,
    total_bookmarks: totalBookmarks,
    total_searches_logged: totalSearchesLogged,
  };
}

/**
 * Get top search terms from popular_searches.
 */
async function getTopSearches(limit = 10) {
  const safeLimit = Math.min(50, Math.max(1, limit));
  return prisma.popularSearch.findMany({
    take: safeLimit,
    orderBy: { hit_count: 'desc' },
    select: {
      query_text: true,
      hit_count: true,
      last_updated: true,
    },
  });
}

/**
 * Get most bookmarked products with catalogue details.
 */
async function getMostBookmarkedProducts(limit = 10) {
  const safeLimit = Math.min(50, Math.max(1, limit));

  const results = await prisma.$queryRaw`
    SELECT 
      b.product_id,
      p.pid,
      p.name,
      p.slug,
      c.name AS category_name,
      COUNT(b.id)::int AS bookmark_count
    FROM bookmarks b
    JOIN products p ON b.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = true
    GROUP BY b.product_id, p.pid, p.name, p.slug, c.name
    ORDER BY bookmark_count DESC, p.name ASC
    LIMIT ${safeLimit};
  `;

  return results;
}

module.exports = {
  getCatalogueSummary,
  getTopSearches,
  getMostBookmarkedProducts,
};
