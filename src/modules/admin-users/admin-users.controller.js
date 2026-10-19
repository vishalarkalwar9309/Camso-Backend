'use strict';

/**
 * admin-users.controller — Handlers for Admin User management & Organization approvals.
 */

const service = require('./admin-users.service');
const ApiResponse = require('../../core/utils/ApiResponse');
const ApiError = require('../../core/utils/ApiError');
const asyncHandler = require('../../core/utils/asyncHandler');
const { validateCuid } = require('../../core/utils/idValidation');

const VALID_ROLES = ['SUPER_ADMIN', 'CONTENT_ADMIN', 'MARKETING', 'VIEWER'];

const createAdmin = asyncHandler(async (req, res) => {
  const { role, password } = req.body || {};
  if (role && !VALID_ROLES.includes(role)) {
    throw ApiError.validation(`role must be one of: ${VALID_ROLES.join(', ')}.`);
  }
  if (password && password.length < 8) {
    throw ApiError.validation('password must be at least 8 characters.');
  }

  const result = await service.createAdminUser(req.user || req.admin, req.body);
  ApiResponse.sendSuccess(res, result, 201);
});

const listAdmins = asyncHandler(async (req, res) => {
  const { items, pagination, data } = await service.listAdminUsers(req.query);
  ApiResponse.sendSuccess(res, items || data, 200, pagination);
});

const getAdminById = asyncHandler(async (req, res) => {
  const id = validateCuid(req.params.id);
  const adminUser = await service.getAdminUserById(id);
  ApiResponse.sendSuccess(res, adminUser, 200);
});

const updateAdmin = asyncHandler(async (req, res) => {
  const id = validateCuid(req.params.id);
  const { role } = req.body || {};
  if (role !== undefined && !VALID_ROLES.includes(role)) {
    throw ApiError.validation(`Invalid role. Allowed roles: ${VALID_ROLES.join(', ')}`);
  }
  const result = await service.updateAdminUser(id, req.body, req.auditContext || {});
  ApiResponse.sendSuccess(res, result, 200);
});

const updateAdminStatus = asyncHandler(async (req, res) => {
  const result = await service.updateAdminStatus(req.user || req.admin, req.params.id, req.body);
  ApiResponse.sendSuccess(res, result, 200);
});

const listOrganizations = asyncHandler(async (req, res) => {
  const { items, pagination } = await service.listOrganizations(req.query);
  ApiResponse.sendSuccess(res, items, 200, pagination);
});

const updateOrganizationApproval = asyncHandler(async (req, res) => {
  const result = await service.updateOrganizationApproval(req.user || req.admin, req.params.id, req.body);
  ApiResponse.sendSuccess(res, result, 200);
});

const revokeSessions = asyncHandler(async (req, res) => {
  const result = await service.revokeAdminSessions(req.user || req.admin, req.params.id);
  ApiResponse.sendSuccess(res, result, 200);
});

const adminUsersController = {
  createAdmin,
  create: createAdmin,
  listAdmins,
  list: listAdmins,
  getAdminById,
  getById: getAdminById,
  updateAdmin,
  update: updateAdmin,
  updateAdminStatus,
  revokeSessions,
  listOrganizations,
  updateOrganizationApproval,
};

module.exports = adminUsersController;
