'use strict';

/**
 * devices.service — business logic for device management.
 *
 * Requirements:
 * - Requires authenticated user identity (userId).
 * - Associates device with authenticated user; ignores any user_id in payload.
 * - Handles upsert safely via unique device_id constraint.
 * - Soft-deactivates device (is_active = false).
 * - Enforces device ownership: users can only deactivate their own devices.
 */

const repo = require('./devices.repository');
const ApiError = require('../../core/utils/ApiError');

/**
 * Build a safe device object for client responses.
 *
 * @param {import('@prisma/client').UserDevice} device
 * @returns {object}
 */
function safeDevice(device) {
  return {
    id:           device.id,
    device_id:    device.device_id,
    user_id:      device.user_id,
    platform:     device.platform,
    app_version:  device.app_version,
    fcm_token:    device.fcm_token,
    is_active:    device.is_active,
    last_seen_at: device.last_seen_at,
    created_at:   device.created_at,
    updated_at:   device.updated_at,
  };
}

/**
 * Register or update a device for the authenticated user.
 *
 * @param {string} userId - Authenticated user's ID from JWT payload
 * @param {{
 *   device_id: string,
 *   platform: 'ANDROID' | 'IOS',
 *   fcm_token?: string | null,
 *   app_version?: string | null
 * }} data
 * @returns {Promise<object>} safeDevice
 */
async function registerDevice(userId, data) {
  if (!userId) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const { device_id, platform, fcm_token, app_version } = data;

  const normalizedPlatform = typeof platform === 'string' ? platform.toUpperCase() : platform;

  const device = await repo.upsertDevice({
    device_id,
    user_id: userId,
    platform: normalizedPlatform,
    fcm_token: fcm_token ?? null,
    app_version: app_version ?? null,
  });

  return safeDevice(device);
}

/**
 * Deactivate a device (soft-delete).
 *
 * Enforces ownership: only the user who owns the device can deactivate it.
 *
 * @param {string} userId - Authenticated user's ID from JWT payload
 * @param {string} identifier - Device record cuid PK or device_id
 * @returns {Promise<object>} safeDevice
 */
async function deactivateDevice(userId, identifier) {
  if (!userId) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const device = await repo.findDeviceById(identifier);
  if (!device) {
    throw ApiError.notFound('Device not found.');
  }

  if (device.user_id !== userId) {
    throw ApiError.forbidden('You can only deactivate your own devices.');
  }

  // If already deactivated, return early to avoid unnecessary write
  if (device.is_active === false) {
    return safeDevice(device);
  }

  const deactivated = await repo.deactivateDevice(device.id);
  return safeDevice(deactivated);
}

/**
 * Get all devices associated with the authenticated user.
 *
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function getUserDevices(userId) {
  if (!userId) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const devices = await repo.findDevicesByUserId(userId);
  return devices.map(safeDevice);
}

module.exports = {
  safeDevice,
  registerDevice,
  deactivateDevice,
  getUserDevices,
};
