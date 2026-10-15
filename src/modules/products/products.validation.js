'use strict';

/**
 * products.validation — Joi schemas for public and administrative product endpoints.
 */

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

/**
 * Express middleware factory validating request body, query, or params.
 *
 * @param {Joi.Schema} schema
 * @param {'body' | 'query' | 'params'} [source='body']
 * @param {boolean} [allowUnknown=false]
 * @returns {import('express').RequestHandler}
 */
function validate(schema, source = 'body', allowUnknown = false) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: !allowUnknown,
      allowUnknown,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(ApiError.badRequest('Validation failed.', details));
    }

    if (source === 'query' && req.query && typeof req.query === 'object') {
      for (const k of Object.keys(req.query)) {
        if (!allowUnknown && !(k in value)) {
          delete req.query[k];
        }
      }
      Object.assign(req.query, value);
    } else {
      req[source] = value;
    }
    next();
  };
}

const listProductsQuerySchema = Joi.object({
  category: Joi.string().trim().optional(),
  q:        Joi.string().trim().max(100).optional(),
  page:     Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  sort:     Joi.string().trim().valid('name_asc', 'name_desc', 'newest', 'oldest', 'pid_asc').default('newest'),
}).unknown(true); // Allow dynamic spec_<key>=<value> query parameters

const createProductSchema = Joi.object({
  pid:         Joi.string().trim().uppercase().min(1).max(50).required(),
  category_id: Joi.string().trim().min(1).required(),
  name:        Joi.string().trim().min(1).max(150).required(),
  slug:        Joi.string().trim().lowercase().min(1).max(180).optional(),
  description: Joi.string().trim().max(2000).allow(null, '').optional(),
  is_active:   Joi.boolean().default(true).optional(),
  specifications: Joi.array().items(
    Joi.object({
      spec_type:     Joi.string().valid('SPECIFICATION', 'DIMENSION', 'PERFORMANCE').default('SPECIFICATION'),
      spec_key:      Joi.string().trim().min(1).max(100).required(),
      spec_value:    Joi.string().trim().min(1).max(255).required(),
      unit:          Joi.string().trim().max(30).allow(null, '').optional(),
      is_filterable: Joi.boolean().default(false).optional(),
      sort_order:    Joi.number().integer().default(0).optional(),
    })
  ).optional(),
});

const updateProductSchema = Joi.object({
  category_id: Joi.string().trim().min(1).optional(),
  name:        Joi.string().trim().min(1).max(150).optional(),
  slug:        Joi.string().trim().lowercase().min(1).max(180).optional(),
  description: Joi.string().trim().max(2000).allow(null, '').optional(),
  is_active:   Joi.boolean().optional(),
}).min(1);

const attachImageSchema = Joi.object({
  url:            Joi.string().trim().min(1).max(500).required(),
  media_asset_id: Joi.string().trim().allow(null).optional(),
  sort_order:     Joi.number().integer().min(0).default(0).optional(),
  is_primary:     Joi.boolean().default(false).optional(),
});

const productIdParamSchema = Joi.object({
  idOrSlug: Joi.string().trim().min(1).optional(),
  id:       Joi.string().trim().min(1).optional(),
}).or('idOrSlug', 'id');

module.exports = {
  validate,
  listProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
  attachImageSchema,
  productIdParamSchema,
};
