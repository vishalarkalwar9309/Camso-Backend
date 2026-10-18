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

/**
 * Formats a testimonial record for public display by sanitizing metadata tags and display labels.
 *
 * 1. The use of function:
 *    Removes redundant display metadata labels ('Customer Story', 'NA', 'verified') from public testimonials
 *    without mutating or deleting underlying database rows.
 * 2. How does the specific function work:
 *    - Normalizes region: maps 'NA' or 'N/A' to 'North America'.
 *    - Cleans tags: removes 'verified', 'na', 'n/a', 'customer story' so the frontend does not render duplicate badges.
 *    - Provides display_story_type that represents the specific equipment or operational topic rather than redundant 'Customer Story'.
 * 3. Concepts used in the function:
 *    Data normalization, display projection, tag sanitization.
 * 4. Places where this function is imported and used:
 *    Used in testimonialsService.listPublishedTestimonials and export for testing.
 * 5. Final output of the function, before and after:
 *    Before: Raw database record with 'NA' region and redundant labels.
 *    After: Cleaned testimonial object formatted for mobile and web presentation.
 *
 * @param {object} raw - Raw testimonial database record.
 * @returns {object} Formatted testimonial object.
 */
function formatTestimonial(raw) {
  if (!raw) return null;

  // Normalize region abbreviation
  let normalizedRegion = raw.region;
  if (normalizedRegion) {
    const rLower = normalizedRegion.trim().toLowerCase();
    if (rLower === 'na' || rLower === 'n/a') {
      normalizedRegion = 'North America';
    }
  }

  // Determine domain-specific tags instead of redundant 'Verified' or 'Customer Story'
  const rawTags = Array.isArray(raw.tags) ? raw.tags : [];
  const redundantTokens = new Set(['verified', 'n/a', 'na', 'customer story', 'null', 'none']);

  const cleanedTags = rawTags.filter((t) => {
    if (typeof t !== 'string') return false;
    const lower = t.trim().toLowerCase();
    return !redundantTokens.has(lower);
  });

  // Provide meaningful domain tags if empty based on story type or product
  if (cleanedTags.length === 0) {
    if (raw.story_type === 'SOLIDS') cleanedTags.push('Solid Tires', 'Durability');
    else if (raw.story_type === 'OPERATING_COST') cleanedTags.push('Cost Efficiency', 'Fleet ROI');
    else if (raw.story_type === 'WORN_PRODUCT_REPLACEMENT') cleanedTags.push('Replacement', 'Track Wear');
    else if (raw.story_type === 'REPEAT_PURCHASE') cleanedTags.push('Fleet Standard', 'Longevity');
    else cleanedTags.push('Field Report');
  }

  // Meaningful human-readable story type that avoids redundant "Customer Story"
  let displayStoryType = 'Field Performance Report';
  if (raw.story_type === 'SOLIDS') displayStoryType = 'Solid Tire Case Study';
  else if (raw.story_type === 'OPERATING_COST') displayStoryType = 'Operating Cost Analysis';
  else if (raw.story_type === 'WORN_PRODUCT_REPLACEMENT') displayStoryType = 'Replacement Study';
  else if (raw.story_type === 'REPEAT_PURCHASE') displayStoryType = 'Fleet Adoption Review';

  return {
    ...raw,
    region: normalizedRegion,
    location: normalizedRegion,
    tags: cleanedTags,
    display_story_type: displayStoryType,
    author_name: raw.customer_name,
    company: raw.company || normalizedRegion || 'Commercial Fleet Partner',
  };
}

const testimonialsService = {
  /**
   * listPublishedTestimonials
   *
   * USE: Retrieves a paginated list of published testimonials matching filter criteria.
   *
   * HOW IT WORKS:
   *   1. Parses pagination options from query.
   *   2. Queries testimonialsRepository for published testimonials.
   *   3. Formats each testimonial with formatTestimonial to strip redundant labels.
   *   4. Builds pagination metadata envelope.
   *
   * CONCEPTS: Business service layer, pagination envelope, data projection.
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
    const formattedTestimonials = (testimonials || []).map(formatTestimonial);
    const meta = buildPaginationMeta(paginationOptions.page, paginationOptions.pageSize, total);

    return { testimonials: formattedTestimonials, pagination: meta };
  },
  formatTestimonial,
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
