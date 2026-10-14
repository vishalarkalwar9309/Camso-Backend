'use strict';

/**
 * src/modules/analytics/analytics.service.js
 *
 * WHAT THIS FILE DOES:
 *   Business logic service for administrative content analytics.
 *   Aggregates document download statistics and VOC feedback summaries.
 *
 * OVERALL DESIGN:
 *   Coordinates analyticsRepository calls and attaches localized document titles.
 *   Enforces fail-safe zeroed responses so that empty tables return clean default values
 *   instead of null or unexpected runtime crashes.
 *
 * ELEMENTS IN THIS FILE:
 *   - getContentAnalytics(query): Calculates total downloads, top documents, and feedback distribution
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing service methods for content analytics.
 *
 * IMPORTED BY:
 *   src/modules/analytics/analytics.controller.js
 */

const analyticsRepository = require('./analytics.repository');
const { getTranslations, attachTranslations } = require('../../core/utils/translate');

const analyticsService = {
  /**
   * getContentAnalytics
   *
   * USE:
   *   Aggregates high-level content performance metrics for the CMS dashboard.
   *
   * HOW IT WORKS:
   *   1. Queries total document downloads and top 5 downloaded documents via analyticsRepository.
   *   2. Resolves localized titles for each top document.
   *   3. Queries VOC feedback distribution metrics (total, average, star histogram, category breakdown).
   *   4. Constructs and returns the consolidated response payload.
   *
   * CONCEPTS:
   *   Parallel async resolution, i18n translation attachment, defensive metric normalization.
   *
   * PLACES IMPORTED AND USED:
   *   src/modules/analytics/analytics.controller.js
   *
   * FINAL OUTPUT:
   *   BEFORE: Raw database queries.
   *   AFTER: Standardized object:
   *     {
   *       total_downloads: number,
   *       top_documents: Array<object>,
   *       feedback_summary: {
   *         total_feedback: number,
   *         avg_rating: number,
   *         rating_breakdown: object,
   *         bucket_counts: object
   *       }
   *     }
   *
   * @param {object} [query={}] - Optional query parameters (e.g. lang)
   * @returns {Promise<object>}
   */
  async getContentAnalytics(query = {}) {
    const lang = query.lang || 'en';

    const [totalDownloads, rawTopDocs, feedbackMetrics] = await Promise.all([
      analyticsRepository.getTotalDocumentDownloads(),
      analyticsRepository.getTopDownloadedDocuments(5),
      analyticsRepository.getFeedbackMetrics(),
    ]);

    // Attach localized titles to top documents
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
      }),
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
  },
};

module.exports = analyticsService;
