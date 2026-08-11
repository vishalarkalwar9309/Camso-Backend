'use strict';

/**
 * src/modules/testimonials/testimonials.validation.js
 *
 * WHAT THIS FILE DOES:
 *   Validates request query parameters for public testimonial endpoints.
 *   Supports both alias parameter names (?product= & ?type=) and canonical names (?product_id= & ?story_type=).
 *   Enforces type safety and parameter constraints using Joi.
 *
 * OVERALL DESIGN:
 *   Normalizes parameter aliases so controllers receive unified filter keys.
 *   Validates sort parameters and pagination ranges.
 *
 * ELEMENTS IN THIS FILE:
 *   - validateListQuery(query) — validates and normalizes GET /testimonials query parameters
 *
 * FINAL OUTPUT OF THE FILE:
 *   Normalized query object or ApiError exception.
 *
 * IMPORTED BY:
 *   src/modules/testimonials/testimonials.controller.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8
 */

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

const STORY_TYPES = [
  'SOLIDS',
  'OPERATING_COST',
  'WORN_PRODUCT_REPLACEMENT',
  'REPEAT_PURCHASE',
];

const listQuerySchema = Joi.object({
  product: Joi.number().integer().positive().optional(),
  product_id: Joi.number().integer().positive().optional(),
  type: Joi.string().valid(...STORY_TYPES).optional(),
  story_type: Joi.string().valid(...STORY_TYPES).optional(),
  lang: Joi.string().max(10).default('en'),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().optional(),
});

/**
 * validateListQuery
 *
 * USE: Validates and normalizes req.query for GET /testimonials.
 *
 * HOW IT WORKS:
 *   1. Runs Joi validation on query params.
 *   2. Maps alias parameters (`product` -> `product_id`, `type` -> `story_type`).
 *   3. Returns normalized query object.
 *
 * CONCEPTS: Parameter alias normalization, Joi validation.
 *
 * @param {object} query — req.query object
 * @returns {object} — normalized query parameters
 */
function validateListQuery(query) {
  const { error, value } = listQuerySchema.validate(query, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw ApiError.validation('Invalid testimonial query parameters', error.details);
  }

  const normalized = {
    product_id: value.product_id || value.product,
    story_type: value.story_type || value.type,
    lang: value.lang,
    page: value.page,
    pageSize: value.pageSize,
    sort: value.sort,
  };

  return normalized;
}

module.exports = { validateListQuery };
