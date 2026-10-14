'use strict';

/**
 * devices.repository — Prisma operations for the devices module.
 *
 * IMPORTANT: Only this file imports Prisma for the devices module.
 */

const prisma = require('../../config/database');

/**
 * Upsert a device record by client-supplied device_id.
 *
 * If device exists, updates user_id, platform, optional fcm_token,
 * app_version, reactivates (is_active: true), and updates last_seen_at.
 * If device does not exist, creates a new UserDevice record.
 *
 * @param {{
 *   device_id: string,
 *   user_id: string,
 *   platform: 'ANDROID' | 'IOS',
 *   fcm_token?: string | null,
 *   app_version?: string | null
 * }} data
 * @returns {Promise<import('@prisma/client').UserDevice>}
 */
async function upsertDevice({ device_id, user_id, platform, fcm_token, app_version }) {
  return prisma.userDevice.upsert({
    where: { device_id },
    update: {
      user_id,
      platform,
      ...(fcm_token !== undefined && { fcm_token }),
      ...(app_version !== undefined && { app_version }),
      is_active: true,
      last_seen_at: new Date(),
    },
    create: {
      device_id,
      user_id,
      platform,
      fcm_token: fcm_token ?? null,
      app_version: app_version ?? null,
      is_active: true,
      last_seen_at: new Date(),
    },
  });
}

/**
 * Find a device record by primary key `id` or client-supplied `device_id`.
 *
 * @param {string} id - cuid PK or unique device_id string
 * @returns {Promise<import('@prisma/client').UserDevice | null>}
 */
async function findDeviceById(id) {
  const byId = await prisma.userDevice.findUnique({ where: { id } });
  if (byId) return byId;
  return prisma.userDevice.findUnique({ where: { device_id: id } });
}

/**
 * Deactivate a device (soft-delete via is_active = false).
 *
 * @param {string} id - cuid PK
 * @returns {Promise<import('@prisma/client').UserDevice>}
 */
async function deactivateDevice(id) {
  return prisma.userDevice.update({
    where: { id },
    data: {
      is_active: false,
    },
  });
}

/**
 * Retrieve all devices associated with a specific user.
 *
 * @param {string} userId
 * @returns {Promise<import('@prisma/client').UserDevice[]>}
 */
async function findDevicesByUserId(userId) {
  return prisma.userDevice.findMany({
    where: { user_id: userId },
    orderBy: { last_seen_at: 'desc' },
  });
}

module.exports = {
  upsertDevice,
  findDeviceById,
  deactivateDevice,
  findDevicesByUserId,
};
