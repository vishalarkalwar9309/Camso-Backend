'use strict';

/**
 * Environment configuration.
 *
 * This is the ONLY file that reads process.env directly.
 * All other modules import from this file — never from process.env.
 *
 * The server fails fast if any required variable is missing,
 * so misconfigurations are caught at startup, not at runtime.
 */

// Required at startup — server exits immediately if any of these are missing.
// JWT_REFRESH_SECRET is intentionally excluded: refresh tokens are opaque
// random bytes (SHA-256 hashed), not signed JWTs. No refresh-secret is needed
// in the current architecture. If signed refresh JWTs are ever introduced,
// add JWT_REFRESH_SECRET back here at that time.
const REQUIRED = ['DATABASE_URL', 'JWT_ACCESS_SECRET'];


for (const key of REQUIRED) {
  if (!process.env[key]) {
    // Exit immediately with a clear message — not a thrown error,
    // because the error handler is not yet initialised at this point.
    console.error(`[env] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 4000,

  DATABASE_URL: process.env.DATABASE_URL,

  // JWT secrets — exported here for use by tokenService and authGuard only.
  // Do not log or expose these values.
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,

  get isProduction() {
    return this.NODE_ENV === 'production';
  },

  get isDevelopment() {
    return this.NODE_ENV === 'development';
  },
};

module.exports = env;
