'use strict';

/**
 * src/modules/admin-users/admin-users.controller.js
 *
 * WHAT THIS FILE DOES:
 *   HTTP request handlers for admin-user management (SUPER_ADMIN only).
 *   Validates requests, calls adminUsersService, returns ApiResponse envelopes.
 *
 * OVERALL DESIGN:
 *   Security-critical: these handlers manage who can access the admin system.
 *   password_hash is NEVER returned in any response (enforced at service/repository level).
 *
 * ELEMENTS:
 *   list    — handles GET /api/v1/admin/admin-users
 *   getById — handles GET /api/v1/admin/admin-users/:id
 *   create  — handles POST /api/v1/admin/admin-users
 *   update  — handles PATCH /api/v1/admin/admin-users/:id (role change, deactivation)
 *
 * FINAL OUTPUT:
 *   module.exports = adminUsersController
 *
 * IMPORTED BY:
 *   admin-users.admin.routes.js
 */

const adminUsersService = require('./admin-users.service');
const ApiResponse = require('../../core/utils/ApiResponse');
const ApiError = require('../../core/utils/ApiError');

const adminUsersController = {
  /**
   * list
   * USE: Express handler for GET /api/v1/admin/admin-users.
   * Returns paginated list of all admin accounts. password_hash never returned.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async list(req, res) {
    const { data, pagination } = await adminUsersService.listAdminUsers(req.query);
    return ApiResponse.paginated(res, data, pagination);
  },

  /**
   * getById
   * USE: Express handler for GET /api/v1/admin/admin-users/:id.
   * Returns a single admin user record. password_hash never returned.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async getById(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw ApiError.validation('Invalid admin user ID.');
    const adminUser = await adminUsersService.getAdminUserById(id);
    return ApiResponse.success(res, adminUser);
  },

  /**
   * create
   * USE: Express handler for POST /api/v1/admin/admin-users.
   * Creates a new admin account. Requires email, password, role.
   * password is hashed before storage. password_hash never returned.
   * Audited.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async create(req, res) {
    const adminUser = await adminUsersService.createAdminUser(req.body, req.auditContext);
    return ApiResponse.success(res, adminUser, 201);
  },

  /**
   * update
   * USE: Express handler for PATCH /api/v1/admin/admin-users/:id.
   * Updates admin account (role, is_active). password_hash never returned.
   * Cannot change email or password through this endpoint (by design).
   * Audited.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async update(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw ApiError.validation('Invalid admin user ID.');
    const adminUser = await adminUsersService.updateAdminUser(id, req.body, req.auditContext);
    return ApiResponse.success(res, adminUser);
  },
};

module.exports = adminUsersController;
