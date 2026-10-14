'use strict';

/**
 * admin-users.controller — Handlers for Admin User management & Organization approvals.
 */

const service = require('./admin-users.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

const createAdmin = asyncHandler(async (req, res) => {
  const result = await service.createAdminUser(req.user, req.body);
  sendSuccess(res, result, 201);
});

const listAdmins = asyncHandler(async (req, res) => {
  const { items, pagination } = await service.listAdminUsers(req.query);
  sendSuccess(res, items, 200, pagination);
});

const updateAdminStatus = asyncHandler(async (req, res) => {
  const result = await service.updateAdminStatus(req.user, req.params.id, req.body);
  sendSuccess(res, result, 200);
});

const listOrganizations = asyncHandler(async (req, res) => {
  const { items, pagination } = await service.listOrganizations(req.query);
  sendSuccess(res, items, 200, pagination);
});

const updateOrganizationApproval = asyncHandler(async (req, res) => {
  const result = await service.updateOrganizationApproval(req.user, req.params.id, req.body);
  sendSuccess(res, result, 200);
});

module.exports = {
  createAdmin,
  listAdmins,
  updateAdminStatus,
  listOrganizations,
  updateOrganizationApproval,
};
