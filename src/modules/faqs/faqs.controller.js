'use strict';

/**
 * src/modules/faqs/faqs.controller.js
 *
 * WHAT THIS FILE DOES:
 *   Controller module for handling public FAQ HTTP requests.
 *   Validates request input, calls faqsService, and returns ApiResponse envelopes.
 *
 * OVERALL DESIGN:
 *   Thin controller layer. Contains NO database queries or business rules.
 *
 * ELEMENTS IN THIS FILE:
 *   - list(req, res) — handler for GET /api/v1/faqs
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing Express controller handlers for FAQs.
 *
 * IMPORTED BY:
 *   src/modules/faqs/faqs.routes.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8
 */

const faqsService = require('./faqs.service');
const { validateListQuery } = require('./faqs.validation');
const ApiResponse = require('../../core/utils/ApiResponse');

const faqsController = {
  /**
   * list
   *
   * USE: Express handler for GET /api/v1/faqs.
   *
   * HOW IT WORKS:
   *   1. Validates query parameters via validateListQuery.
   *   2. Invokes faqsService.listPublishedFaqs.
   *   3. Sends ApiResponse.paginated response envelope.
   *
   * CONCEPTS: Express controller pattern.
   *
   * PLACES IMPORTED AND USED: src/modules/faqs/faqs.routes.js
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async list(req, res) {
    const validatedQuery = validateListQuery(req.query);
    const { category, product_id, lang } = validatedQuery;

    const filters = { category, product_id };
    const { faqs, pagination } = await faqsService.listPublishedFaqs(filters, { ...req.query, lang });

    return ApiResponse.paginated(res, faqs, pagination);
  },
};

module.exports = faqsController;
