'use strict';

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

const addBookmarkSchema = Joi.object({
  target_type: Joi.string().valid('PRODUCT', 'DOCUMENT', 'TESTIMONIAL').default('PRODUCT'),
  product_id: Joi.string().trim().optional(),
  document_id: Joi.string().trim().optional(),
  testimonial_id: Joi.string().trim().optional(),
  target_id: Joi.string().trim().optional(),
  device_id: Joi.string().trim().max(100).optional().messages({
    'string.max': 'device_id cannot exceed 100 characters.',
  }),
}).or('product_id', 'document_id', 'testimonial_id', 'target_id').messages({
  'object.missing': 'product_id is required.',
});

const listBookmarksSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  device_id: Joi.string().trim().max(100).optional(),
  target_type: Joi.string().valid('ALL', 'PRODUCT', 'DOCUMENT', 'TESTIMONIAL').default('ALL'),
  sort: Joi.string().valid('asc', 'desc').default('desc'),
});

const syncBookmarksSchema = Joi.object({
  guest_token: Joi.string().trim().optional().messages({
    'string.empty': 'guest_token cannot be empty.',
  }),
  device_id: Joi.string().trim().max(100).optional().messages({
    'string.max': 'device_id cannot exceed 100 characters.',
  }),
  product_ids: Joi.array().items(Joi.string().trim()).optional(),
  bookmark_ids: Joi.array().items(Joi.string().trim()).optional(),
  items: Joi.array().items(Joi.any()).optional(),
}).or('guest_token', 'product_ids', 'bookmark_ids', 'device_id').messages({
  'object.missing': 'guest_token is required to verify the source guest session.',
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
