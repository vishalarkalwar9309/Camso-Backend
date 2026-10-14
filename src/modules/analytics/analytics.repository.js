'use strict';

/**
 * src/modules/analytics/analytics.repository.js
 *
 * Repository for Catalogue and Content analytics.
 */

const { prisma } = require('../../config/database');

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

/**
 * Sums the download_count across all documents.
 */
async function getTotalDocumentDownloads(prismaClient = prisma) {
  const aggregate = await prismaClient.document.aggregate({
    _sum: {
      download_count: true,
    },
  });
  return aggregate._sum.download_count || 0;
}

/**
 * Retrieves top documents ranked by highest download count.
 */
async function getTopDownloadedDocuments(limit = 5, prismaClient = prisma) {
  return prismaClient.document.findMany({
    take: limit,
    orderBy: {
      download_count: 'desc',
    },
    select: {
      id: true,
      document_type: true,
      is_published: true,
      download_count: true,
      created_at: true,
    },
  });
}

/**
 * Calculates statistical summary of Voice-of-Customer feedback.
 */
async function getFeedbackMetrics(prismaClient = prisma) {
  const [overall, ratingGroups, bucketGroups] = await Promise.all([
    prismaClient.feedback.aggregate({
      _count: { id: true },
      _avg: { rating: true },
    }),
    prismaClient.feedback.groupBy({
      by: ['rating'],
      _count: { id: true },
    }),
    prismaClient.feedback.groupBy({
      by: ['bucket'],
      _count: { id: true },
    }),
  ]);

  const ratingBreakdown = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const group of ratingGroups) {
    if (ratingBreakdown.hasOwnProperty(String(group.rating))) {
      ratingBreakdown[String(group.rating)] = group._count.id;
    }
  }

  const bucketCounts = { PRODUCT: 0, SERVICE: 0, PRICING: 0 };
  for (const group of bucketGroups) {
    if (bucketCounts.hasOwnProperty(group.bucket)) {
      bucketCounts[group.bucket] = group._count.id;
    }
  }

  const totalFeedback = overall._count.id || 0;
  const rawAvg = overall._avg.rating || 0;
  const avgRating = totalFeedback > 0 ? Number(rawAvg.toFixed(2)) : 0;

  return {
    total_feedback: totalFeedback,
    average_rating: avgRating,
    rating_breakdown: ratingBreakdown,
    bucket_counts: bucketCounts,
  };
}

const analyticsRepository = {
  getCatalogueSummary,
  getTopSearches,
  getMostBookmarkedProducts,
  getTotalDocumentDownloads,
  getTopDownloadedDocuments,
  getFeedbackMetrics,
};

module.exports = analyticsRepository;
