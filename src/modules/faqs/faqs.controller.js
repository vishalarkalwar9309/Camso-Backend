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
  async adminList(req, res) {
    const validatedQuery = require('./faqs.validation').validateListQuery(req.query);
    const { category, product_id, lang } = validatedQuery;
    let is_published = undefined;
    if (req.query.is_published === 'true') is_published = true;
    else if (req.query.is_published === 'false') is_published = false;

    const filters = { category, product_id, is_published };
    const { faqs, pagination } = await faqsService.listAdminFaqs(filters, { ...req.query, lang });

    return ApiResponse.paginated(res, faqs, pagination);
  },

  async adminGetById(req, res) {
    const { validateCuid } = require('../../core/utils/idValidation');
    const id = validateCuid(req.params.id);
    const lang = req.query.lang || 'en';
    
    const faq = await faqsService.getAdminFaqById(id, lang);
    return ApiResponse.success(res, faq);
  },

  async adminCreate(req, res) {
    const data = require('./faqs.validation').validateCreateFaq(req.body);
    const faq = await faqsService.createFaq(data, req.auditContext);
    return ApiResponse.success(res, faq, 201);
  },

  async adminUpdate(req, res) {
    const { validateCuid } = require('../../core/utils/idValidation');
    const id = validateCuid(req.params.id);
    const data = require('./faqs.validation').validateUpdateFaq(req.body);
    
    const faq = await faqsService.updateFaq(id, data, req.auditContext);
    return ApiResponse.success(res, faq);
  },
};

module.exports = faqsController;
