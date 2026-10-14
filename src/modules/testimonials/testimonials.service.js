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
  async listAdminTestimonials(filters, query) {
    const paginationOptions = parsePagination(query);
    const [total, testimonials] = await testimonialsRepository.findAdminTestimonials(filters, paginationOptions);
    const meta = buildPaginationMeta(paginationOptions.page, paginationOptions.pageSize, total);

    return { testimonials, pagination: meta };
  },

  async getAdminTestimonialById(id) {
    const testimonial = await testimonialsRepository.findAdminTestimonialById(id);
    if (!testimonial) throw require('../../core/utils/ApiError').notFound('Testimonial not found.');
    return testimonial;
  },

  async createTestimonial(data, reqAuditContext) {
    const testimonial = await testimonialsRepository.createTestimonial(data);

    await require('../../core/services/auditService').record({
      ...reqAuditContext,
      action: 'CREATE',
      entityType: 'TESTIMONIAL',
      entityId: testimonial.id,
      after: data,
    });

    return testimonial;
  },

  async updateTestimonial(id, data, reqAuditContext) {
    const existing = await testimonialsRepository.findAdminTestimonialById(id);
    if (!existing) throw require('../../core/utils/ApiError').notFound('Testimonial not found.');

    const updateData = {};
    if (data.product_id !== undefined) updateData.product_id = data.product_id;
    if (data.customer_name !== undefined) updateData.customer_name = data.customer_name;
    if (data.region !== undefined) updateData.region = data.region;
    if (data.story_type !== undefined) updateData.story_type = data.story_type;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.media_asset_id !== undefined) updateData.media_asset_id = data.media_asset_id;
    if (data.is_published !== undefined) updateData.is_published = data.is_published;

    const testimonial = await testimonialsRepository.updateTestimonial(id, updateData);

    if (data.is_published !== undefined && existing.is_published !== data.is_published) {
      await require('../../core/services/auditService').record({
        ...reqAuditContext,
        action: data.is_published ? 'PUBLISH' : 'UNPUBLISH',
        entityType: 'TESTIMONIAL',
        entityId: id,
        before: { is_published: existing.is_published },
        after: { is_published: data.is_published },
      });
    }

    await require('../../core/services/auditService').record({
      ...reqAuditContext,
      action: 'UPDATE',
      entityType: 'TESTIMONIAL',
      entityId: id,
      before: existing,
      after: updateData,
    });

    return testimonial;
  },
};

module.exports = testimonialsService;
