'use strict';

/**
 * src/core/logger/winston.js
 *
 * WHAT THIS FILE DOES:
 *   Creates and exports the application-wide Winston logger.
 *   Used for structured application/error logging throughout the backend.
 *
 * OVERALL DESIGN:
 *   One logger instance shared across the application.
 *   Log level is controlled by the LOG_LEVEL environment variable.
 *   In development: colorized console output.
 *   In production: JSON format for log aggregation services.
 *   Sensitive values (passwords, tokens, private keys) must NEVER be logged.
 *
 * ELEMENTS:
 *   logger  — Winston Logger instance
 *
 * FINAL OUTPUT:
 *   module.exports = logger
 *
 * IMPORTED BY:
 *   src/core/logger/morgan.js (HTTP access log stream)
 *   src/core/middleware/errorHandler.js
 *   src/core/services/auditService.js (failed logins → Winston only)
 *   src/server.js (startup/crash logging)
 *   Any module needing structured logging
 *
 * SECURITY NOTE:
 *   Do NOT log: passwords, JWT tokens, refresh tokens, Firebase private keys,
 *   database passwords, API secrets, or personally identifiable information.
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 11 (Logging)
 */

const { createLogger, format, transports } = require('winston');
const config = require('../../config/index');

const { combine, timestamp, errors, json, colorize, printf } = format;

/**
 * developmentFormat
 *
 * USE: Human-readable colorized format for local development.
 *
 * HOW IT WORKS:
 *   Combines timestamp, error stack printing, and a printf formatter
 *   that produces "[timestamp] LEVEL: message" lines.
 */
const developmentFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    let line = `${ts} ${level}: ${message}`;
    if (stack) line += `\n${stack}`;
    if (Object.keys(meta).length > 0) {
      line += ` ${JSON.stringify(meta)}`;
    }
    return line;
  }),
);

/**
 * productionFormat
 *
 * USE: JSON format for production log aggregation (e.g. Datadog, Papertrail).
 *
 * HOW IT WORKS:
 *   Combines timestamp, error stack printing, and JSON serialization.
 *   Each log entry is one JSON object per line.
 */
const productionFormat = combine(timestamp(), errors({ stack: true }), json());

/**
 * logger
 *
 * USE: Singleton Winston logger. Import and use throughout the application.
 *
 * HOW IT WORKS:
 *   - Level: controlled by LOG_LEVEL env var (default: info)
 *   - Development: Console transport with colorized, human-readable output
 *   - Production: Console transport with JSON output (container stdout)
 *
 * CONCEPTS: Winston structured logging, transport pattern.
 *
 * EXAMPLE:
 *   const logger = require('../core/logger/winston');
 *   logger.info('Server started', { port: 4000 });
 *   logger.error('Unhandled error', { error: err.message });
 */
const logger = createLogger({
  level: config.logLevel,
  format: config.isProduction ? productionFormat : developmentFormat,
  transports: [
    new transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

module.exports = logger;
