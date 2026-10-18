'use strict';

/**
 * 1. What this file does:
 *    Defines Joi validation schemas and an Express validation middleware for the User Calculations module.
 * 2. Overall design:
 *    Enforces payload structures for saving, querying, and deleting engineering/ROI calculations
 *    performed on the mobile app (such as tire pressure calculations or ROI comparisons).
 * 3. Elements in the file:
 *    - createCalculationSchema: Validates calculation save requests (calculation_type, inputs, results, title, notes, device_id).
 *    - listCalculationsSchema: Validates calculation query and pagination parameters.
 *    - calculationIdParamSchema: Validates calculation path parameters.
 *    - validate: Higher-order Express middleware function.
 * 4. Final output of the file:
 *    Exports validation schemas and middleware function to enforce payload contracts.
 */

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

const createCalculationSchema = Joi.object({
  calculation_type: Joi.string()
    .trim()
    .max(100)
    .required()
    .messages({
      'any.required': 'calculation_type is required.',
      'string.empty': 'calculation_type cannot be empty.',
    }),
  title: Joi.string().trim().max(255).optional().allow('', null),
  inputs: Joi.object()
    .required()
    .messages({
      'any.required': 'inputs object is required.',
    }),
  results: Joi.object()
    .required()
    .messages({
      'any.required': 'results object is required.',
    }),
  notes: Joi.string().trim().max(2000).optional().allow('', null),
  device_id: Joi.string().trim().max(100).optional(),
});

const listCalculationsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  calculation_type: Joi.string().trim().max(100).optional(),
  device_id: Joi.string().trim().max(100).optional(),
});

const calculationIdParamSchema = Joi.object({
  id: Joi.string()
    .trim()
    .required()
    .messages({
      'any.required': 'Calculation ID is required.',
      'string.empty': 'Calculation ID cannot be empty.',
    }),
});

/**
 * Higher-order validation middleware factory.
 *
 * 1. The use of function:
 *    Validates incoming request payload or query parameters against a given Joi schema.
 * 2. How does the specific function work:
 *    Extracts data from the specified target (body, query, or params), executes schema.validate with stripping unknown keys,
 *    and either proceeds via next() or generates an ApiError.badRequest with detailed field-level validation errors.
 * 3. Concepts used in the function:
 *    Joi validation, Express middleware closure, API error formatting.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/calculations/calculations.routes.js for route-level validation.
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

    if (source === 'query' && req.query && typeof req.query === 'object') {
      for (const k of Object.keys(req.query)) {
        delete req.query[k];
      }
      Object.assign(req.query, value);
    } else {
      req[source] = value;
    }
    next();
  };
}

module.exports = {
  createCalculationSchema,
  listCalculationsSchema,
  calculationIdParamSchema,
  validate,
};
