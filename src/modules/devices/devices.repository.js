'use strict';

/**
 * 1. What this file does:
 *    Executes database persistence operations for mobile client device registration and token lifecycle.
 * 2. Overall design:
 *    Prisma repository layer isolating database queries for the user_devices table with foreign key guards.
 * 3. Elements in the file:
 *    - upsertDevice: Registers or updates active mobile devices.
 *    - getDeviceById: Retrieves device by device_id.
 *    - deactivateDevice: Marks device as inactive on logout.
 * 4. Final output of the file:
 *    Persisted UserDevice entities or database operation results.
 */

const prisma = require('../../config/database');

/**
 * 1. The use of function:
 *    Upserts a device record by client-supplied device_id with safe user foreign key validation.
 * 2. How does the specific function work:
 *    Checks if user_id exists in the users table to prevent foreign key violations for business/admin personas,
 *    then executes Prisma upsert setting platform, optional fcm_token, app_version, and last_seen_at.
 * 3. Concepts used in the function:
 *    Foreign key defense, tenant scoping, Prisma upsert.
 * 4. Places where this function is imported and used:
 *    Used in devices.service.js registerDevice.
 * 5. Final output of the function, before and after:
 *    Before: Throws 500 foreign key constraint violation on non-standard users; After: Persists UserDevice safely.
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
  let validUserId = null;
  if (user_id) {
    const existingUser = await prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true },
    });
    if (existingUser) {
      validUserId = existingUser.id;
    }
  }

  return prisma.userDevice.upsert({
    where: { device_id },
    update: {
      user_id: validUserId,
      platform,
      ...(fcm_token !== undefined && { fcm_token }),
      ...(app_version !== undefined && { app_version }),
      is_active: true,
      last_seen_at: new Date(),
    },
    create: {
      device_id,
      user_id: validUserId,
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
