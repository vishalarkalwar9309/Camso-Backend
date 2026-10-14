'use strict';

/**
 * src/modules/feedback/feedback.service.js
 *
 * WHAT THIS FILE DOES:
 *   Business logic for handling feedback submissions.
 *
 * OVERALL DESIGN:
 *   Derives identity strictly from the verified JWT principal.
 *   Discards client-provided user_id and device_id.
 *
 * ELEMENTS:
 *   submitFeedback         — orchestrates feedback creation
 *   adminListFeedback      — orchestrates admin paginated list
 *   adminExportFeedbackCsv — orchestrates CSV export
 *
 * FINAL OUTPUT:
 *   module.exports = feedbackService
 *
 * IMPORTED BY:
 *   feedback.controller.js
 */

const feedbackRepository = require('./feedback.repository');
const { parsePagination, buildPaginationMeta } = require('../../core/utils/pagination');

const feedbackService = {
  /**
   * submitFeedback
   * @param {object} payload - bucket, rating, comment, product_id
   * @param {object} principal - req.principal from authGuard
   */
  async submitFeedback(payload, principal) {
    // Derive identity securely from principal
    const user_id = principal.type === 'USER' ? principal.id : null;
    const device_id = principal.deviceId || principal.device_id || 'unknown_device';

    return feedbackRepository.createFeedback({
      ...payload,
      user_id,
      device_id
    });
  },

  /**
   * adminListFeedback
   *
   * USE: Returns paginated feedback records for admin view with optional filtering.
   *
   * HOW IT WORKS:
   *   Parses pagination params. Passes filters (bucket, rating, product_id) to repository.
   *   Returns data array and pagination meta.
   *
   * CONCEPTS: Pagination, allow-list filtering, repository pattern.
   *
   * @param {object} query — req.query (page, pageSize, sort, bucket, rating, product_id)
   * @returns {Promise<{ data: Array, pagination: object }>}
   */
  async adminListFeedback(query) {
    const { page, pageSize, skip, take, sort } = parsePagination(query);
    const filters = {};
    if (query.bucket) filters.bucket = query.bucket;
    if (query.rating) filters.rating = parseInt(query.rating, 10);
    if (query.product_id) filters.product_id = String(query.product_id);

    const { total, data } = await feedbackRepository.findAdminFeedback(filters, { skip, take, sort });
    return {
      data,
      pagination: buildPaginationMeta(page, pageSize, total),
    };
  },

  /**
   * adminExportFeedbackCsv
   *
   * USE: Exports ALL feedback records as a safe CSV string.
   *
   * HOW IT WORKS:
   *   1. Fetches all feedback rows from repository (no pagination limit).
   *   2. Builds CSV header row.
   *   3. Maps each row to a CSV line, escaping commas, quotes, and newlines.
   *   4. Returns the complete CSV string.
   *
   * CONCEPTS: Safe CSV escaping (RFC 4180). No external dependency needed.
   *   Fields with commas, quotes, or newlines are wrapped in double-quotes.
   *   Internal double-quotes are escaped by doubling them.
   *
   * @returns {Promise<string>} — complete CSV string
   */
  async adminExportFeedbackCsv() {
    const rows = await feedbackRepository.findAllFeedbackForExport();

    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['id', 'user_id', 'device_id', 'product_id', 'bucket', 'rating', 'comment', 'created_at'];
    const lines = [headers.join(',')];

    for (const row of rows) {
      lines.push(headers.map((h) => escape(row[h])).join(','));
    }

    return lines.join('\r\n');
  },
};

module.exports = feedbackService;
