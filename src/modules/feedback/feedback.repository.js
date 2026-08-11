'use strict';

/**
 * src/modules/feedback/feedback.repository.js
 *
 * WHAT THIS FILE DOES:
 *   Database access for feedback using Prisma.
 *
 * OVERALL DESIGN:
 *   Only layer authorized to import Prisma for feedback operations.
 *
 * ELEMENTS:
 *   createFeedback — persists a new feedback record
 *
 * FINAL OUTPUT:
 *   module.exports = feedbackRepository
 *
 * IMPORTED BY:
 *   feedback.service.js
 */

const prisma = require('../../config/database');

const feedbackRepository = {
  /**
   * createFeedback
   * Inserts a new feedback record into the database.
   */
  async createFeedback(data) {
    return prisma.feedback.create({
      data: {
        user_id: data.user_id,
        device_id: data.device_id,
        product_id: data.product_id,
        bucket: data.bucket,
        rating: data.rating,
        comment: data.comment
      }
    });
  }
};

module.exports = feedbackRepository;
