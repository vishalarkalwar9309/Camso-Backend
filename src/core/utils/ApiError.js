'use strict';

/**
 * ApiError — central application error class.
 *
 * All intentional errors thrown in services and repositories should be
 * instances of ApiError. The error handler middleware identifies them
 * by instanceof check and maps them to the correct HTTP response.
 *
 * Error type strings match the API contract defined in the backend plan:
 *   VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | INTERNAL_ERROR
 */

class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} type       - Error type string (see API contract)
   * @param {string} message    - Human-readable message (safe to return to client)
   * @param {Array}  details    - Optional array of field-level validation details
   */
  constructor(statusCode, type, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    // Capture stack in development; omitted from API responses in production
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  // --- Static factory methods ---

  static badRequest(message, details = []) {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Access denied') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static internal(message = 'An unexpected error occurred') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}

module.exports = ApiError;
