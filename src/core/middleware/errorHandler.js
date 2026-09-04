'use strict';

/**
 * errorHandler — central Express error handling middleware.
 *
 * Must be registered LAST in app.js (after all routes and notFound middleware).
 * Express identifies this as an error handler via the 4-argument signature.
 *
 * Handles:
 *   - ApiError instances         → structured error response
 *   - Prisma P2002 (unique)      → 400 VALIDATION_ERROR
 *   - Prisma P2025 (not found)   → 404 NOT_FOUND
 *   - Joi ValidationError        → 400 VALIDATION_ERROR
 *   - All other errors           → 500 INTERNAL_ERROR (details suppressed in production)
 */

const ApiError = require('../utils/ApiError');
const { sendError } = require('../utils/ApiResponse');
const logger = require('../logger');
const env = require('../../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // --- Already an ApiError ---
  if (err instanceof ApiError) {
    return sendError(res, err);
  }

  // --- Prisma known error codes ---
  if (err.code === 'P2002') {
    // Unique constraint violation
    const field = err.meta?.target?.join(', ') || 'field';
    return sendError(res, ApiError.badRequest(`A record with this ${field} already exists.`));
  }

  if (err.code === 'P2025') {
    // Record not found (e.g. update/delete on non-existent row)
    return sendError(res, ApiError.notFound());
  }

  // --- Joi validation error ---
  if (err.isJoi || (err.name === 'ValidationError' && Array.isArray(err.details))) {
    const details = err.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return sendError(res, ApiError.badRequest('Validation failed.', details));
  }

  // --- Unexpected error ---
  // Log the full error internally; send a generic message to the client.
  logger.error('Unhandled error:', err);

  const apiError = ApiError.internal();

  // In development, attach the stack to the response body for easier debugging.
  if (env.isDevelopment) {
    apiError.stack = err.stack;
  }

  return sendError(res, apiError);
}

module.exports = errorHandler;
