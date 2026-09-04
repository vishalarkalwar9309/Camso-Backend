'use strict';

/**
 * JWT configuration constants.
 *
 * This file exports JWT settings consumed by tokenService (Phase 3)
 * and authGuard middleware (Phase 3). No logic lives here.
 */

const env = require('./env');

module.exports = {
  accessSecret:    env.JWT_ACCESS_SECRET,
  // refreshSecret is intentionally omitted. Refresh tokens are opaque random
  // bytes (SHA-256 hashed and stored in the DB), not signed JWTs. There is
  // no refresh-token secret in the current architecture. If signed refresh
  // JWTs are introduced in a future phase, add refreshSecret here and
  // re-add JWT_REFRESH_SECRET to REQUIRED in env.js.
  accessExpiresIn:  env.JWT_ACCESS_EXPIRES_IN,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
};
