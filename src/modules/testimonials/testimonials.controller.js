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
};

module.exports = testimonialsController;
