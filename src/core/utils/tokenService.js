'use strict';

/**
 * tokenService — JWT and refresh token helpers.
 *
 * Pure utility — no Prisma, no business logic.
 * Used exclusively by auth.service.
 *
 * Access token:   signed JWT (HS256), payload { sub, is_guest }
 * Refresh token:  opaque 128-char hex string (crypto.randomBytes)
 *                 Never stored raw — only SHA-256(raw) is persisted.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../config/jwt');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Parse a human-readable duration string into milliseconds.
 * Supports: <n>s | <n>m | <n>h | <n>d
 * e.g. '15m' → 900000, '30d' → 2592000000
 *
 * @param {string} str
 * @returns {number} milliseconds
 */
function parseDurationMs(str) {
  const match = String(str).match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`tokenService: cannot parse duration "${str}"`);
  }
  const value = parseInt(match[1], 10);
  const units = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * units[match[2]];
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Sign an access JWT.
 *
 * Payload contains only { sub, is_guest }.
 * iat and exp are added automatically by jsonwebtoken.
 *
 * @param {{ sub: string, is_guest: boolean }} payload
 * @returns {string} signed JWT
 */
function generateAccessToken({ sub, is_guest }) {
  return jwt.sign(
    { sub, is_guest },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn }
  );
}

/**
 * Verify and decode an access JWT.
 *
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {jwt.TokenExpiredError} if token is expired
 * @throws {jwt.JsonWebTokenError} if token is invalid
 */
function verifyAccessToken(token) {
  return jwt.verify(token, jwtConfig.accessSecret);
}

/**
 * Generate an opaque refresh token (128-char hex string).
 * This value is returned to the client ONCE and NEVER stored raw.
 *
 * @returns {string} 128-char hex string
 */
function generateRawRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Produce the SHA-256 hash of a raw refresh token.
 * This hash is what is stored in the database.
 * Deterministic: same input always produces the same output.
 *
 * @param {string} rawToken
 * @returns {string} hex-encoded SHA-256 digest
 */
function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Calculate the absolute expiry Date for a new refresh token.
 * Based on JWT_REFRESH_EXPIRES_IN from env (e.g. '30d').
 *
 * @returns {Date}
 */
function buildRefreshTokenExpiry() {
  return new Date(Date.now() + parseDurationMs(jwtConfig.refreshExpiresIn));
}

/**
 * Sign an admin access JWT.
 *
 * Payload contains { sub, email, role }.
 *
 * @param {{ sub: string, email: string, role: string }} payload
 * @returns {string} signed JWT
 */
function generateAdminAccessToken({ sub, email, role }) {
  return jwt.sign(
    { sub, email, role },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn }
  );
}

/**
 * Sign a business (dealer/distributor) access JWT.
 *
 * Payload contains { sub, email, role, org_id }.
 *
 * @param {{ sub: string, email: string, role: string, org_id: string }} payload
 * @returns {string} signed JWT
 */
function generateBusinessAccessToken({ sub, email, role, org_id }) {
  return jwt.sign(
    { sub, email, role, org_id },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn }
  );
}

module.exports = {
  generateAccessToken,
  generateAdminAccessToken,
  generateBusinessAccessToken,
  verifyAccessToken,
  generateRawRefreshToken,
  hashRefreshToken,
  buildRefreshTokenExpiry,
};

