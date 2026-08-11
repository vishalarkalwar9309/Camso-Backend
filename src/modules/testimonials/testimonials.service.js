'use strict';

/**
 * src/modules/testimonials/testimonials.service.js
 *
 * WHAT THIS FILE DOES:
 *   Service layer for testimonials business logic.
 *   Coordinates repository queries and pagination meta calculations.
 *
 * OVERALL DESIGN:
 *   Handles business rules for public testimonial listing.
 *   Uses testimonialsRepository for database access.
 *   Does NOT import Prisma directly.
 *
 * ELEMENTS IN THIS FILE:
 *   - listPublishedTestimonials(filters, query) — list published testimonials with pagination
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing service methods for testimonials module.
 *
 * IMPORTED BY:
 *   src/modules/testimonials/testimonials.controller.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8
 */

const testimonialsRepository = require('./testimonials.repository');
const { parsePagination, buildPaginationMeta } = require('../../core/utils/pagination');

const testimonialsService = {
  /**
   * listPublishedTestimonials
   *
   * USE: Retrieves a paginated list of published testimonials matching filter criteria.
   *
   * HOW IT WORKS:
   *   1. Parses pagination options from query.
   *   2. Queries testimonialsRepository for published testimonials.
   *   3. Builds pagination metadata envelope.
   *
   * CONCEPTS: Business service layer, pagination envelope.
   *
   * PLACES IMPORTED AND USED: src/modules/testimonials/testimonials.controller.js
   *
   * @param {object} filters — { product_id, story_type }
   * @param {object} query — raw req.query object for pagination
   * @returns {Promise<{ testimonials: Array<object>, pagination: object }>}
   */
  async listPublishedTestimonials(filters, query) {
    const paginationOptions = parsePagination(query);
    const [total, testimonials] = await testimonialsRepository.findPublishedTestimonials(filters, paginationOptions);
    const meta = buildPaginationMeta(paginationOptions.page, paginationOptions.pageSize, total);

    return { testimonials, pagination: meta };
  },
};

module.exports = testimonialsService;
