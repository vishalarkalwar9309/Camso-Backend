'use strict';

/**
 * categories.validation — Joi schemas for public and administrative category endpoints.
 */

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

/**
 * Express middleware factory validating request body, query, or params.
 *
 * @param {Joi.Schema} schema
 * @param {'body' | 'query' | 'params'} [source='body']
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

const createCategorySchema = Joi.object({
  name:        Joi.string().trim().min(1).max(100).required(),
  slug:        Joi.string().trim().lowercase().min(1).max(120).optional(),
  parent_id:   Joi.string().trim().allow(null).optional(),
  description: Joi.string().trim().max(1000).allow(null, '').optional(),
  icon_url:    Joi.string().trim().max(500).allow(null, '').optional(),
  banner_url:  Joi.string().trim().max(500).allow(null, '').optional(),
  sort_order:  Joi.number().integer().min(0).default(0).optional(),
  is_active:   Joi.boolean().default(true).optional(),
});

const updateCategorySchema = Joi.object({
  name:        Joi.string().trim().min(1).max(100).optional(),
  slug:        Joi.string().trim().lowercase().min(1).max(120).optional(),
  parent_id:   Joi.string().trim().allow(null).optional(),
  description: Joi.string().trim().max(1000).allow(null, '').optional(),
  icon_url:    Joi.string().trim().max(500).allow(null, '').optional(),
  banner_url:  Joi.string().trim().max(500).allow(null, '').optional(),
  sort_order:  Joi.number().integer().min(0).optional(),
  is_active:   Joi.boolean().optional(),
}).min(1);

const categoryIdParamSchema = Joi.object({
  id: Joi.string().trim().min(1).required(),
});

const categoryProductsQuerySchema = Joi.object({
  page:     Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  sort:     Joi.string().trim().valid('name_asc', 'name_desc', 'newest', 'oldest').default('newest'),
});

module.exports = {
  validate,
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  categoryProductsQuerySchema,
};
