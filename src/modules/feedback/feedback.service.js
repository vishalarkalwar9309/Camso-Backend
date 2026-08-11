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
 *   submitFeedback — orchestrates feedback creation
 *
 * FINAL OUTPUT:
 *   module.exports = feedbackService
 *
 * IMPORTED BY:
 *   feedback.controller.js
 */

const feedbackRepository = require('./feedback.repository');

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
  }
};

module.exports = feedbackService;
