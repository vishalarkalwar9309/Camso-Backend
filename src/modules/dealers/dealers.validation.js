'use strict';

/**
 * src/modules/dealers/dealers.validation.js
 *
 * WHAT THIS FILE DOES:
 *   Joi schemas for validating incoming requests to the dealers module.
 *
 * OVERALL DESIGN:
 *   Validates geographic coordinates (lat/lng) and locator radius.
 *   Validates country code for CSR contact.
 *
 * ELEMENTS:
 *   locatorSchema — validates lat, lng, type, radiusKm
 *   csrContactSchema — validates country
 *
 * FINAL OUTPUT:
 *   module.exports = { locatorSchema, csrContactSchema }
 *
 * IMPORTED BY:
 *   dealers.routes.js
 */

const Joi = require('joi');

const locatorSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  type: Joi.string().valid('DEALER', 'DISTRIBUTOR').optional(),
  radiusKm: Joi.number().positive().max(50000).required() // reasonable upper bound
});

const csrContactSchema = Joi.object({
  country: Joi.string().trim().min(2).max(10).required()
});

module.exports = {
  locatorSchema,
  csrContactSchema
};
