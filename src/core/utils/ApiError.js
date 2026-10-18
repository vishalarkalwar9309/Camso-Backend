'use strict';

/**
 * ApiError.js
 *
 * 1. What this file does:
 *    Defines the custom operational error class ApiError used across the application to encapsulate
 *    HTTP status codes, machine-readable error classification types, user-safe messages, and validation details.
 * 2. Overall design:
 *    Extends the native JavaScript Error class. Provides expressive static factory methods for common
 *    HTTP failure archetypes (400, 401, 403, 404, 409, 422, 500) to ensure consistent error contract emission.
 * 3. Elements in the file:
 *    - class ApiError
 *    - static methods: badRequest, validation, unauthorized, forbidden, notFound, conflict, internal
 * 4. Final output of the file:
 *    Exports the ApiError class definition for consumption by middleware, controllers, services, and repositories.
 */

/**
 * ApiError
 *
 * 1. The use of class:
 *    Standardizes operational application errors thrown across the backend stack so that errorHandler middleware
 *    can accurately determine HTTP status codes and structure uniform API error response envelopes.
 * 2. What the class contain:
 *    Properties: statusCode (number), type (string error code), details (array/object/null), isOperational (boolean flag),
 *    and static factory helper methods.
 * 3. Technologies used and why:
 *    JavaScript ES6 Classes and native Error subclassing to preserve stack traces via Error.captureStackTrace
 *    while avoiding unhandled exception crashes.
 * 4. Key design and overall design of the class:
 *    Factory-pattern wrapper over standard Error with explicit operational classification to separate
 *    foreseeable domain/client errors from unanticipated system failures.
 */
class ApiError extends Error {
  /**
   * constructor
   *
   * 1. The use of function:
   *    Instantiates a new operational ApiError with status, machine code, and contextual payload details.
   * 2. How does the specific function work:
   *    Passes message to super(), assigns statusCode, type, details, sets isOperational=true, and captures stack trace.
   * 3. Concepts used in the function:
   *    Inheritance, stack trace capturing, defensive default parameters.
   * 4. Places where this function is imported and used:
   *    Invoked by static factory methods within ApiError and directly in custom domain error scenarios.
   * 5. Final output of the function, before and after:
   *    Before: Separate primitives (code, type, message, details).
   *    After: An instantiated ApiError object containing structured error context.
   */
  constructor(statusCode, type, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    this.isOperational = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * badRequest
   *
   * 1. The use of function:
   *    Constructs a 400 Bad Request error.
   * 2. How does the specific function work:
   *    Instantiates ApiError with HTTP status 400 and VALIDATION_ERROR type.
   * 3. Concepts used in the function:
   *    Static factory method, status code mapping.
   * 4. Places where this function is imported and used:
   *    Used in controllers and middleware when input or request syntax is malformed.
   * 5. Final output of the function, before and after:
   *    Before: Message string and optional details.
   *    After: ApiError instance with statusCode=400, type='VALIDATION_ERROR'.
   */
  static badRequest(message = 'Bad Request', details = null) {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  /**
   * validation
   *
   * 1. The use of function:
   *    Constructs a 422 Unprocessable Entity error for semantic validation failures.
   * 2. How does the specific function work:
   *    Instantiates ApiError with HTTP status 422 and VALIDATION_ERROR type.
   * 3. Concepts used in the function:
   *    Static factory method, semantic validation status mapping.
   * 4. Places where this function is imported and used:
   *    Used in schema validation middleware and service-level data assertions.
   * 5. Final output of the function, before and after:
   *    Before: Message string and optional details.
   *    After: ApiError instance with statusCode=422, type='VALIDATION_ERROR'.
   */
  static validation(message = 'Validation failed', details = null) {
    return new ApiError(422, 'VALIDATION_ERROR', message, details);
  }

  /**
   * unauthorized
   *
   * 1. The use of function:
   *    Constructs a 401 Unauthorized error for missing, expired, or invalid credentials.
   * 2. How does the specific function work:
   *    Instantiates ApiError with HTTP status 401 and supports explicit error type categorization (e.g. TOKEN_EXPIRED).
   * 3. Concepts used in the function:
   *    Authentication status code mapping, granular machine-readable error tokenization.
   * 4. Places where this function is imported and used:
   *    Used in authGuard, businessGuard, adminGuard, and auth services.
   * 5. Final output of the function, before and after:
   *    Before: Message string and optional custom type.
   *    After: ApiError instance with statusCode=401 and specified type (default 'UNAUTHORIZED').
   */
  static unauthorized(message = 'Authentication required', type = 'UNAUTHORIZED') {
    return new ApiError(401, type, message);
  }

  /**
   * forbidden
   *
   * 1. The use of function:
   *    Constructs a 403 Forbidden error when authenticated caller lacks required permissions or roles.
   * 2. How does the specific function work:
   *    Instantiates ApiError with HTTP status 403 and FORBIDDEN type.
   * 3. Concepts used in the function:
   *    Role-based access control error signaling.
   * 4. Places where this function is imported and used:
   *    Used in RBAC middleware and business guard authorizations.
   * 5. Final output of the function, before and after:
   *    Before: Message string.
   *    After: ApiError instance with statusCode=403, type='FORBIDDEN'.
   */
  static forbidden(message = 'Access denied') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  /**
   * notFound
   *
   * 1. The use of function:
   *    Constructs a 404 Not Found error when a requested entity does not exist.
   * 2. How does the specific function work:
   *    Instantiates ApiError with HTTP status 404 and NOT_FOUND type.
   * 3. Concepts used in the function:
   *    Resource existence error handling.
   * 4. Places where this function is imported and used:
   *    Used across repositories, services, and route handlers.
   * 5. Final output of the function, before and after:
   *    Before: Message string.
   *    After: ApiError instance with statusCode=404, type='NOT_FOUND'.
   */
  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  /**
   * conflict
   *
   * 1. The use of function:
   *    Constructs a 409 Conflict error for unique constraint violations or duplicate records.
   * 2. How does the specific function work:
   *    Instantiates ApiError with HTTP status 409 and CONFLICT type.
   * 3. Concepts used in the function:
   *    Concurrency and idempotency error representation.
   * 4. Places where this function is imported and used:
   *    Used in user registration, bookmark creation, and uniqueness assertions.
   * 5. Final output of the function, before and after:
   *    Before: Message string.
   *    After: ApiError instance with statusCode=409, type='CONFLICT'.
   */
  static conflict(message = 'Resource conflict') {
    return new ApiError(409, 'CONFLICT', message);
  }

  /**
   * internal
   *
   * 1. The use of function:
   *    Constructs a 500 Internal Server Error for unhandled exceptions or infrastructure failures.
   * 2. How does the specific function work:
   *    Instantiates ApiError with HTTP status 500 and INTERNAL_ERROR type.
   * 3. Concepts used in the function:
   *    Fail-safe fallback error encapsulation.
   * 4. Places where this function is imported and used:
   *    Used in global errorHandler middleware and unhandled promise catch blocks.
   * 5. Final output of the function, before and after:
   *    Before: Message string.
   *    After: ApiError instance with statusCode=500, type='INTERNAL_ERROR'.
   */
  static internal(message = 'An unexpected error occurred') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}

module.exports = ApiError;
