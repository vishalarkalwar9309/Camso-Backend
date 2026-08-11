'use strict';

/**
 * src/modules/auth/refreshToken.repository.js
 *
 * WHAT THIS FILE DOES:
 *   Repository module for database operations on the refresh_tokens table.
 *   Provides data access methods for lookup, creation, rotation revocation, and full principal revocation.
 *
 * OVERALL DESIGN:
 *   Follows the 5-tier architecture (Repositories are the ONLY layer that calls Prisma).
 *   Encapsulates all Prisma queries targeting refresh_tokens.
 *   Accepts an optional `prismaClient` parameter to support transaction or mock scopes.
 *
 * ELEMENTS IN THIS FILE:
 *   - findActiveByHash(tokenHash, now, prismaClient)
 *   - findByHash(tokenHash, prismaClient)
 *   - revokeById(id, now, prismaClient)
 *   - revokeAllForPrincipal(principalField, principalId, now, prismaClient)
 *   - createRefreshToken(data, prismaClient)
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing database query methods for refresh_tokens.
 *
 * IMPORTED BY:
 *   src/core/utils/tokenService.js
 *   src/modules/auth/auth.service.js (Day 2)
 *   src/modules/admin-auth/admin-auth.service.js (Day 2)
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 7 (refresh_tokens table)
 */

const { prisma } = require('../../config/database');

/**
 * refreshTokenRepository
 *
 * USE: Data access layer for refresh_tokens database table.
 *
 * KEY DESIGN:
 *   Handles all database read/write queries for refresh tokens.
 *   Does NOT perform token hashing, JWT verification, or payload construction.
 */
const refreshTokenRepository = {
  /**
   * findActiveByHash
   *
   * USE: Finds a non-revoked, non-expired refresh token by its hash.
   *
   * @param {string} tokenHash — HMAC-SHA256 hash of the refresh token
   * @param {Date} [now=new Date()] — reference date for expiration check
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<object|null>}
   */
  async findActiveByHash(tokenHash, now = new Date(), prismaClient = prisma) {
    return prismaClient.refreshToken.findFirst({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
        expires_at: { gt: now },
      },
    });
  },

  /**
   * findByHash
   *
   * USE: Finds any refresh token record by its hash (used to detect replay attacks).
   *
   * @param {string} tokenHash — HMAC-SHA256 hash
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<object|null>}
   */
  async findByHash(tokenHash, prismaClient = prisma) {
    return prismaClient.refreshToken.findFirst({
      where: { token_hash: tokenHash },
    });
  },

  /**
   * revokeById
   *
   * USE: Marks a specific refresh token as revoked at timestamp `now`.
   *
   * @param {number} id — refresh_tokens integer primary key
   * @param {Date} [now=new Date()] — revocation timestamp
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<object>}
   */
  async revokeById(id, now = new Date(), prismaClient = prisma) {
    return prismaClient.refreshToken.update({
      where: { id },
      data: { revoked_at: now },
    });
  },

  /**
   * revokeAllForPrincipal
   *
   * USE: Revokes all active refresh tokens for a given user or admin ID.
   *
   * @param {string} principalField — 'user_id' or 'admin_user_id'
   * @param {number} principalId — ID of the user or admin
   * @param {Date} [now=new Date()] — revocation timestamp
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<object>}
   */
  async revokeAllForPrincipal(principalField, principalId, now = new Date(), prismaClient = prisma) {
    return prismaClient.refreshToken.updateMany({
      where: {
        [principalField]: principalId,
        revoked_at: null,
      },
      data: { revoked_at: now },
    });
  },

  /**
   * createRefreshToken
   *
   * USE: Inserts a new refresh token record into the database.
   *
   * @param {object} data — { user_id, admin_user_id, token_hash, expires_at, device_id }
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<object>}
   */
  async createRefreshToken(data, prismaClient = prisma) {
    return prismaClient.refreshToken.create({ data });
  },
};

module.exports = refreshTokenRepository;
