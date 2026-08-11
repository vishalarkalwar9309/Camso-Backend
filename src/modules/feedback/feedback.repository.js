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
 *   createFeedback              — persists a new feedback record
 *   findAdminFeedback           — paginated admin list with filters
 *   findAllFeedbackForExport    — all feedback rows for CSV export
 *
 * FINAL OUTPUT:
 *   module.exports = feedbackRepository
 *
 * IMPORTED BY:
 *   feedback.service.js
 */

const { prisma } = require('../../config/database');

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
  },

  /**
   * findAdminFeedback
   *
   * USE: Returns paginated feedback records for admin view with optional filtering.
   *
   * HOW IT WORKS:
   *   Builds where clause from filters. Applies parseSort. Runs count + findMany.
   *
   * @param {object} filters    — { bucket, rating, product_id }
   * @param {object} pagination — { skip, take, sort }
   * @returns {Promise<{ total: number, data: Array }>}
   */
  async findAdminFeedback(filters, pagination) {
    const { parseSort } = require('../../core/utils/pagination');
    const ALLOWED_SORT = ['id', 'created_at', 'rating', 'bucket'];
    const where = {};
    if (filters.bucket) where.bucket = filters.bucket;
    if (filters.rating) where.rating = filters.rating;
    if (filters.product_id) where.product_id = filters.product_id;

    const { orderBy } = parseSort(pagination.sort, ALLOWED_SORT, 'created_at', 'desc');
    const [total, data] = await prisma.$transaction([
      prisma.feedback.count({ where }),
      prisma.feedback.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        select: {
          id: true,
          user_id: true,
          device_id: true,
          product_id: true,
          bucket: true,
          rating: true,
          comment: true,
          created_at: true,
        },
      }),
    ]);
    return { total, data };
  },

  /**
   * findAllFeedbackForExport
   *
   * USE: Fetches ALL feedback rows for CSV export (no pagination limit).
   *      Returns only the contractually exposed columns.
   *
   * @returns {Promise<Array>}
   */
  async findAllFeedbackForExport() {
    return prisma.feedback.findMany({
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        user_id: true,
        device_id: true,
        product_id: true,
        bucket: true,
        rating: true,
        comment: true,
        created_at: true,
      },
    });
  },
};

module.exports = feedbackRepository;
