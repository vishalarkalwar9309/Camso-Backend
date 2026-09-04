'use strict';

/**
 * users.controller — HTTP route handlers for user profile endpoints.
 *
 * Identity is read from req.user.id (set by authGuard from verified JWT).
 * req.body, req.query, req.params are never used to determine identity.
 */

const usersService = require('./users.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

/**
 * GET /api/v1/users/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await usersService.getMe(req.user.id);
  sendSuccess(res, user);
});

/**
 * PATCH /api/v1/users/me
 */
const updateMe = asyncHandler(async (req, res) => {
  const user = await usersService.updateMe(req.user.id, req.body);
  sendSuccess(res, user);
});

module.exports = { getMe, updateMe };
