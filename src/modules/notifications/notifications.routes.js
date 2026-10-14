'use strict';

/**
 * src/modules/notifications/notifications.routes.js
 *
 * WHAT THIS FILE DOES:
 *   Express router mapping public endpoints for notifications.
 *
 * OVERALL DESIGN:
 *   Maps GET / to controller.
 *   NO auth required.
 *
 * ELEMENTS:
 *   router.get('/', ...)
 *
 * FINAL OUTPUT:
 *   module.exports = router
 *
 * IMPORTED BY:
 *   Auto-mounted by src/routes/index.js
 */

const express = require('express');
const router = express.Router();

const notificationsController = require('./notifications.controller');
const notificationsValidation = require('./notifications.validation');
const asyncHandler = require('../../core/utils/asyncHandler');
const ApiError = require('../../core/utils/ApiError');

const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errorMessage = error.details.map((d) => d.message).join(', ');
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
  '/',
  validateQuery(notificationsValidation.listFeedSchema),
  asyncHandler(notificationsController.listFeed)
);

module.exports = router;
