'use strict';

/**
 * auth.validation — Joi schemas for all authentication endpoints.
 *
 * validate(schema) returns an Express middleware that validates req.body
 * and calls next() on success or throws an ApiError on failure.
 *
 * stripUnknown: true — extra fields in the body are silently removed.
 * abortEarly: false — all validation errors are collected, not just the first.
 */

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

/**
 * Factory: returns Express middleware that validates req.body against schema.
 *
 * @param {Joi.Schema} schema
 * @returns {Function} Express middleware
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

    // Replace req.body with the validated (and stripped) value
    req.body = value;
    next();
  };
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const guestSchema = Joi.object({
  device_id: Joi.string().trim().min(1).required(),
  platform: Joi.string().valid('ANDROID', 'IOS').required(),
  app_version: Joi.string().trim().optional(),
});

const registerSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required(),

  display_name: Joi.string().trim().max(100).optional(),
  preferred_language: Joi.string().trim().length(2).lowercase().optional().default('en'),
});

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refresh_token: Joi.string().trim().required(),
});

const logoutSchema = Joi.object({
  refresh_token: Joi.string().trim().required(),
});

module.exports = {
  validate,
  guestSchema,
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
};

