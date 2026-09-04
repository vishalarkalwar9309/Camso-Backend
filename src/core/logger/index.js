'use strict';

/**
 * Application logger — thin console wrapper.
 *
 * Uses console so there is no additional dependency.
 * This can be replaced with Winston or another logger in a future phase
 * without changing any call sites, because all modules import from here.
 *
 * Log levels: error, warn, info, debug
 * In production, debug messages are suppressed.
 */

const env = require('../../config/env');

const logger = {
  error: (message, ...args) => {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, ...args);
  },

  warn: (message, ...args) => {
    console.warn(`[WARN]  ${new Date().toISOString()} ${message}`, ...args);
  },

  info: (message, ...args) => {
    console.info(`[INFO]  ${new Date().toISOString()} ${message}`, ...args);
  },

  debug: (message, ...args) => {
    if (!env.isProduction) {
      console.debug(`[DEBUG] ${new Date().toISOString()} ${message}`, ...args);
    }
  },
};

module.exports = logger;
