'use strict';

/**
 * src/modules/audit-logs/audit-logs.controller.js
 *
 * 1. What this file does:
 *    Controller layer handling incoming HTTP requests for administrative audit log queries.
 * 2. Overall design:
 *    Wraps request processing with asyncHandler, delegates to audit-logs.service,
 *    and serializes the result via ApiResponse.sendSuccess.
 * 3. Elements in the file:
 *    - listAuditLogs(req, res): HTTP request handler for querying audit logs.
 * 4. Final output of the file:
 *    Exports controller object with Express request handlers.
 */

const service = require('./audit-logs.service');
const ApiResponse = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

/**
 * listAuditLogs
 *
 * 1. The use of function:
 *    Handles GET /api/v1/admin/audit-logs requests to retrieve paginated audit entries.
 * 2. How does the specific function work:
 *    Passes query parameters from req.query to the audit-logs service,
 *    then returns a 200 OK JSON response containing the items and pagination metadata.
 * 3. Concepts used in the function:
 *    Asynchronous request handling, REST response formatting, query delegation.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/audit-logs/audit-logs.routes.js.
 * 5. Final output of the function, before and after:
 *    Before: Incoming Express HTTP request (req.query) and response (res).
 *    After: Sends HTTP 200 response with JSON envelope { success: true, data: [...], pagination: {...} }.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const listAuditLogs = asyncHandler(async (req, res) => {
  const { items, pagination } = await service.listAuditLogs(req.query);
  ApiResponse.sendSuccess(res, items, 200, pagination);
});

module.exports = {
  listAuditLogs,
};
