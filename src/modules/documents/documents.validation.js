'use strict';

/**
 * src/modules/documents/documents.validation.js
 *
 * WHAT THIS FILE DOES:
 *   Validates request query parameters and route params for public document endpoints.
 *   Supports both alias parameter names (?product= & ?type=) and canonical names (?product_id= & ?document_type=).
 *   Enforces type safety and parameter constraints using Joi.
 *
 * OVERALL DESIGN:
 *   Normalizes parameter aliases so controllers receive unified filter keys.
 *   Validates sort parameters and pagination ranges.
 *
 * ELEMENTS IN THIS FILE:
 *   - validateListQuery(query) — validates and normalizes GET /documents query parameters
 *   - validateDetailParams(params, query) — validates GET /documents/:id parameters
 *
 * FINAL OUTPUT OF THE FILE:
 *   Normalized filter object or ApiError exception.
 *
 * IMPORTED BY:
 *   src/modules/documents/documents.controller.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8
 */

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

const DOCUMENT_TYPES = [
  'CATALOGUE',
  'BROCHURE',
  'MANUAL',
  'TECHNICAL_GUIDE',
  'BULLETIN',
  'WARRANTY',
  'VIDEO',
];

const listQuerySchema = Joi.object({
  product: Joi.number().integer().positive().optional(),
  product_id: Joi.number().integer().positive().optional(),
  category: Joi.number().integer().positive().optional(),
  category_id: Joi.number().integer().positive().optional(),
  type: Joi.string().valid(...DOCUMENT_TYPES).optional(),
  document_type: Joi.string().valid(...DOCUMENT_TYPES).optional(),
  lang: Joi.string().max(10).default('en'),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().optional(),
});

const detailParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const detailQuerySchema = Joi.object({
  lang: Joi.string().max(10).default('en'),
});

/**
 * validateListQuery
 *
 * USE: Validates and normalizes req.query for GET /documents.
 *
 * HOW IT WORKS:
 *   1. Runs Joi validation on query params.
 *   2. Maps alias parameters (`product` -> `product_id`, `category` -> `category_id`, `type` -> `document_type`).
 *   3. Returns normalized query object.
 *
 * CONCEPTS: Parameter alias normalization, Joi validation.
 *
 * @param {object} query — req.query object
 * @returns {object} — normalized parameters
 */
function validateListQuery(query) {
  const { error, value } = listQuerySchema.validate(query, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw ApiError.validation('Invalid document query parameters', error.details);
  }

  // Normalize aliases to canonical internal names
  const normalized = {
    product_id: value.product_id || value.product,
    category_id: value.category_id || value.category,
    document_type: value.document_type || value.type,
    lang: value.lang,
    page: value.page,
    pageSize: value.pageSize,
    sort: value.sort,
  };

  return normalized;
}

/**
 * validateDetailParams
 *
 * USE: Validates req.params and req.query for GET /documents/:id.
 *
 * @param {object} params — req.params
 * @param {object} query — req.query
 * @returns {{ id: number, lang: string }}
 */
function validateDetailParams(params, query) {
  const paramsResult = detailParamsSchema.validate(params, { abortEarly: false });
  if (paramsResult.error) {
    throw ApiError.validation('Invalid document ID', paramsResult.error.details);
  }

  const queryResult = detailQuerySchema.validate(query, { abortEarly: false, stripUnknown: true });
  if (queryResult.error) {
    throw ApiError.validation('Invalid query parameters', queryResult.error.details);
  }

  return { id: paramsResult.value.id, lang: queryResult.value.lang };
}

module.exports = { validateListQuery, validateDetailParams };
