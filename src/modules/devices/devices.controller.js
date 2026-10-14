'use strict';

/**
 * devices.controller — HTTP handlers for device endpoints.
 *
 * Identity is derived exclusively from req.user.id (set by authGuard).
 * Client-supplied user_id in body/query/params is never trusted.
 */

const devicesService = require('./devices.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

/**
 * POST /api/v1/devices
 * Register or update device token and metadata.
 */
const registerDevice = asyncHandler(async (req, res) => {
  const device = await devicesService.registerDevice(req.user.id, req.body);
  sendSuccess(res, device, 200);
});

/**
 * DELETE /api/v1/devices/:id
 * Deactivate a device (soft-delete).
 */
const deactivateDevice = asyncHandler(async (req, res) => {
  const device = await devicesService.deactivateDevice(req.user.id, req.params.id);
  sendSuccess(res, device, 200);
});

/**
 * GET /api/v1/devices
 * List devices belonging to the authenticated user.
 */
const getDevices = asyncHandler(async (req, res) => {
  const devices = await devicesService.getUserDevices(req.user.id);
  sendSuccess(res, devices, 200);
});

module.exports = {
  registerDevice,
  deactivateDevice,
  getDevices,
};
