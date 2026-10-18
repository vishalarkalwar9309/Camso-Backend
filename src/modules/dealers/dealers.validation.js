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
 *   locatorSchema           — validates lat, lng, type, radiusKm
 *   csrContactSchema        — validates country
 *   validateAdminListQuery  — validates admin list query params
 *   validateCreateDealer    — validates POST body
 *   validateUpdateDealer    — validates PATCH body
 *
 * FINAL OUTPUT:
 *   module.exports = { locatorSchema, csrContactSchema, validateAdminListQuery, validateCreateDealer, validateUpdateDealer }
 *
 * IMPORTED BY:
 *   dealers.routes.js
 *   dealers.admin.routes.js
 *   dealers.controller.js
 */

const Joi = require('joi');

const locatorSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).optional(),
  lng: Joi.number().min(-180).max(180).optional(),
  type: Joi.string().valid('DEALER', 'DISTRIBUTOR', 'DISTRIBUTOR_HUB').optional(),
  radiusKm: Joi.number().positive().max(50000).optional().default(1000),
  query: Joi.string().trim().max(100).optional(),
  q: Joi.string().trim().max(100).optional(),
});

const csrContactSchema = Joi.object({
  country: Joi.string().trim().min(2).max(10).required()
});

module.exports = {
  locatorSchema,
  csrContactSchema,

  /**
   * validateAdminListQuery
   * USE: Validates admin list GET query params. Allows filtering by type, country, is_active.
   * @param {object} query — req.query
   * @returns {object} — validated filters
   */
  validateAdminListQuery(query) {
    const schema = Joi.object({
      type: Joi.string().valid('DEALER', 'DISTRIBUTOR').optional(),
      country: Joi.string().trim().max(10).optional(),
      is_active: Joi.boolean().optional(),
      page: Joi.number().integer().min(1).optional(),
      pageSize: Joi.number().integer().min(1).max(100).optional(),
      sort: Joi.string().optional(),
    });
    const { error, value } = schema.validate(query, { allowUnknown: false, convert: true });
    if (error) throw require('../../core/utils/ApiError').validation(error.message);
    return value;
  },

  /**
   * validateCreateDealer
   * USE: Validates POST /admin/dealers body. All required dealer fields.
   * @param {object} body — req.body
   * @returns {object} — validated data
   */
  validateCreateDealer(body) {
    const schema = Joi.object({
      name: Joi.string().trim().min(1).max(255).required(),
      type: Joi.string().valid('DEALER', 'DISTRIBUTOR').required(),
      address: Joi.string().trim().max(500).required(),
      city: Joi.string().trim().max(100).required(),
      state: Joi.string().trim().max(100).required(),
      country: Joi.string().trim().max(10).required(),
      geo_lat: Joi.number().min(-90).max(90).required(),
      geo_lng: Joi.number().min(-180).max(180).required(),
      phone: Joi.string().trim().max(50).allow(null, '').optional(),
      email: Joi.string().email({ tlds: { allow: false } }).max(255).allow(null, '').optional(),
      location_url: Joi.string().trim().max(500).allow(null, '').optional(),
      has_csr: Joi.boolean().default(false),
      is_active: Joi.boolean().default(true),
    });
    const { error, value } = schema.validate(body, { allowUnknown: false });
    if (error) throw require('../../core/utils/ApiError').validation(error.message);
    return value;
  },

  /**
   * validateUpdateDealer
   * USE: Validates PATCH /admin/dealers/:id body. All fields optional.
   * @param {object} body — req.body
   * @returns {object} — validated data
   */
  validateUpdateDealer(body) {
    const schema = Joi.object({
      name: Joi.string().trim().min(1).max(255).optional(),
      type: Joi.string().valid('DEALER', 'DISTRIBUTOR').optional(),
      address: Joi.string().trim().max(500).optional(),
      city: Joi.string().trim().max(100).optional(),
      state: Joi.string().trim().max(100).optional(),
      country: Joi.string().trim().max(10).optional(),
      geo_lat: Joi.number().min(-90).max(90).optional(),
      geo_lng: Joi.number().min(-180).max(180).optional(),
      phone: Joi.string().trim().max(50).allow(null, '').optional(),
      email: Joi.string().email({ tlds: { allow: false } }).max(255).allow(null, '').optional(),
      location_url: Joi.string().trim().max(500).allow(null, '').optional(),
      has_csr: Joi.boolean().optional(),
      is_active: Joi.boolean().optional(),
    });
    const { error, value } = schema.validate(body, { allowUnknown: false });
    if (error) throw require('../../core/utils/ApiError').validation(error.message);
    if (!value || Object.keys(value).length === 0) {
      throw require('../../core/utils/ApiError').validation('At least one field is required for update.');
    }
    return value;
  },
};
