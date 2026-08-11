'use strict';

/**
 * src/core/utils/tokenService.js
 *
 * WHAT THIS FILE DOES:
 *   Provides JWT access/refresh token issuance, verification, rotation,
 *   and revocation. Implements the refresh token rotation + reuse-detection
 *   security pattern documented in the master plan.
 *
 * OVERALL DESIGN:
 *   One token service, used identically by both auth (users) and admin-auth (admins).
 *   The only difference between the two flows is which principal field is set
 *   in the database record (user_id vs admin_user_id).
 *
 * ELEMENTS:
 *   generateTokenPair(payload)          — issues access + refresh token pair
 *   verifyAccessToken(token)            — verifies and decodes an access JWT
 *   verifyRefreshToken(token)           — verifies and decodes a refresh JWT
 *   rotateRefreshToken(rawToken, prisma)— rotation + reuse-detection (DB operation)
 *   revokeAll(principalField, id, prisma) — revokes all tokens for a principal
 *
 * CRITICAL SECURITY PATTERN (master plan Section 7):
 *   Rotation + Reuse Detection:
 *   1. Hash incoming token.
 *   2. Find a non-revoked, non-expired row by hash.
 *   3. If found → revoke it, issue new pair.
 *   4. If not found / already revoked → TOKEN REPLAY ATTACK DETECTED:
 *      revoke ALL active tokens for that principal, force re-login.
 *
 * FINAL OUTPUT:
 *   module.exports = tokenService
 *
 * IMPORTED BY:
 *   src/modules/auth/auth.service.js (Vishal's module)
 *   src/modules/admin-auth/admin-auth.service.js (Aary's module)
 *   src/core/middleware/authGuard.js
 *   src/core/middleware/adminGuard.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 7 (refresh_tokens table)
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { jwtConfig } = require('../../../src/config/jwt');

/**
 * hashToken
 *
 * USE: Hashes a raw refresh token for secure database storage.
 *
 * HOW IT WORKS:
 *   SHA-256 HMAC using the refresh secret as the key.
 *   This ensures the stored hash is useless without the secret,
 *   even if the database is compromised.
 *
 * CONCEPTS: HMAC-SHA256, secure token storage.
 *
 * @param {string} rawToken — the raw refresh token string
 * @returns {string}        — hex-encoded HMAC-SHA256 hash
 */
function hashToken(rawToken) {
  return crypto.createHmac('sha256', jwtConfig.refresh.secret).update(rawToken).digest('hex');
}

/**
 * generateTokenPair
 *
 * USE: Issues a new access + refresh token pair for a principal.
 *
 * HOW IT WORKS:
 *   1. Signs an access JWT (short-lived, HS256) with the access secret.
 *   2. Generates a cryptographically random refresh token string (not a JWT).
 *   3. Returns both tokens and the expiry date for the DB record.
 *
 * CONCEPTS:
 *   JWT signing (jsonwebtoken). crypto.randomBytes for refresh token.
 *   Refresh token is NOT a JWT — it's an opaque random string stored hashed in DB.
 *
 * BEFORE: No tokens exist for this principal.
 * AFTER:  { accessToken, refreshToken, refreshExpiresAt } returned.
 *         Caller (service) must store the hashed refresh token in the DB.
 *
 * @param {object} payload — JWT payload (e.g. { id, role, type: 'ADMIN' })
 * @returns {{ accessToken: string, refreshToken: string, refreshExpiresAt: Date }}
 */
function generateTokenPair(payload) {
  const accessToken = jwt.sign(payload, jwtConfig.access.secret, {
    algorithm: jwtConfig.algorithm,
    expiresIn: jwtConfig.access.expiresIn,
  });

  // Refresh token: opaque random string (not a JWT)
  const refreshToken = crypto.randomBytes(64).toString('hex');

  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + jwtConfig.refresh.expiresDays);

  return { accessToken, refreshToken, refreshExpiresAt };
}

/**
 * verifyAccessToken
 *
 * USE: Verifies and decodes an access JWT.
 *
 * HOW IT WORKS:
 *   jsonwebtoken.verify() validates signature + expiry.
 *   Returns decoded payload on success, null on any failure.
 *
 * CONCEPTS: JWT verification. Never trust an unverified token.
 *
 * IMPORTED BY: src/core/middleware/authGuard.js, adminGuard.js
 *
 * @param {string} token — raw JWT string from Authorization header
 * @returns {object|null} — decoded payload or null
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, jwtConfig.access.secret, {
      algorithms: [jwtConfig.algorithm],
    });
  } catch {
    return null;
  }
}

/**
 * tokenService
 *
 * USE: Exported service object with all token operations.
 *
 * CONTAINS:
 *   generateTokenPair  — issues new token pair
 *   verifyAccessToken  — verifies a JWT
 *   hashToken          — hashes a raw refresh token
 *
 * NOTE: rotateRefreshToken and revokeAll require database access (Prisma).
 *       They are implemented as methods that accept a prisma instance
 *       so this file does NOT import from config/database.js directly.
 *       (Keeping the token utility pure and testable.)
 */
const refreshTokenRepository = require('../../modules/auth/refreshToken.repository');

const tokenService = {
  generateTokenPair,
  verifyAccessToken,
  hashToken,

  /**
   * rotateRefreshToken
   *
   * USE: Performs refresh token rotation with reuse-detection.
   *      Delegates database queries to refreshTokenRepository.
   *
   * HOW IT WORKS:
   *   1. Hashes the incoming raw token.
   *   2. Queries repository for non-revoked, non-expired token by hash.
   *   3. If found → revoke it, issue new pair, create new DB record via repository.
   *   4. If not found / already revoked → REPLAY DETECTED:
   *      revoke ALL active tokens for that principal via repository, throw UNAUTHORIZED.
   *
   * CONCEPTS: Token rotation, reuse detection, JWT security, Repository pattern.
   *
   * @param {string} rawToken            — raw refresh token from client
   * @param {string} principalField      — 'user_id' or 'admin_user_id'
   * @param {object} newPayload          — JWT payload for the new access token
   * @param {object} [prismaClient]      — optional Prisma client instance (passed to repository)
   * @param {string|null} deviceId       — optional device identifier
   * @returns {Promise<{ accessToken: string, refreshToken: string }>}
   * @throws {ApiError} — on invalid/replayed token
   */
  async rotateRefreshToken(rawToken, principalField, newPayload, prismaClient, deviceId = null) {
    const ApiError = require('../utils/ApiError');
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    // Find the active token record via repository
    const existing = await refreshTokenRepository.findActiveByHash(tokenHash, now, prismaClient);

    if (!existing) {
      // Token not found or expired — check if it was a replay (revoked token)
      const revoked = await refreshTokenRepository.findByHash(tokenHash, prismaClient);

      if (revoked) {
        // REPLAY DETECTED — revoke all tokens for this principal
        const principalId = revoked[principalField];
        if (principalId) {
          await refreshTokenRepository.revokeAllForPrincipal(principalField, principalId, now, prismaClient);
        }
        throw ApiError.unauthorized('Refresh token was already used. Please log in again.');
      }

      throw ApiError.unauthorized('Invalid or expired refresh token.');
    }

    // Valid token found — revoke it via repository
    await refreshTokenRepository.revokeById(existing.id, now, prismaClient);

    // Issue new pair
    const { accessToken, refreshToken, refreshExpiresAt } = generateTokenPair(newPayload);
    const newHash = hashToken(refreshToken);

    // Store the new token via repository
    await refreshTokenRepository.createRefreshToken(
      {
        [principalField]: existing[principalField],
        token_hash: newHash,
        expires_at: refreshExpiresAt,
        device_id: deviceId,
      },
      prismaClient,
    );

    return { accessToken, refreshToken };
  },

  /**
   * revokeAll
   *
   * USE: Revokes all active refresh tokens for a principal via refreshTokenRepository.
   *      Called on logout, admin deactivation, and replay detection.
   *
   * @param {string} principalField  — 'user_id' or 'admin_user_id'
   * @param {number} principalId     — the user's or admin's ID
   * @param {object} [prismaClient]  — optional Prisma client instance
   * @returns {Promise<void>}
   */
  async revokeAll(principalField, principalId, prismaClient) {
    await refreshTokenRepository.revokeAllForPrincipal(principalField, principalId, new Date(), prismaClient);
  },
};

module.exports = tokenService;
