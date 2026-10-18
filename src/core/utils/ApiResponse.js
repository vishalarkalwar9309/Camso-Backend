'use strict';

/**
 * ApiResponse.js
 *
 * 1. What this file does:
 *    Standardizes HTTP success and error response envelopes across the entire application,
 *    ensuring unified serialization for payloads, metadata, pagination, and error details.
 * 2. Overall design:
 *    Provides pure functional helpers (`sendSuccess`, `sendError`) and a static wrapper class (`ApiResponse`)
 *    for flexible controller consumption. Formats responses into uniform `{ success, data, meta }` and
 *    `{ success, error: { type, code, message, details } }` contracts.
 * 3. Elements in the file:
 *    - sendSuccess: Functional helper for standard 2xx responses.
 *    - sendError: Functional helper for operational error response serialization.
 *    - class ApiResponse: Static wrapper providing `.success()` and `.paginated()`.
 * 4. Final output of the file:
 *    Exports both the ApiResponse class and standalone helper functions.
 */

/**
 * sendSuccess
 *
 * 1. The use of function:
 *    Emits a consistent HTTP success response with a standardized JSON envelope.
 * 2. How does the specific function work:
 *    Builds `{ success: true, data }`, conditionally attaches `meta` if defined, and sets the HTTP status code.
 * 3. Concepts used in the function:
 *    Express Response serialization, uniform envelope pattern.
 * 4. Places where this function is imported and used:
 *    Used across all API controllers in `src/modules/*`.
 * 5. Final output of the function, before and after:
 *    Before: Raw data payload, status code, and optional meta.
 *    After: Express response sent with JSON body `{ success: true, data, meta? }`.
 */
function sendSuccess(res, data, statusCode = 200, meta) {
  const body = { success: true, data };
  if (meta !== undefined) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
}

/**
 * sendError
 *
 * 1. The use of function:
 *    Emits a standardized HTTP error response derived from an ApiError instance.
 * 2. How does the specific function work:
 *    Serializes ApiError properties into `{ success: false, error: { type, code, message, details } }`
 *    and sets the appropriate HTTP status code.
 * 3. Concepts used in the function:
 *    Machine-readable error codes, backwards compatibility aliasing (code/type).
 * 4. Places where this function is imported and used:
 *    Used in `errorHandler.js` middleware.
 * 5. Final output of the function, before and after:
 *    Before: ApiError instance with status and message.
 *    After: Express response sent with JSON error envelope.
 */
function sendError(res, apiError) {
  return res.status(apiError.statusCode).json({
    success: false,
    error: {
      type: apiError.type,
      code: apiError.type,
      message: apiError.message,
      details: apiError.details || [],
    },
  });
}

/**
 * ApiResponse
 *
 * 1. The use of class:
 *    Provides object-oriented static helper methods for success and paginated response construction.
 * 2. What the class contain:
 *    Static methods: success, paginated.
 * 3. Technologies used and why:
 *    JavaScript ES6 static class methods for expressive namespace encapsulation.
 * 4. Key design and overall design of the class:
 *    Facade over functional response formatters.
 */
class ApiResponse {
  /**
   * success
   *
   * 1. The use of function:
   *    Static delegate to sendSuccess.
   * 2. How does the specific function work:
   *    Forwards parameters directly to sendSuccess().
   * 3. Concepts used in the function:
   *    Method delegation, facade pattern.
   * 4. Places where this function is imported and used:
   *    Used in controllers preferring class syntax.
   * 5. Final output of the function, before and after:
   *    Before: Express res object and payload.
   *    After: Standardized JSON success response sent.
   */
  static success(res, data = null, statusCode = 200, meta = undefined) {
    return sendSuccess(res, data, statusCode, meta);
  }

  /**
   * paginated
   *
   * 1. The use of function:
   *    Serializes a paginated list with page, pageSize, total, and totalPages metadata.
   * 2. How does the specific function work:
   *    Constructs a pagination meta object and delegates to sendSuccess().
   * 3. Concepts used in the function:
   *    Pagination metadata formatting.
   * 4. Places where this function is imported and used:
   *    Used in catalogue, search, activity, and calculation controllers.
   * 5. Final output of the function, before and after:
   *    Before: List items array and pagination descriptor.
   *    After: JSON response with data array and structured pagination meta.
   */
  static paginated(res, data, pagination, statusCode = 200) {
    const meta = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: pagination.totalPages,
    };
    return sendSuccess(res, data, statusCode, meta);
  }
}

ApiResponse.sendSuccess = sendSuccess;
ApiResponse.sendError = sendError;
ApiResponse.success = ApiResponse.success;
ApiResponse.paginated = ApiResponse.paginated;

module.exports = ApiResponse;
module.exports.sendSuccess = sendSuccess;
module.exports.sendError = sendError;
module.exports.success = ApiResponse.success;
module.exports.paginated = ApiResponse.paginated;
