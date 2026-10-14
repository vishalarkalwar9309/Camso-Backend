'use strict';

/**
 * business-auth.controller — Handlers for Dealer and Distributor authentication endpoints.
 */

const service = require('./business-auth.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const result = await service.register(req.body);
  sendSuccess(res, result, 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  sendSuccess(res, result, 200);
});

const refresh = asyncHandler(async (req, res) => {
  const { tokens } = await service.refresh(req.body);
  sendSuccess(res, tokens, 200);
});

const logout = asyncHandler(async (req, res) => {
  const result = await service.logout(req.body);
  sendSuccess(res, result, 200);
});

const getMe = asyncHandler(async (req, res) => {
  const result = await service.getMe(req.businessUser.id);
  sendSuccess(res, result, 200);
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
};
