'use strict';

/**
 * src/modules/system-health/system-health.controller.js
 *
 * 1. What this file does:
 *    Controller layer handling requests for system health and diagnostics in the Super Admin Console.
 * 2. Overall design:
 *    Uses asyncHandler to catch errors, calls system-health service, and returns structured API responses.
 * 3. Elements in the file:
 *    - getSystemHealth(req, res): HTTP request handler for platform health diagnostics.
 * 4. Final output of the file:
 *    Exports controller object with Express request handlers.
 */

const service = require('./system-health.service');
const ApiResponse = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

/**
 * getSystemHealth
 *
 * 1. The use of function:
 *    Handles GET /api/v1/admin/system-health to return platform health and dependency status.
 * 2. How does the specific function work:
 *    Invokes service.getSystemHealth() and formats response through ApiResponse.sendSuccess.
 * 3. Concepts used in the function:
 *    Asynchronous controller pattern, REST formatting.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/system-health/system-health.routes.js.
 * 5. Final output of the function, before and after:
 *    Before: Incoming Express HTTP request (req) and response (res).
 *    After: Returns HTTP 200 JSON with health diagnostics payload.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const getSystemHealth = asyncHandler(async (req, res) => {
  const healthData = await service.getSystemHealth();
  ApiResponse.sendSuccess(res, healthData, 200);
});

module.exports = {
  getSystemHealth,
};
