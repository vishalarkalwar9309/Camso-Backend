'use strict';

/**
 * src/modules/feedback/feedback.validation.js
 *
 * WHAT THIS FILE DOES:
 *   Joi schemas for validating incoming requests to the feedback module.
 *
 * OVERALL DESIGN:
 *   Validates bucket, rating, comment, product_id according to the contract.
 *
 * ELEMENTS:
 *   submitFeedbackSchema — validates POST payload
 *
 * FINAL OUTPUT:
 *   module.exports = { submitFeedbackSchema }
 *
 * IMPORTED BY:
 *   feedback.routes.js
 */

const Joi = require('joi');
const { cuidOptional } = require('../../core/utils/idValidation');

const submitFeedbackSchema = Joi.object({
  bucket: Joi.string().valid('PRODUCT', 'SERVICE', 'PRICING').required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(2000).allow('', null).optional(),
  product_id: cuidOptional,
});

module.exports = { submitFeedbackSchema };
