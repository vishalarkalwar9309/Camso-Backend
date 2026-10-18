'use strict';

/**
 * 1. What this file does:
 *    Express controller layer for User Activity tracking and telemetry endpoints.
 * 2. Overall design:
 *    Receives HTTP requests, coordinates with activity.service.js, formats standard success responses
 *    via ApiResponse utility, and routes errors to next() middleware.
 * 3. Elements in the file:
 *    - recordActivity: Handles POST /api/v1/activity.
 *    - getUserActivities: Handles GET /api/v1/activity.
 *    - getBusinessActivities: Handles GET /api/v1/business/activity.
 * 4. Final output of the file:
 *    Exports handler functions for routing incoming HTTP requests to corresponding business operations.
 */

const service = require('./activity.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');

/**
 * Handles activity event recording.
 *
 * 1. The use of function:
 *    Processes incoming POST /api/v1/activity requests to persist user or guest telemetry.
 * 2. How does the specific function work:
 *    Passes req.user (if authenticated), req.body, and req context to service.recordActivity,
 *    and responds with HTTP 201 Created containing the recorded activity object.
 * 3. Concepts used in the function:
 *    Express controller pattern, HTTP response generation, telemetry ingestion.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/activity/activity.routes.js.
 * 5. Final output of the function, before and after:
 *    Before: Unprocessed HTTP request with telemetry JSON body.
 *    After: HTTP 201 Created JSON response with data payload.
 *
 * @param {object} req - Express request.
 * @param {object} res - Express response.
 * @param {Function} next - Express next middleware.
 */
async function recordActivity(req, res, next) {
  try {
    const activity = await service.recordActivity(req.user || null, req.body, req);
    return sendSuccess(res, activity, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles fetching user activity history.
 *
 * 1. The use of function:
 *    Processes GET /api/v1/activity requests to retrieve paginated activity logs for caller.
 * 2. How does the specific function work:
 *    Calls service.getUserActivities with authenticated req.user and req.query,
 *    and responds with HTTP 200 OK along with pagination metadata.
 * 3. Concepts used in the function:
 *    Paginated resource retrieval, user session context.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/activity/activity.routes.js.
 * 5. Final output of the function, before and after:
 *    Before: HTTP GET request with query pagination parameters.
 *    After: HTTP 200 JSON response containing items array and pagination object.
 *
 * @param {object} req - Express request.
 * @param {object} res - Express response.
 * @param {Function} next - Express next middleware.
 */
async function getUserActivities(req, res, next) {
  try {
    const { items, pagination } = await service.getUserActivities(req.user, req.query);
    return sendSuccess(res, items, 200, pagination);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles fetching business activity logs.
 *
 * 1. The use of function:
 *    Processes GET /api/v1/business/activity requests for authorized dealer/distributor accounts.
 * 2. How does the specific function work:
 *    Calls service.getBusinessActivities with business user context and responds with HTTP 200 OK.
 * 3. Concepts used in the function:
 *    Business portal auditing, multi-tenant logging.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/activity/activity.routes.js and business portal routes.
 * 5. Final output of the function, before and after:
 *    Before: Business authenticated GET request.
 *    After: HTTP 200 JSON response with organization activities.
 *
 * @param {object} req - Express request.
 * @param {object} res - Express response.
 * @param {Function} next - Express next middleware.
 */
async function getBusinessActivities(req, res, next) {
  try {
    const { items, pagination } = await service.getBusinessActivities(req.user, req.query);
    return sendSuccess(res, items, 200, pagination);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  recordActivity,
  getUserActivities,
  getBusinessActivities,
};
