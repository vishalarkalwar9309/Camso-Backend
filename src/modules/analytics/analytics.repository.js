'use strict';

/**
 * src/modules/analytics/analytics.repository.js
 *
 * WHAT THIS FILE DOES:
 *   Database access layer for content analytics metrics. Queries PostgreSQL via Prisma
 *   for document download aggregates and customer VOC feedback rating distributions.
 *
 * OVERALL DESIGN:
 *   Follows the 5-tier architecture (Repositories are the ONLY layer that calls Prisma).
 *   Aggregates document download metrics and calculates customer feedback rating distributions.
 *   Provides safe fallback calculations to prevent null crashes on empty tables.
 *
 * ELEMENTS IN THIS FILE:
 *   - getTotalDocumentDownloads(prismaClient): Aggregates total downloads across all documents
 *   - getTopDownloadedDocuments(limit, prismaClient): Retrieves highest-downloaded documents
 *   - getFeedbackMetrics(prismaClient): Aggregates total feedback, average rating, rating buckets, and category buckets
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing database query methods for content analytics.
 *
 * IMPORTED BY:
 *   src/modules/analytics/analytics.service.js
 */

const { prisma } = require('../../config/database');

const analyticsRepository = {
  /**
   * getTotalDocumentDownloads
   *
   * USE:
   *   Sums the download_count across all documents in the database.
   *
   * HOW IT WORKS:
   *   1. Invokes prismaClient.document.aggregate with _sum on download_count.
   *   2. Coerces null sum to 0 for empty database states.
   *
   * CONCEPTS:
   *   Prisma aggregation, null coalescing.
   *
   * PLACES IMPORTED AND USED:
   *   src/modules/analytics/analytics.service.js
   *
   * FINAL OUTPUT:
   *   BEFORE: Raw database table.
   *   AFTER: Integer total download count (>= 0).
   *
   * @param {object} [prismaClient=prisma] - Prisma client instance
   * @returns {Promise<number>}
   */
  async getTotalDocumentDownloads(prismaClient = prisma) {
    const aggregate = await prismaClient.document.aggregate({
      _sum: {
        download_count: true,
      },
    });
    return aggregate._sum.download_count || 0;
  },

  /**
   * getTopDownloadedDocuments
   *
   * USE:
   *   Retrieves the top documents ranked by highest download count.
   *
   * HOW IT WORKS:
   *   1. Queries prismaClient.document.findMany ordered by download_count desc.
   *   2. Limits results to the requested limit (defaults to 5).
   *   3. Selects id, document_type, is_published, and download_count.
   *
   * CONCEPTS:
   *   Prisma ordered findMany with projection.
   *
   * PLACES IMPORTED AND USED:
   *   src/modules/analytics/analytics.service.js
   *
   * FINAL OUTPUT:
   *   BEFORE: Unordered document records.
   *   AFTER: Array of top downloaded document summary objects.
   *
   * @param {number} [limit=5] - Number of top documents to fetch
   * @param {object} [prismaClient=prisma] - Prisma client instance
   * @returns {Promise<Array<object>>}
   */
  async getTopDownloadedDocuments(limit = 5, prismaClient = prisma) {
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
  },

  /**
   * getFeedbackMetrics
   *
   * USE:
   *   Calculates statistical summary of Voice-of-Customer feedback.
   *
   * HOW IT WORKS:
   *   1. Runs aggregate query for total feedback count and average rating.
   *   2. Groups feedback by rating (1-5) and bucket category (PRODUCT, SERVICE, PRICING).
   *   3. Normalizes all buckets to guaranteed non-null counts.
   *
   * CONCEPTS:
   *   Multi-dimension grouping, average aggregation, zero-safe fallback.
   *
   * PLACES IMPORTED AND USED:
   *   src/modules/analytics/analytics.service.js
   *
   * FINAL OUTPUT:
   *   BEFORE: Raw individual feedback rows.
   *   AFTER: Consolidated metrics object { total_feedback, average_rating, rating_breakdown, bucket_counts }.
   *
   * @param {object} [prismaClient=prisma] - Prisma client instance
   * @returns {Promise<object>}
   */
  async getFeedbackMetrics(prismaClient = prisma) {
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
  },
};

module.exports = analyticsRepository;
