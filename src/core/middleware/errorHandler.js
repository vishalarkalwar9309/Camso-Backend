'use strict';

/**
 * src/core/middleware/errorHandler.js
 *
 * WHAT THIS FILE DOES:
 *   Global Express error handling middleware.
 *   Catches all errors forwarded via next(err) and sends standardized JSON responses.
 *
 * OVERALL DESIGN:
 *   All errors in the application flow to this handler.
 *   Two categories:
 *   1. Operational (ApiError.isOperational=true) — format and return JSON.
 *   2. Programming/unexpected errors — log stack, return generic 500.
 *   Stack traces and internal details are NEVER exposed in production responses.
 *
 * ERROR RESPONSE SHAPE (master plan Section 8):
 *   { success: false, error: { type, message, details } }
 *
 * ELEMENTS:
 *   errorHandler(err, req, res, next) — Express 4-argument error middleware
 *
 * FINAL OUTPUT:
 *   module.exports = errorHandler
 *
 * IMPORTED BY:
 *   src/app.js (mounted as the LAST middleware, after all routes)
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8 (Error conventions)
 */

const ApiError = require('../utils/ApiError');
const logger = require('../logger/winston');
const config = require('../../config/index');

/**
 * errorHandler
 *
 * USE: Global Express error middleware. Must have exactly 4 parameters.
 *
 * HOW IT WORKS:
 *   1. Checks if err is an ApiError (isOperational=true).
 *   2. If yes → format and return the structured JSON error response.
 *   3. If no (programming error, DB crash, etc.) → log the full stack,
 *      return a generic 500 without internal details.
 *   4. In development, attaches the stack trace to the response for debugging.
 *
 * CONCEPTS:
 *   Express error middleware (4-parameter signature).
 *   Operational vs programming error distinction.
 *
 * BEFORE: Unhandled error propagated via next(err) or thrown async.
 * AFTER:  Standardized JSON error response sent to client.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next — required even if unused (Express signature)
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'File too large. Maximum size is 50 MB.',
        details: null,
      },
    });
  }

  // Operational error (ApiError)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        type: err.type,
        message: err.message,
        details: err.details || null,
      },
    });
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    // Unique constraint violation
    return res.status(409).json({
      success: false,
      error: {
        type: 'CONFLICT',
        message: 'A record with this data already exists.',
        details: null,
      },
    });
  }

  if (err.code === 'P2025') {
    // Record not found (Prisma update/delete on missing record)
    return res.status(404).json({
      success: false,
      error: {
        type: 'NOT_FOUND',
        message: 'Record not found.',
        details: null,
      },
    });
  }

  // Unexpected / programming error — log full details, send generic 500
  logger.error('[ErrorHandler] Unexpected error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  const response = {
    success: false,
    error: {
      type: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
      details: null,
    },
  };

  // Include stack in development for easier debugging
  if (!config.isProduction) {
    response.error.stack = err.stack;
  }

  return res.status(500).json(response);
}

module.exports = errorHandler;
