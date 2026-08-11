'use strict';

/**
 * src/modules/testimonials/testimonials.repository.js
 *
 * WHAT THIS FILE DOES:
 *   Repository module for database access on the testimonials table.
 *   Contains Prisma queries for reading published testimonials.
 *
 * OVERALL DESIGN:
 *   Follows the 5-tier architecture (Repositories are the ONLY layer that calls Prisma).
 *   Encapsulates all database reads for testimonials.
 *
 * ELEMENTS IN THIS FILE:
 *   - findPublishedTestimonials(filters, pagination, prismaClient) — lists published testimonials with count
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing database query methods for testimonials.
 *
 * IMPORTED BY:
 *   src/modules/testimonials/testimonials.service.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 4 & 7
 */

const { parseSort } = require('../../core/utils/pagination');
const { prisma } = require('../../config/database');

const ALLOWED_SORT_FIELDS = ['created_at', 'updated_at', 'id', 'customer_name'];

const testimonialsRepository = {
  /**
   * findPublishedTestimonials
   *
   * USE: Queries PostgreSQL for published testimonials matching filter criteria with pagination.
   *
   * HOW IT WORKS:
   *   Builds Prisma where clause enforcing `is_published: true`.
   *   Applies optional product_id and story_type filters.
   *   Uses parseSort against an allow-list of fields.
   *   Executes count and findMany in a transaction.
   *
   * CONCEPTS: Offset pagination, Prisma transaction query, allow-list sort safety.
   *
   * PLACES IMPORTED AND USED: src/modules/testimonials/testimonials.service.js
   *
   * @param {object} filters — { product_id, story_type }
   * @param {object} pagination — { skip, take, sort }
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<[number, Array<object>]>} — count and records array
   */
  async findPublishedTestimonials(filters, pagination, prismaClient = prisma) {
    const where = {
      is_published: true,
    };

    if (filters.product_id) where.product_id = filters.product_id;
    if (filters.story_type) where.story_type = filters.story_type;

    const { orderBy } = parseSort(pagination.sort, ALLOWED_SORT_FIELDS, 'created_at', 'desc');

    return prismaClient.$transaction([
      prismaClient.testimonial.count({ where }),
      prismaClient.testimonial.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        select: {
          id: true,
          product_id: true,
          customer_name: true,
          region: true,
          story_type: true,
          content: true,
          media_asset_id: true,
          created_at: true,
          updated_at: true,
          media_asset: {
            select: {
              id: true,
              url: true,
              filename: true,
              mime_type: true,
              size_bytes: true,
            },
          },
        },
      }),
    ]);
  },
};

module.exports = testimonialsRepository;
