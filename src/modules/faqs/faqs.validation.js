'use strict';

/**
 * src/modules/faqs/faqs.validation.js
 *
 * WHAT THIS FILE DOES:
 *   Validates request query parameters for public FAQ endpoints.
 *   Supports both alias parameter names (?product=) and canonical names (?product_id=).
 *   Enforces type safety and parameter constraints using Joi.
 *
 * OVERALL DESIGN:
 *   Normalizes parameter aliases so controllers receive unified filter keys.
 *   Validates sort parameters and pagination ranges.
 *
 * ELEMENTS IN THIS FILE:
 *   - validateListQuery(query) — validates and normalizes GET /faqs query parameters
 *
 * FINAL OUTPUT OF THE FILE:
 *   Normalized query object or ApiError exception.
 *
 * IMPORTED BY:
 *   src/modules/faqs/faqs.controller.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8
 */

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

const FAQ_CATEGORIES = ['COMPANY', 'PRODUCT', 'DISTRIBUTION'];

const listQuerySchema = Joi.object({
  category: Joi.string().valid(...FAQ_CATEGORIES).optional(),
  product: Joi.number().integer().positive().optional(),
  product_id: Joi.number().integer().positive().optional(),
  lang: Joi.string().max(10).default('en'),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().optional(),
});

/**
 * validateListQuery
 *
 * USE: Validates and normalizes req.query for GET /faqs.
 *
 * @param {object} query — req.query object
 * @returns {object} — normalized query parameters
 */
function validateListQuery(query) {
  const { error, value } = listQuerySchema.validate(query, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw ApiError.validation('Invalid FAQ query parameters', error.details);
  }

  const normalized = {
    category: value.category,
    product_id: value.product_id || value.product,
    lang: value.lang,
    page: value.page,
    pageSize: value.pageSize,
    sort: value.sort,
  };

  return normalized;
}

module.exports = { validateListQuery };
