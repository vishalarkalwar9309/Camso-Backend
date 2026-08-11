'use strict';

/**
 * src/core/logger/morgan.js
 *
 * WHAT THIS FILE DOES:
 *   Creates and exports the Morgan HTTP access log middleware.
 *   Pipes Morgan output to Winston so all logs flow through one system.
 *
 * OVERALL DESIGN:
 *   Morgan handles HTTP request/response logging (method, URL, status, time).
 *   It writes to a Winston stream rather than stdout directly.
 *   In development: ':method :url :status :response-time ms' (tiny).
 *   In production: 'combined' Apache-style format for access log analysis.
 *
 * ELEMENTS:
 *   morganMiddleware  — configured Morgan middleware instance
 *
 * FINAL OUTPUT:
 *   module.exports = morganMiddleware
 *
 * IMPORTED BY:
 *   src/app.js (mounted as first middleware)
 *
 * SECURITY NOTE:
 *   Morgan's combined format includes query strings. Ensure no sensitive data
 *   is passed as URL query params (JWT/tokens must always be in headers/body).
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 11 (Logging: Morgan HTTP access)
 */

const morgan = require('morgan');
const logger = require('./winston');

/**
 * stream
 *
 * USE: Winston write stream that Morgan pipes its output to.
 *
 * HOW IT WORKS:
 *   Morgan calls stream.write(message) for each request.
 *   We log at 'http' level (below info) so HTTP access logs can be
 *   filtered independently from application logs.
 */
const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

/**
 * morganMiddleware
 *
 * USE: Express middleware for HTTP access logging.
 *
 * HOW IT WORKS:
 *   'dev' format in development (colored, concise).
 *   'combined' format in production (full Apache-style).
 *   Output piped to Winston stream (not stdout directly).
 *   Skips logging for OPTIONS requests (CORS preflight noise reduction).
 *
 * IMPORTED BY: src/app.js
 */
const config = require('../../config/index');

const morganMiddleware = morgan(config.isProduction ? 'combined' : 'dev', {
  stream,
  skip: (req) => req.method === 'OPTIONS',
});

module.exports = morganMiddleware;
