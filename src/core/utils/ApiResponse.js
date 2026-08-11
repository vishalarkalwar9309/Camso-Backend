'use strict';

/**
 * src/core/utils/ApiResponse.js
 *
 * WHAT THIS FILE DOES:
 *   Defines the standard success response format for all API endpoints.
 *   Ensures consistent response shapes across the entire backend.
 *
 * OVERALL DESIGN:
 *   All successful responses use the shape: { success: true, data, meta }.
 *   Controllers call ApiResponse.success() — never construct raw objects.
 *   This ensures the mobile team always receives a predictable contract.
 *
 * ELEMENTS:
 *   ApiResponse.success(res, data, statusCode, meta) — sends standard success response
 *   ApiResponse.paginated(res, data, pagination)     — sends paginated list response
 *
 * FINAL OUTPUT:
 *   module.exports = ApiResponse
 *
 * IMPORTED BY:
 *   All *.controller.js files
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8 (API conventions)
 */

/**
 * ApiResponse
 *
 * USE: Static utility class for sending standardized HTTP success responses.
 *
 * KEY DESIGN:
 *   Methods write directly to the Express response object.
 *   No instances are created — all methods are static.
 *   Never placed inline in controllers — always use these helpers.
 */
class ApiResponse {
  /**
   * success
   *
   * USE: Sends a standard successful API response.
   *
   * HOW IT WORKS:
   *   Sets HTTP status code and sends JSON body with success=true envelope.
   *
   * CONCEPTS: Express response pattern, response envelope.
   *
   * IMPORTED BY: All controllers for non-list responses.
   *
   * BEFORE: Response not sent.
   * AFTER:  JSON response sent with { success: true, data, meta }.
   *
   * @param {import('express').Response} res
   * @param {*} data           — response payload
   * @param {number} statusCode — HTTP status code (default 200)
   * @param {object} meta       — optional extra metadata
   */
  static success(res, data = null, statusCode = 200, meta = undefined) {
    const body = { success: true, data };
    if (meta !== undefined) body.meta = meta;
    return res.status(statusCode).json(body);
  }

  /**
   * paginated
   *
   * USE: Sends a standard paginated list response.
   *
   * HOW IT WORKS:
   *   Wraps the list in data[], and attaches pagination metadata per API convention.
   *   pagination shape: { page, pageSize, total, totalPages }
   *
   * CONCEPTS: Pagination contract from master plan Section 8.
   *
   * IMPORTED BY: All list-returning controllers.
   *
   * @param {import('express').Response} res
   * @param {Array} data       — the list of items
   * @param {object} pagination — { page, pageSize, total, totalPages }
   * @param {number} statusCode — HTTP status (default 200)
   */
  static paginated(res, data, pagination, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    });
  }
}

module.exports = ApiResponse;
