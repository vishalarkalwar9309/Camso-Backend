'use strict';

/**
 * admin-auth.validation — Joi schemas for admin authentication endpoints.
 */

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

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
  loginSchema,
  refreshSchema,
  logoutSchema,
};
