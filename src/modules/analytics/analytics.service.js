'use strict';

const repo = require('./analytics.repository');

/**
 * Get catalogue analytics including top searches and most bookmarked products.
 */
async function getCatalogueAnalytics(limit = 10) {
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  const [summary, topSearches, mostBookmarkedProducts] = await Promise.all([
    repo.getCatalogueSummary(),
    repo.getTopSearches(safeLimit),
    repo.getMostBookmarkedProducts(safeLimit),
  ]);

  return {
    summary,
    top_searches: topSearches,
    most_bookmarked_products: mostBookmarkedProducts,
  };
}

module.exports = {
  getCatalogueAnalytics,
};
