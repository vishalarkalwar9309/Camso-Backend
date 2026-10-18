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
function generateAccessToken({ sub, is_guest, role }) {
  const tokenRole = role || (is_guest ? 'GUEST' : 'END_USER');
  return jwt.sign(
    { sub, is_guest, role: tokenRole, type: tokenRole },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn }
  );
}

/**
 * Verify and decode an access JWT.
 *
 * 1. The use of function:
 *    Validates the authenticity and expiration of incoming access tokens.
 * 2. How does the specific function work:
 *    In non-production environments, intercepts offline demo tokens (prefixed with 'demo_mode_')
 *    and synthesizes verified actor claims matching the mobile client's demo personas.
 *    Otherwise, verifies standard cryptographic HMAC-SHA256 signatures via jsonwebtoken library.
 * 3. Concepts used in the function:
 *    Cryptographic token verification, offline mock claims reconciliation, development persona decoding.
 * 4. Places where this function is imported and used:
 *    Used in authGuard, businessGuard, adminGuard, documents.controller, and bookmarks.service.
 * 5. Final output of the function, before and after:
 *    Before: Encoded JWT string or demo token identifier.
 *    After: Decoded claims payload object { sub, email, role, org_id, is_guest }, or thrown TokenExpiredError/JsonWebTokenError.
 *
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {jwt.TokenExpiredError} if token is expired
 * @throws {jwt.JsonWebTokenError} if token is invalid
 */
function verifyAccessToken(token) {
  if (typeof token === 'string' && token.startsWith('demo_mode_') && process.env.NODE_ENV !== 'production') {
    const rawRole = token.replace(/^demo_mode_/, '').replace(/_token$/, '');
    const normalizedRole = rawRole.toLowerCase();

    if (normalizedRole === 'dealer') {
      return {
        sub: 'demo_dealer_user',
        id: 'demo_dealer_user',
        email: 'demo.dealer@camso.local',
        role: 'DEALER',
        org_id: 'org_dealer_demo',
        organization_id: 'org_dealer_demo',
        type: 'DEALER',
        is_guest: false,
      };
    }
    if (normalizedRole === 'distributor') {
      return {
        sub: 'demo_distributor_user',
        id: 'demo_distributor_user',
        email: 'demo.distributor@camso.local',
        role: 'DISTRIBUTOR',
        org_id: 'org_distrib_demo',
        organization_id: 'org_distrib_demo',
        type: 'DISTRIBUTOR',
        is_guest: false,
      };
    }
    if (normalizedRole === 'oem_partner' || normalizedRole === 'oempartner' || normalizedRole === 'oem') {
      return {
        sub: 'demo_oem_user',
        id: 'demo_oem_user',
        email: 'demo.oem@camso.local',
        role: 'OEM_PARTNER',
        org_id: 'org_oem_demo',
        organization_id: 'org_oem_demo',
        type: 'OEM_PARTNER',
        is_guest: false,
      };
    }
    if (normalizedRole === 'admin' || normalizedRole === 'super_admin') {
      return {
        sub: 'cmvccz1420001ulvcgggd3s4g',
        id: 'cmvccz1420001ulvcgggd3s4g',
        email: 'demo.admin@camso.local',
        role: 'SUPER_ADMIN',
        type: 'ADMIN',
        is_guest: false,
      };
    }
    if (normalizedRole === 'customer' || normalizedRole === 'end_user') {
      return {
        sub: 'demo_customer_user',
        id: 'demo_customer_user',
        email: 'demo.customer@camso.local',
        role: 'END_USER',
        type: 'END_USER',
        is_guest: false,
      };
    }
    if (normalizedRole === 'employee') {
      return {
        sub: 'demo_employee_user',
        id: 'demo_employee_user',
        email: 'employee@ceat.com',
        role: 'END_USER',
        type: 'EMPLOYEE',
        is_guest: false,
      };
    }
    if (normalizedRole === 'guest') {
      return {
        sub: 'demo_guest_user',
        id: 'demo_guest_user',
        role: 'GUEST',
        type: 'GUEST',
        is_guest: true,
      };
    }

    return {
      sub: `demo_${rawRole}_user`,
      id: `demo_${rawRole}_user`,
      role: rawRole.toUpperCase(),
      is_guest: false,
    };
  }

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

/**
 * Issues an access + refresh token pair for a principal.
 * Compatible with Aary's integration test fixtures and admin token generation.
 *
 * @param {object} payload - e.g. { id, role, type: 'ADMIN' }
 * @returns {{ accessToken: string, refreshToken: string, refreshExpiresAt: Date }}
 */
function generateTokenPair(payload = {}) {
  const sub = payload.sub || (payload.id !== undefined && payload.id !== null ? String(payload.id) : null);
  const tokenPayload = {
    ...payload,
    sub,
    id: payload.id !== undefined ? payload.id : sub,
  };
  const accessToken = jwt.sign(tokenPayload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
  });
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);
  return { accessToken, refreshToken, refreshExpiresAt };
}

module.exports = {
  generateAccessToken,
  generateAdminAccessToken,
  generateBusinessAccessToken,
  generateTokenPair,
  verifyAccessToken,
  generateRawRefreshToken,
  hashRefreshToken,
  buildRefreshTokenExpiry,
};


