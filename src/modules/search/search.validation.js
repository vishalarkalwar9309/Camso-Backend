'use strict';

/**
 * search.validation — Joi schemas for search, recent searches, and popular searches.
 */

const Joi = require('joi');
const ApiError = require('../../core/utils/ApiError');

function validate(schema, source = 'query', allowUnknown = false) {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
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

const searchQuerySchema = Joi.object({
  q:        Joi.string().trim().max(100).optional().allow(''),
  category: Joi.string().trim().max(100).optional(),
  page:     Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

const recentQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const popularQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(20).default(10),
});

module.exports = {
  validate,
  searchQuerySchema,
  recentQuerySchema,
  popularQuerySchema,
};
