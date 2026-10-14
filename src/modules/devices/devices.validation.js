'use strict';

/**
 * devices.validation — Joi schemas and validation middleware for device management.
 */

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

/**
 * Express middleware factory validating req[source] against a Joi schema.
 *
 * @param {Joi.Schema} schema
 * @param {'body' | 'params' | 'query'} [source='body']
 * @returns {import('express').RequestHandler}
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
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

/**
 * POST /api/v1/devices schema
 */
const registerDeviceSchema = Joi.object({
  device_id:   Joi.string().trim().min(1).max(128).required(),
  platform:    Joi.string().trim().uppercase().valid('ANDROID', 'IOS').required(),
  fcm_token:   Joi.string().trim().max(500).allow(null, '').optional(),
  app_version: Joi.string().trim().max(50).allow(null, '').optional(),
});

/**
 * DELETE /api/v1/devices/:id params schema
 */
const deviceIdParamSchema = Joi.object({
  id: Joi.string().trim().min(1).required(),
});

module.exports = {
  validate,
  registerDeviceSchema,
  deviceIdParamSchema,
};
