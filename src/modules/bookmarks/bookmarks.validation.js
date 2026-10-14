'use strict';

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

const addBookmarkSchema = Joi.object({
  product_id: Joi.string().required().trim().messages({
    'any.required': 'product_id is required.',
    'string.empty': 'product_id cannot be empty.',
  }),
  device_id: Joi.string().trim().max(100).optional().messages({
    'string.max': 'device_id cannot exceed 100 characters.',
  }),
});

const listBookmarksSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  device_id: Joi.string().trim().max(100).optional(),
  sort: Joi.string().valid('asc', 'desc').default('desc'),
});

const syncBookmarksSchema = Joi.object({
  guest_token: Joi.string().required().trim().messages({
    'any.required': 'guest_token is required to verify the source guest session.',
    'string.empty': 'guest_token cannot be empty.',
  }),
  device_id: Joi.string().trim().max(100).optional().messages({
    'string.max': 'device_id cannot exceed 100 characters.',
  }),
});

const bookmarkIdParamSchema = Joi.object({
  id: Joi.string().required().trim().messages({
    'any.required': 'Bookmark or product ID is required.',
    'string.empty': 'Bookmark or product ID cannot be empty.',
  }),
});

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const dataToValidate = { ...(req[source] || {}) };
    if (source === 'body' && req.headers && req.headers['x-guest-token'] && !dataToValidate.guest_token) {
      dataToValidate.guest_token = req.headers['x-guest-token'];
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(ApiError.badRequest('Validation error', details));
    }

    if (source === 'query') {
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
  addBookmarkSchema,
  listBookmarksSchema,
  syncBookmarksSchema,
  bookmarkIdParamSchema,
  validate,
};
