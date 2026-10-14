'use strict';

/**
 * auth.controller — HTTP route handlers for authentication.
 *
 * Controllers:
 *   - Validate input (via middleware — not here)
 *   - Delegate to auth.service
 *   - Map the service result to an HTTP response using ApiResponse
 *   - Contain NO business logic
 */

const authService = require('./auth.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

/**
 * POST /api/v1/auth/guest
 * Returns 201 for a new guest user, 200 for an existing one.
 */
const guest = asyncHandler(async (req, res) => {
  const { statusCode, tokens, user } = await authService.guestSignIn(req.body);
  sendSuccess(res, { ...tokens, user }, statusCode);
});

/**
 * POST /api/v1/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { tokens, user } = await authService.register(req.body);
  sendSuccess(res, { ...tokens, user }, 201);
});

/**
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { tokens, user } = await authService.login(req.body);
  sendSuccess(res, { ...tokens, user });
});

/**
 * POST /api/v1/auth/refresh
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { tokens } = await authService.refresh(req.body);
  sendSuccess(res, tokens);
});

/**
 * POST /api/v1/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout(req.body);
  sendSuccess(res, result, 200);
});

module.exports = { guest, register, login, refreshToken, logout };


