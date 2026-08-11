'use strict';

/**
 * src/modules/notifications/notifications.validation.js
 *
 * WHAT THIS FILE DOES:
 *   Joi schemas for validating incoming requests to the notifications module.
 *
 * OVERALL DESIGN:
 *   Validates pagination (page, pageSize), sorting, and language.
 *
 * ELEMENTS:
 *   listFeedSchema — validates GET /api/v1/notifications
 *
 * FINAL OUTPUT:
 *   module.exports = { listFeedSchema }
 *
 * IMPORTED BY:
 *   notifications.routes.js
 */

const Joi = require('joi');

const listFeedSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(100).optional(),
  sort: Joi.string().optional(),
  lang: Joi.string().trim().min(2).max(10).optional()
});

module.exports = { listFeedSchema };
