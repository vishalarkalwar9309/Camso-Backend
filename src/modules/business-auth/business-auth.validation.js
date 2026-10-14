'use strict';

/**
 * business-auth.validation — Joi schemas for Dealer and Distributor authentication endpoints.
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

const registerSchema = Joi.object({
  organization: Joi.object({
    name: Joi.string().trim().min(2).max(150).required(),
    type: Joi.string().valid('DEALER', 'DISTRIBUTOR').required(),
    code: Joi.string().trim().max(50).optional(),
    address: Joi.string().trim().max(255).optional(),
    city: Joi.string().trim().max(100).optional(),
    state: Joi.string().trim().max(100).optional(),
    country: Joi.string().trim().max(100).optional(),
    phone: Joi.string().trim().max(30).optional(),
    email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().optional(),
  }).required(),
  user: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required(),
    password: Joi.string().min(8).max(128).required(),
    display_name: Joi.string().trim().max(100).optional(),
    phone: Joi.string().trim().max(30).optional(),
  }).required(),
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
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
};
