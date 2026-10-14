'use strict';

/**
 * languages.validation — Joi schemas and validation middleware for languages module.
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

const createLanguageSchema = Joi.object({
  code:        Joi.string().trim().length(2).lowercase().required(),
  name:        Joi.string().trim().min(2).max(50).required(),
  native_name: Joi.string().trim().max(50).optional().allow(null, ''),
  flag_emoji:  Joi.string().trim().max(10).optional().allow(null, ''),
  is_active:   Joi.boolean().optional().default(true),
  sort_order:  Joi.number().integer().min(0).optional().default(0),
});

const updateLanguageSchema = Joi.object({
  name:        Joi.string().trim().min(2).max(50).optional(),
  native_name: Joi.string().trim().max(50).optional().allow(null, ''),
  flag_emoji:  Joi.string().trim().max(10).optional().allow(null, ''),
  is_active:   Joi.boolean().optional(),
  sort_order:  Joi.number().integer().min(0).optional(),
}).min(1);

const languageCodeParamSchema = Joi.object({
  code: Joi.string().trim().length(2).lowercase().required(),
});

module.exports = {
  validate,
  createLanguageSchema,
  updateLanguageSchema,
  languageCodeParamSchema,
};
