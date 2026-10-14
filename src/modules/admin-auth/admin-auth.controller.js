'use strict';

/**
 * admin-auth.controller — Handlers for Admin authentication endpoints.
 */

const service = require('./admin-auth.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

/**
 * POST /api/v1/admin-auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { tokens, admin } = await service.login(req.body);
  sendSuccess(res, { ...tokens, admin }, 200);
});

/**
 * POST /api/v1/admin-auth/refresh
 */
const refresh = asyncHandler(async (req, res) => {
  const { tokens } = await service.refresh(req.body);
  sendSuccess(res, tokens, 200);
});

/**
 * POST /api/v1/admin-auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const result = await service.logout(req.body);
  sendSuccess(res, result, 200);
});

/**
 * GET /api/v1/admin-auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  const admin = await service.getMe(req.user.id);
  sendSuccess(res, admin, 200);
});

module.exports = {
  login,
  refresh,
  logout,
  getMe,
};
