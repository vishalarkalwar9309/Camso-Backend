'use strict';

/**
 * auth.repository — all Prisma operations for the auth module.
 *
 * IMPORTANT: This is the ONLY file in the auth module that imports Prisma.
 * Services and controllers must never import Prisma directly.
 *
 * rotateRefreshToken uses prisma.$transaction to atomically:
 *   1. Revoke the old refresh token (set revoked_at)
 *   2. Create the new refresh token
 * If either operation fails, the entire transaction rolls back and the
 * old token remains valid.
 */

const prisma = require('../../config/database');

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

/**
 * Find a user by email address.
 * Includes password_hash so the caller can verify credentials.
 * Callers must never return password_hash to the client.
 *
 * @param {string} email
 * @returns {Promise<import('@prisma/client').User | null>}
 */
async function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

/**
 * Find a user by their primary key.
 *
 * @param {string} id
 * @returns {Promise<import('@prisma/client').User | null>}
 */
async function findUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

/**
 * Create a guest user (no email, no password).
 *
 * @returns {Promise<import('@prisma/client').User>}
 */
async function createGuestUser() {
  return prisma.user.create({
    data: { is_guest: true },
  });
}

/**
 * Create a registered user.
 *
 * @param {{ email: string, password_hash: string, display_name?: string, preferred_language?: string }} data
 * @returns {Promise<import('@prisma/client').User>}
 */
async function createUser({ email, password_hash, display_name, preferred_language }) {
  return prisma.user.create({
    data: {
      email,
      password_hash,
      display_name: display_name ?? null,
      preferred_language: preferred_language ?? 'en',
      is_guest: false,
    },
  });
}

// ---------------------------------------------------------------------------
// Device
// ---------------------------------------------------------------------------

/**
 * Find a UserDevice by device_id, including the associated User (if any).
 *
 * Returns null if the device is not found.
 * Returns { ...device, user: User | null } if found.
 *
 * @param {string} device_id
 * @returns {Promise<(import('@prisma/client').UserDevice & { user: import('@prisma/client').User | null }) | null>}
 */
async function findDeviceWithUser(device_id) {
  return prisma.userDevice.findUnique({
    where: { device_id },
    include: { user: true },
  });
}

/**
 * Upsert a UserDevice.
 *
 * device_id is @unique, so Prisma upsert is valid.
 * On create: sets platform, user_id, app_version.
 * On update: refreshes user_id, app_version, last_seen_at.
 *
 * @param {{ device_id: string, user_id: string, platform: string, app_version?: string }} data
 * @returns {Promise<import('@prisma/client').UserDevice>}
 */
async function upsertDevice({ device_id, user_id, platform, app_version }) {
  return prisma.userDevice.upsert({
    where: { device_id },
    update: {
      user_id,
      app_version: app_version ?? undefined,
      last_seen_at: new Date(),
    },
    create: {
      device_id,
      user_id,
      platform,
      app_version: app_version ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// RefreshToken
// ---------------------------------------------------------------------------

/**
 * Find a refresh token row by its SHA-256 hash.
 *
 * @param {string} tokenHash - SHA-256(rawToken)
 * @returns {Promise<import('@prisma/client').RefreshToken | null>}
 */
async function findRefreshTokenByHash(tokenHash) {
  return prisma.refreshToken.findUnique({ where: { token_hash: tokenHash } });
}

/**
 * Create a new refresh token row.
 *
 * @param {{ user_id: string, token_hash: string, expires_at: Date, device_id?: string }} data
 * @returns {Promise<import('@prisma/client').RefreshToken>}
 */
async function createRefreshToken({ user_id, token_hash, expires_at, device_id }) {
  return prisma.refreshToken.create({
    data: {
      user_id,
      token_hash,
      expires_at,
      device_id: device_id ?? null,
    },
  });
}

/**
 * Atomically rotate a refresh token.
 *
 * Runs inside a Prisma $transaction:
 *   1. Revoke the old token (set revoked_at = now)
 *   2. Create the new token row
 *
 * If either step fails, the transaction rolls back:
 *   - The old token remains valid (revoked_at stays null).
 *   - No new token is created.
 *
 * @param {{ oldTokenId: string, newTokenData: { user_id: string, token_hash: string, expires_at: Date, device_id?: string } }} params
 * @returns {Promise<[import('@prisma/client').RefreshToken, import('@prisma/client').RefreshToken]>}
 *   [revokedToken, createdToken]
 */
async function rotateRefreshToken({ oldTokenId, newTokenData }) {
  return prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: oldTokenId },
      data: { revoked_at: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        user_id:    newTokenData.user_id,
        token_hash: newTokenData.token_hash,
        expires_at: newTokenData.expires_at,
        device_id:  newTokenData.device_id ?? null,
      },
    }),
  ]);
}

async function revokeRefreshToken(tokenHash) {
  return prisma.refreshToken.updateMany({
    where: { token_hash: tokenHash, revoked_at: null },
    data: { revoked_at: new Date() },
  });
}

module.exports = {
  findUserByEmail,
  findUserById,
  createGuestUser,
  createUser,
  findDeviceWithUser,
  upsertDevice,
  findRefreshTokenByHash,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
};

