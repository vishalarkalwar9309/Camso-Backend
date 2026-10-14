'use strict';

/**
 * src/modules/feedback/feedback.controller.js
 *
 * WHAT THIS FILE DOES:
 *   HTTP request handlers for feedback endpoints.
 *
 * OVERALL DESIGN:
 *   Extracts payload and principal, passes to service layer.
 *
 * ELEMENTS:
 *   submit      — handles POST /api/v1/feedback
 *   adminList   — handles GET /api/v1/admin/feedback
 *   adminExport — handles GET /api/v1/admin/feedback/export?format=csv
 *
 * FINAL OUTPUT:
 *   module.exports = feedbackController
 *
 * IMPORTED BY:
 *   feedback.routes.js
 *   feedback.admin.routes.js
 */

const feedbackService = require('./feedback.service');
const ApiResponse = require('../../core/utils/ApiResponse');

const feedbackController = {
  /**
   * submit
   * USE: Express handler for POST /api/v1/feedback.
   * Derives identity from JWT principal — never from client-supplied fields.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async submit(req, res) {
    const feedback = await feedbackService.submitFeedback(req.body, req.principal);
    return ApiResponse.success(res, feedback, 201);
  },

  /**
   * adminList
   *
   * USE: Express handler for GET /api/v1/admin/feedback.
   * Returns paginated feedback records with optional filtering.
   *
   * HOW IT WORKS:
   *   Passes query params to feedbackService.adminListFeedback.
   *   Returns ApiResponse.paginated envelope.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminList(req, res) {
    const { data, pagination } = await feedbackService.adminListFeedback(req.query);
    return ApiResponse.paginated(res, data, pagination);
  },

  /**
   * adminExport
   *
   * USE: Express handler for GET /api/v1/admin/feedback/export?format=csv.
   * Streams all feedback records as a CSV response.
   *
   * HOW IT WORKS:
   *   Fetches all feedback via feedbackService.adminExportFeedback.
   *   Builds a CSV string using safe escaping.
   *   Sets Content-Type: text/csv and Content-Disposition header.
   *
   * CONCEPTS: CSV generation, response streaming, safe escaping.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminExport(req, res) {
    const csv = await feedbackService.adminExportFeedbackCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="feedback_export.csv"');
    return res.status(200).send(csv);
  },
};

module.exports = feedbackController;
