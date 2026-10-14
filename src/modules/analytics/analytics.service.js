'use strict';

const repo = require('./analytics.repository');
const { getTranslations, attachTranslations } = require('../../core/utils/translate');

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

/**
 * Get content analytics including document downloads and feedback summary.
 */
async function getContentAnalytics(query = {}) {
  const lang = query.lang || 'en';

  const [totalDownloads, rawTopDocs, feedbackMetrics] = await Promise.all([
    repo.getTotalDocumentDownloads(),
    repo.getTopDownloadedDocuments(5),
    repo.getFeedbackMetrics(),
  ]);

  const topDocuments = await Promise.all(
    rawTopDocs.map(async (doc) => {
      const translations = await getTranslations('DOCUMENT', doc.id);
      const localized = attachTranslations(doc, translations, lang);
      return {
        id: localized.id,
        title: localized.title || 'Untitled Document',
        document_type: localized.document_type,
        download_count: localized.download_count || 0,
        is_published: localized.is_published,
      };
    })
  );

  return {
    total_downloads: totalDownloads,
    top_documents: topDocuments,
    feedback_summary: {
      total_feedback: feedbackMetrics.total_feedback,
      avg_rating: feedbackMetrics.average_rating,
      rating_breakdown: feedbackMetrics.rating_breakdown,
      bucket_counts: feedbackMetrics.bucket_counts,
    },
  };
}

const analyticsService = {
  getCatalogueAnalytics,
  getContentAnalytics,
};

module.exports = analyticsService;
