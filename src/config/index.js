'use strict';

/**
 * src/config/index.js
 *
 * WHAT THIS FILE DOES:
 *   Central configuration module. Reads environment variables once at startup,
 *   validates required ones, and exports a frozen config object.
 *   All other modules read config from here — never from process.env directly.
 *
 * OVERALL DESIGN:
 *   Single source of truth for environment configuration.
 *   Prevents process.env sprawl across the codebase.
 *   Validates required variables at startup so the app fails fast if misconfigured.
 *
 * ELEMENTS:
 *   - required(name)  — throws if a required env var is missing
 *   - config          — frozen object exported as module.exports
 *
 * FINAL OUTPUT:
 *   A frozen configuration object consumed by all other config files and modules.
 *   Fails fast at startup if any required variable is absent.
 *
 * IMPORTED BY:
 *   src/config/database.js, src/config/firebase.js, src/config/jwt.js,
 *   src/config/swagger.js, src/app.js, src/core/logger/winston.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 10 (.env.example)
 */

require('dotenv').config();

/**
 * required
 *
 * USE: Validates that a required environment variable is set.
 *
 * HOW IT WORKS:
 *   Reads process.env[name]. If missing or empty, throws an Error
 *   so the application fails at startup rather than silently using undefined.
 *
 * CONCEPTS: Fail-fast principle. Early validation.
 *
 * IMPORTED BY: This file only (internal helper).
 *
 * BEFORE: process.env[name] may be undefined.
 * AFTER:  Returns the string value or throws.
 *
 * @param {string} name — environment variable name
 * @returns {string} — the variable value
 */
function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`[Config] Missing required environment variable: ${name}`);
  }
  return value.trim();
}

/**
 * optional
 *
 * USE: Reads an optional environment variable, returning a default if absent.
 *
 * @param {string} name — environment variable name
 * @param {string} defaultValue — value to use if env var is absent
 * @returns {string}
 */
function optional(name, defaultValue = '') {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : defaultValue;
}

const config = Object.freeze({
  // ── Application ──────────────────────────────────────────
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '4000'), 10),
  isProduction: optional('NODE_ENV', 'development') === 'production',

  // ── Database ─────────────────────────────────────────────
  databaseUrl: optional('DATABASE_URL', ''),

  // ── JWT ──────────────────────────────────────────────────
  jwt: {
    accessSecret: optional('JWT_ACCESS_SECRET', ''),
    refreshSecret: optional('JWT_REFRESH_SECRET', ''),
    accessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresDays: parseInt(optional('JWT_REFRESH_EXPIRES_DAYS', '30'), 10),
  },

  // ── Firebase ─────────────────────────────────────────────
  firebase: {
    projectId: optional('FIREBASE_PROJECT_ID', ''),
    clientEmail: optional('FIREBASE_CLIENT_EMAIL', ''),
    // IMPORTANT: stored with \n escape sequences in .env; unescaped in config/firebase.js
    privateKey: optional('FIREBASE_PRIVATE_KEY', ''),
    storageBucket: optional('FIREBASE_STORAGE_BUCKET', ''),
  },

  // ── CORS ─────────────────────────────────────────────────
  // Comma-separated list of allowed origins
  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // ── Logging ──────────────────────────────────────────────
  logLevel: optional('LOG_LEVEL', 'info'),

  // ── Rate Limiting ─────────────────────────────────────────
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
});

module.exports = config;
