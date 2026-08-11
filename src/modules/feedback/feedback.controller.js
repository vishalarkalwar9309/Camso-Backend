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
 *   submit — handles POST /api/v1/feedback
 *
 * FINAL OUTPUT:
 *   module.exports = feedbackController
 *
 * IMPORTED BY:
 *   feedback.routes.js
 */

const feedbackService = require('./feedback.service');
const ApiResponse = require('../../core/utils/ApiResponse');

const feedbackController = {
  async submit(req, res) {
    const feedback = await feedbackService.submitFeedback(req.body, req.principal);
    return ApiResponse.success(res, feedback, 201);
  }
};

module.exports = feedbackController;
