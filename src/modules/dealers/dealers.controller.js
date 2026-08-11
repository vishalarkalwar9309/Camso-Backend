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
 *   locator         — handles GET /api/v1/dealers/locator
 *   csrContact      — handles GET /api/v1/dealers/csr-contact
 *   adminList       — handles GET /api/v1/admin/dealers
 *   adminGetById    — handles GET /api/v1/admin/dealers/:id
 *   adminCreate     — handles POST /api/v1/admin/dealers
 *   adminUpdate     — handles PATCH /api/v1/admin/dealers/:id
 *
 * FINAL OUTPUT:
 *   module.exports = dealersController
 *
 * IMPORTED BY:
 *   dealers.routes.js
 *   dealers.admin.routes.js
 */

const dealersService = require('./dealers.service');
const ApiResponse = require('../../core/utils/ApiResponse');
const ApiError = require('../../core/utils/ApiError');

const dealersValidation = require('./dealers.validation');

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
  },

  /**
   * adminList
   * USE: Express handler for GET /api/v1/admin/dealers.
   * Lists all dealers (including inactive) with filtering and pagination.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminList(req, res) {
    const filters = dealersValidation.validateAdminListQuery(req.query);
    const { dealers, pagination } = await dealersService.adminListDealers(filters, req.query);
    return ApiResponse.paginated(res, dealers, pagination);
  },

  /**
   * adminGetById
   * USE: Express handler for GET /api/v1/admin/dealers/:id.
   * Fetches a single dealer by ID regardless of is_active status.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminGetById(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw ApiError.validation('Invalid dealer ID.');
    const dealer = await dealersService.adminGetDealerById(id);
    return ApiResponse.success(res, dealer);
  },

  /**
   * adminCreate
   * USE: Express handler for POST /api/v1/admin/dealers.
   * Creates a new dealer record. Audited via auditContext.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminCreate(req, res) {
    const data = dealersValidation.validateCreateDealer(req.body);
    const dealer = await dealersService.adminCreateDealer(data, req.auditContext);
    return ApiResponse.success(res, dealer, 201);
  },

  /**
   * adminUpdate
   * USE: Express handler for PATCH /api/v1/admin/dealers/:id.
   * Updates dealer fields including is_active soft-deactivation. Audited.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminUpdate(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw ApiError.validation('Invalid dealer ID.');
    const data = dealersValidation.validateUpdateDealer(req.body);
    const dealer = await dealersService.adminUpdateDealer(id, data, req.auditContext);
    return ApiResponse.success(res, dealer);
  },
};

module.exports = dealersController;
