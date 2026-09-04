'use strict';

/**
 * users.validation — Joi schemas for user profile endpoints.
 */

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

/**
 * Validation middleware factory (same pattern as auth.validation).
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
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

    req.body = value;
    next();
  };
}

/**
 * PATCH /users/me — update permitted profile fields.
 *
 * Permitted: display_name, preferred_language
 * Not permitted: email, phone, password, is_guest, password_hash
 *
 * At least one field must be provided.
 */
const updateMeSchema = Joi.object({
  display_name:       Joi.string().trim().max(100).optional(),
  preferred_language: Joi.string().trim().length(2).lowercase().optional(),
}).min(1); // at least one key required

module.exports = { validate, updateMeSchema };
