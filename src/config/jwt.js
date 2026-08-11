'use strict';

/**
 * src/config/jwt.js
 *
 * WHAT THIS FILE DOES:
 *   JWT configuration and helper functions used by tokenService.js.
 *   Provides a clean boundary for JWT algorithm, secret, and expiry configuration.
 *
 * OVERALL DESIGN:
 *   Token signing and verification configuration is centralized here.
 *   tokenService.js uses these config values exclusively.
 *   No JWT logic is defined here — only configuration constants.
 *
 * ELEMENTS:
 *   jwtConfig  — algorithm, access secret, refresh secret, expiry settings
 *
 * FINAL OUTPUT:
 *   module.exports = { jwtConfig }
 *
 * IMPORTED BY:
 *   src/core/utils/tokenService.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 2 (Auth: jsonwebtoken)
 *            docs/CAMSO_Backend_Plan.md Section 7 (refresh_tokens table)
 */

const config = require('./index');

/**
 * jwtConfig
 *
 * USE: Configuration object for JWT operations.
 *
 * FIELDS:
 *   algorithm         — signing algorithm (HS256 is standard for shared-secret JWT)
 *   access.secret     — secret for signing access tokens
 *   access.expiresIn  — access token lifetime string (e.g. "15m")
 *   refresh.secret    — separate secret for refresh tokens (different from access)
 *   refresh.expiresDays — refresh token lifetime in days (for DB record expiry)
 */
const jwtConfig = Object.freeze({
  algorithm: 'HS256',
  access: {
    secret: config.jwt.accessSecret || 'dev-jwt-access-secret-fallback-key-32bytes!',
    expiresIn: config.jwt.accessExpiresIn || '15m',
  },
  refresh: {
    secret: config.jwt.refreshSecret || 'dev-jwt-refresh-secret-fallback-key-32bytes!',
    expiresDays: config.jwt.refreshExpiresDays || 30,
  },
});

module.exports = { jwtConfig };
