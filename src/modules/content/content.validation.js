'use strict';

/**
 * content.validation — Joi schemas for app_content and configuration module.
 */

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
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

const updateContentSchema = Joi.object({
  title:     Joi.string().trim().max(100).optional().allow(null, ''),
  content:   Joi.object().optional().allow(null),
  extra:     Joi.object().optional().allow(null),
  is_active: Joi.boolean().optional(),
}).min(1);

const contentKeyParamSchema = Joi.object({
  key: Joi.string().trim().lowercase().min(2).max(50).required(),
});

module.exports = {
  validate,
  updateContentSchema,
  contentKeyParamSchema,
};
