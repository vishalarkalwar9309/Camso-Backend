'use strict';

/**
 * src/core/utils/idValidation.js
 *
 * Provides standardized Joi validation schemas and helpers for CUID and identifier strings.
 * Ensures cross-module consistency for primary keys and foreign keys.
 */

const Joi = require('joi');
const ApiError = require('./ApiError');

// CUID string schema supporting standard CUIDs and test mock strings
const cuidSchema = Joi.string().trim().min(8).max(36);
const cuidRequired = cuidSchema.required();
const cuidOptional = cuidSchema.optional().allow(null, '');

/**
 * validateCuid
 *
 * Explicitly validates a single identifier string, throwing a formatted 400 ApiError if invalid.
 *
 * @param {string} id - The ID string to validate
 * @param {string} [fieldName='id'] - The parameter name for the error message
 * @returns {string} The validated, trimmed ID string
 */
function validateCuid(id, fieldName = 'id') {
  const { error, value } = cuidRequired.validate(id);
  if (error) {
    throw ApiError.badRequest(`Invalid ${fieldName}: must be a valid identifier string`);
  }
  return value;
}

module.exports = {
  cuidSchema,
  cuidRequired,
  cuidOptional,
  validateCuid,
};
