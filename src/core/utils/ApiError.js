'use strict';

/**
 * src/core/utils/ApiError.js
 *
 * WHAT THIS FILE DOES:
 *   Defines the ApiError class used to signal operational errors throughout the backend.
 *   ApiError instances are caught by errorHandler.js and formatted into
 *   the standard error response shape.
 *
 * OVERALL DESIGN:
 *   All deliberate error conditions (validation failures, not-found, unauthorized, etc.)
 *   are thrown as ApiError instances. Unexpected errors (programming errors, crashes)
 *   are caught as generic Errors and formatted by the error handler.
 *
 * ELEMENTS:
 *   ApiError class    — extends Error, adds statusCode, type, details
 *   Static factories  — notFound(), unauthorized(), forbidden(), validation(), internal()
 *
 * ERROR RESPONSE SHAPE (from master plan Section 8):
 *   { success: false, error: { type, message, details } }
 *   type ∈ VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | INTERNAL_ERROR
 *
 * FINAL OUTPUT:
 *   module.exports = ApiError
 *
 * IMPORTED BY:
 *   All *.service.js files (throw ApiError on business rule violations)
 *   All *.controller.js files (throw ApiError for request-level errors)
 *   src/core/middleware/errorHandler.js (catches and formats ApiError)
 *   src/core/middleware/authGuard.js, adminGuard.js, requireRole.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8 (Error conventions)
 */

/**
 * ApiError
 *
 * USE: Represents an expected, operational API error.
 *      Thrown in services and controllers; caught by errorHandler.
 *
 * CONTAINS:
 *   statusCode — HTTP status code to send
 *   type       — error type string from the documented enum
 *   message    — human-readable error description
 *   details    — optional extra info (e.g. Joi validation details)
 *   isOperational — true, signals this is an expected error (not a crash)
 *
 * TECHNOLOGIES: ES6 class extending Error.
 *
 * KEY DESIGN:
 *   isOperational=true lets the error handler distinguish expected errors
 *   (return JSON) from unexpected programming errors (log stack, return 500).
 */
class ApiError extends Error {
  /**
   * constructor
   *
   * USE: Creates an operational API error.
   *
   * @param {number} statusCode — HTTP status code
   * @param {string} type       — error type enum string
   * @param {string} message    — error message
   * @param {*} details         — optional validation details
   */
  constructor(statusCode, type, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    this.isOperational = true;

    // Capture stack trace excluding this constructor frame.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  // ─── Static factories ──────────────────────────────────────────────────────

  /**
   * notFound
   * USE: 404 resource not found error.
   * @param {string} message
   * @returns {ApiError}
   */
  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  /**
   * unauthorized
   * USE: 401 authentication required or token invalid.
   * @param {string} message
   * @returns {ApiError}
   */
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  /**
   * forbidden
   * USE: 403 authenticated but insufficient role/permission.
   * @param {string} message
   * @returns {ApiError}
   */
  static forbidden(message = 'Insufficient permissions') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  /**
   * validation
   * USE: 422 request data failed validation.
   * @param {string} message
   * @param {*} details — Joi validation details or similar
   * @returns {ApiError}
   */
  static validation(message = 'Validation failed', details = null) {
    return new ApiError(422, 'VALIDATION_ERROR', message, details);
  }

  /**
   * internal
   * USE: 500 unexpected internal error (use sparingly — prefer specific factories).
   * @param {string} message
   * @returns {ApiError}
   */
  static internal(message = 'Internal server error') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }

  /**
   * conflict
   * USE: 409 conflict (e.g. duplicate unique key).
   * @param {string} message
   * @returns {ApiError}
   */
  static conflict(message = 'Resource conflict') {
    return new ApiError(409, 'CONFLICT', message);
  }
}

module.exports = ApiError;
