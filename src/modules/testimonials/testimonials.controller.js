'use strict';

/**
 * src/modules/testimonials/testimonials.controller.js
 *
 * WHAT THIS FILE DOES:
 *   Controller module for handling public testimonial HTTP requests.
 *   Validates request input, calls testimonialsService, and returns ApiResponse envelopes.
 *
 * OVERALL DESIGN:
 *   Thin controller layer. Contains NO database queries or business rules.
 *
 * ELEMENTS IN THIS FILE:
 *   - list(req, res) — handler for GET /api/v1/testimonials
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing Express controller handlers for testimonials.
 *
 * IMPORTED BY:
 *   src/modules/testimonials/testimonials.routes.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8
 */

const testimonialsService = require('./testimonials.service');
const { validateListQuery } = require('./testimonials.validation');
const ApiResponse = require('../../core/utils/ApiResponse');

const testimonialsController = {
  /**
   * list
   *
   * USE: Express handler for GET /api/v1/testimonials.
   *
   * HOW IT WORKS:
   *   1. Validates query parameters via validateListQuery.
   *   2. Invokes testimonialsService.listPublishedTestimonials.
   *   3. Sends ApiResponse.paginated response envelope.
   *
   * CONCEPTS: Express controller pattern.
   *
   * PLACES IMPORTED AND USED: src/modules/testimonials/testimonials.routes.js
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async list(req, res) {
    const validatedQuery = validateListQuery(req.query);
    const { product_id, story_type } = validatedQuery;

    const filters = { product_id, story_type };
    const { testimonials, pagination } = await testimonialsService.listPublishedTestimonials(filters, req.query);

    return ApiResponse.paginated(res, testimonials, pagination);
  },
  async adminList(req, res) {
    const validatedQuery = require('./testimonials.validation').validateListQuery(req.query);
    const { product_id, story_type } = validatedQuery;
    let is_published = undefined;
    if (req.query.is_published === 'true') is_published = true;
    else if (req.query.is_published === 'false') is_published = false;

    const filters = { product_id, story_type, is_published };
    const { testimonials, pagination } = await testimonialsService.listAdminTestimonials(filters, req.query);

    return ApiResponse.paginated(res, testimonials, pagination);
  },

  async adminGetById(req, res) {
    const { validateCuid } = require('../../core/utils/idValidation');
    const id = validateCuid(req.params.id);
    
    const testimonial = await testimonialsService.getAdminTestimonialById(id);
    return ApiResponse.success(res, testimonial);
  },

  async adminCreate(req, res) {
    const data = require('./testimonials.validation').validateCreateTestimonial(req.body);
    const testimonial = await testimonialsService.createTestimonial(data, req.auditContext);
    return ApiResponse.success(res, testimonial, 201);
  },

  async adminUpdate(req, res) {
    const { validateCuid } = require('../../core/utils/idValidation');
    const id = validateCuid(req.params.id);
    const data = require('./testimonials.validation').validateUpdateTestimonial(req.body);
    
    const testimonial = await testimonialsService.updateTestimonial(id, data, req.auditContext);
    return ApiResponse.success(res, testimonial);
  },
};

module.exports = testimonialsController;
