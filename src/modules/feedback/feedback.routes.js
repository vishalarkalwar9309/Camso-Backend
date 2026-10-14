'use strict';

/**
 * src/modules/feedback/feedback.routes.js
 *
 * WHAT THIS FILE DOES:
 *   Express router for feedback module.
 *
 * OVERALL DESIGN:
 *   Maps POST / to controller.
 *   Requires JWT authentication via authGuard.
 *   Validates body via Joi.
 *
 * ELEMENTS:
 *   router.post('/', ...)
 *
 * FINAL OUTPUT:
 *   module.exports = router
 *
 * IMPORTED BY:
 *   Auto-mounted by src/routes/index.js
 */

const express = require('express');
const router = express.Router();

const feedbackController = require('./feedback.controller');
const feedbackValidation = require('./feedback.validation');
const asyncHandler = require('../../core/utils/asyncHandler');
const authGuard = require('../../core/middleware/authGuard');
const ApiError = require('../../core/utils/ApiError');

// Middleware to validate req.body using Joi
const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errorMessage = error.details.map((d) => d.message).join(', ');
    return next(ApiError.badRequest(`Validation error: ${errorMessage}`));
  }
  req.body = value;
  next();
};

router.post(
  '/',
  authGuard,
  validateBody(feedbackValidation.submitFeedbackSchema),
  asyncHandler(feedbackController.submit)
);

module.exports = router;
