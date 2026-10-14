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

const { cuidSchema, cuidRequired, cuidOptional } = require('../../core/utils/idValidation');

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
  product: cuidOptional,
  product_id: cuidOptional,
  category: cuidOptional,
  category_id: cuidOptional,
  type: Joi.string().valid(...DOCUMENT_TYPES).optional(),
  document_type: Joi.string().valid(...DOCUMENT_TYPES).optional(),
  lang: Joi.string().max(10).default('en'),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().optional(),
});

const detailParamsSchema = Joi.object({
  id: cuidRequired,
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

const createDocumentSchema = Joi.object({
  product_id: cuidOptional,
  category_id: cuidOptional,
  document_type: Joi.string().valid(...DOCUMENT_TYPES).required(),
  is_published: Joi.boolean().default(false),
  title: Joi.string().max(255).required(), // English fallback title initially
});

const updateDocumentSchema = Joi.object({
  product_id: cuidOptional,
  category_id: cuidOptional,
  document_type: Joi.string().valid(...DOCUMENT_TYPES).optional(),
  is_published: Joi.boolean().optional(),
  title: Joi.string().max(255).optional(), // Default language title update
  translations: Joi.array().items(
    Joi.object({
      language_code: Joi.string().max(10).required(),
      field: Joi.string().valid('title').required(),
      value: Joi.string().required(),
    })
  ).optional(),
});

function validateCreateDocument(body) {
  const { error, value } = createDocumentSchema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw ApiError.validation('Invalid document data', error.details);
  }
  return value;
}

function validateUpdateDocument(body) {
  const { error, value } = updateDocumentSchema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw ApiError.validation('Invalid update data', error.details);
  }
  return value;
}

module.exports = { validateListQuery, validateDetailParams, validateCreateDocument, validateUpdateDocument };
