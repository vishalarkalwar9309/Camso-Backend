'use strict';

/**
 * 1. What this file does:
 *    Defines Joi validation schemas and an Express validation middleware for the User Activity tracking module.
 * 2. Overall design:
 *    Enforces strict typing, length constraints, and enumerated values for incoming activity event ingestion
 *    and activity history retrieval requests across mobile client sessions.
 * 3. Elements in the file:
 *    - recordActivitySchema: Validates activity recording payloads (activity_type, entity_type, entity_id, metadata, device_id).
 *    - listActivitySchema: Validates pagination and query filtering parameters (page, pageSize, activity_type, device_id).
 *    - validate: Higher-order Express middleware function that validates request data against specified Joi schemas.
 * 4. Final output of the file:
 *    Exports validation schemas and middleware function to enforce payload contracts before controller execution.
 */

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

const ALLOWED_ACTIVITY_TYPES = [
  'SEARCH',
  'PRODUCT_VIEW',
  'DOCUMENT_VIEW',
  'DOCUMENT_DOWNLOAD',
  'BOOKMARK_ADD',
  'BOOKMARK_REMOVE',
  'CALCULATION_SAVED',
  'FEEDBACK_SUBMITTED',
  'LOGIN',
  'LOGOUT',
];

const recordActivitySchema = Joi.object({
  activity_type: Joi.string()
    .valid(...ALLOWED_ACTIVITY_TYPES)
    .required()
    .messages({
      'any.required': 'activity_type is required.',
      'any.only': `activity_type must be one of: ${ALLOWED_ACTIVITY_TYPES.join(', ')}.`,
    }),
  entity_type: Joi.string().trim().max(100).optional(),
  entity_id: Joi.string().trim().max(255).optional(),
  metadata: Joi.object().optional(),
  device_id: Joi.string().trim().max(100).optional(),
});

const listActivitySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  activity_type: Joi.string().valid(...ALLOWED_ACTIVITY_TYPES).optional(),
  device_id: Joi.string().trim().max(100).optional(),
});

/**
 * Higher-order validation middleware factory.
 *
 * 1. The use of function:
 *    Validates incoming request payload or query parameters against a given Joi schema.
 * 2. How does the specific function work:
 *    Extracts data from the specified target (body or query), executes schema.validate with stripping unknown keys,
 *    and either proceeds via next() or generates an ApiError.badRequest with detailed field-level validation errors.
 * 3. Concepts used in the function:
 *    Joi validation, Express middleware closure, API error formatting.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/activity/activity.routes.js for route-level validation.
 * 5. Final output of the function, before and after:
 *    Before: Raw untrusted request in req[source].
 *    After: Sanitized and validated data assigned to req[source], or next(ApiError.badRequest) dispatched.
 *
 * @param {Joi.ObjectSchema} schema - The Joi validation schema.
 * @param {string} source - 'body' | 'query' | 'params'.
 * @returns {Function} Express middleware function.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const dataToValidate = { ...(req[source] || {}) };
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(ApiError.badRequest('Validation failed.', details));
    }

    req[source] = value;
    next();
  };
}

module.exports = {
  recordActivitySchema,
  listActivitySchema,
  validate,
};
