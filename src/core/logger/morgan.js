'use strict';

/**
 * Morgan HTTP access log middleware.
 *
 * Uses 'dev' format in development (coloured, concise)
 * and 'combined' format in production (Apache-style, suitable for log aggregation).
 *
 * Morgan is already installed — no additional dependency needed.
 */

const morgan = require('morgan');
const env = require('../../config/env');

const morganMiddleware = morgan(env.isProduction ? 'combined' : 'dev');

module.exports = morganMiddleware;
