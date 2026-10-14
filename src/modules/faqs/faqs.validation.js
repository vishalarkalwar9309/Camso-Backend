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
const { cuidSchema, cuidRequired, cuidOptional } = require('../../core/utils/idValidation');

const FAQ_CATEGORIES = ['COMPANY', 'PRODUCT', 'DISTRIBUTION'];

const listQuerySchema = Joi.object({
  category: Joi.string().valid(...FAQ_CATEGORIES).optional(),
  product: cuidOptional,
  product_id: cuidOptional,
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

const createFaqSchema = Joi.object({
  product_id: cuidOptional,
  category: Joi.string().valid(...FAQ_CATEGORIES).required(),
  sort_order: Joi.number().integer().default(0),
  is_published: Joi.boolean().default(false),
  question: Joi.string().required(), // English fallback question initially
  answer: Joi.string().required(),   // English fallback answer initially
});

const updateFaqSchema = Joi.object({
  product_id: cuidOptional,
  category: Joi.string().valid(...FAQ_CATEGORIES).optional(),
  sort_order: Joi.number().integer().optional(),
  is_published: Joi.boolean().optional(),
  question: Joi.string().optional(),
  answer: Joi.string().optional(),
  translations: Joi.array().items(
    Joi.object({
      language_code: Joi.string().max(10).required(),
      field: Joi.string().valid('question', 'answer').required(),
      value: Joi.string().required(),
    })
  ).optional(),
});

function validateCreateFaq(body) {
  const { error, value } = createFaqSchema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw ApiError.validation('Invalid FAQ data', error.details);
  }
  return value;
}

function validateUpdateFaq(body) {
  const { error, value } = updateFaqSchema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw ApiError.validation('Invalid update data', error.details);
  }
  return value;
}

module.exports = { validateListQuery, validateCreateFaq, validateUpdateFaq };
