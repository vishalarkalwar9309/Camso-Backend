'use strict';

/**
 * ApiResponse — standardised HTTP response helpers.
 *
 * All controllers use these functions — they never call res.json()
 * directly with ad-hoc shapes.
 *
 * Success shape:
 *   { success: true, data: <any>, meta: <object|undefined> }
 *
 * Error shape:
 *   { success: false, error: { type: <string>, message: <string>, details: <array> } }
 */

/**
 * Send a successful response.
 *
 * @param {import('express').Response} res
 * @param {*}      data       - Response payload
 * @param {number} [statusCode=200]
 * @param {object} [meta]     - Optional pagination/metadata object
 */
function sendSuccess(res, data, statusCode = 200, meta) {
  const body = { success: true, data };
  if (meta !== undefined) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
}

/**
 * Send an error response from an ApiError instance.
 *
 * @param {import('express').Response} res
 * @param {import('./ApiError')} apiError
 */
function sendError(res, apiError) {
  return res.status(apiError.statusCode).json({
    success: false,
    error: {
      type: apiError.type,
      message: apiError.message,
      details: apiError.details || [],
    },
  });
}

/**
 * ApiResponse class providing static methods matching Aary's convention.
 */
class ApiResponse {
  static success(res, data = null, statusCode = 200, meta = undefined) {
    return sendSuccess(res, data, statusCode, meta);
  }

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
