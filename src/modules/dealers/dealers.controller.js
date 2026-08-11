'use strict';

/**
 * src/modules/dealers/dealers.controller.js
 *
 * WHAT THIS FILE DOES:
 *   HTTP request handlers for dealers endpoints.
 *
 * OVERALL DESIGN:
 *   Extracts validated query parameters and calls service layer.
 *   Uses ApiResponse for formatting.
 *
 * ELEMENTS:
 *   locator — handles GET /api/v1/dealers/locator
 *   csrContact — handles GET /api/v1/dealers/csr-contact
 *
 * FINAL OUTPUT:
 *   module.exports = dealersController
 *
 * IMPORTED BY:
 *   dealers.routes.js
 */

const dealersService = require('./dealers.service');
const ApiResponse = require('../../core/utils/ApiResponse');
const ApiError = require('../../core/utils/ApiError');

const dealersController = {
  async locator(req, res) {
    const { lat, lng, type, radiusKm } = req.query;
    const dealers = await dealersService.getLocator({ lat, lng, type, radiusKm });
    return ApiResponse.success(res, dealers);
  },

  async csrContact(req, res) {
    const { country } = req.query;
    const contact = await dealersService.getCsrContact({ country });
    if (!contact) {
      throw ApiError.notFound('No CSR contact found for this country.');
    }
    return ApiResponse.success(res, contact);
  }
};

module.exports = dealersController;
