'use strict';

/**
 * src/modules/dealers/dealers.routes.js
 *
 * WHAT THIS FILE DOES:
 *   Express router mapping public endpoints for dealers.
 *
 * OVERALL DESIGN:
 *   Maps GET /locator and GET /csr-contact to their controller handlers.
 *   Applies Joi validation to query parameters.
 *   NO auth required (public endpoints).
 *
 * ELEMENTS:
 *   router.get('/locator', ...)
 *   router.get('/csr-contact', ...)
 *
 * FINAL OUTPUT:
 *   module.exports = router
 *
 * IMPORTED BY:
 *   Auto-mounted by src/routes/index.js
 */

const express = require('express');
const router = express.Router();

const dealersController = require('./dealers.controller');
const dealersValidation = require('./dealers.validation');
const asyncHandler = require('../../core/utils/asyncHandler');

const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errorMessage = error.details.map((d) => d.message).join(', ');
    const ApiError = require('../../core/utils/ApiError');
    return next(ApiError.badRequest(`Validation error: ${errorMessage}`));
  }
  if (req.query && typeof req.query === 'object') {
    for (const k of Object.keys(req.query)) {
      if (!(k in value)) {
        delete req.query[k];
      }
    }
    Object.assign(req.query, value);
  }
  next();
};

router.get(
  '/locator',
  validateQuery(dealersValidation.locatorSchema),
  asyncHandler(dealersController.locator)
);

router.get(
  '/csr-contact',
  validateQuery(dealersValidation.csrContactSchema),
  asyncHandler(dealersController.csrContact)
);

module.exports = router;
