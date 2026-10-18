'use strict';

/**
 * 1. What this file does:
 *    Express controller layer for User Saved Calculations endpoints.
 * 2. Overall design:
 *    Receives HTTP requests, coordinates with calculations.service.js, formats standard success responses
 *    via ApiResponse utility, and routes errors to next() middleware.
 * 3. Elements in the file:
 *    - saveCalculation: Handles POST /api/v1/calculations.
 *    - getCalculations: Handles GET /api/v1/calculations.
 *    - getCalculationById: Handles GET /api/v1/calculations/:id.
 *    - deleteCalculation: Handles DELETE /api/v1/calculations/:id.
 * 4. Final output of the file:
 *    Exports handler functions for routing incoming HTTP requests to corresponding business operations.
 */

const service = require('./calculations.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');

/**
 * Handles saving an engineering or financial calculation.
 *
 * 1. The use of function:
 *    Processes incoming POST /api/v1/calculations requests to store calculation outputs.
 * 2. How does the specific function work:
 *    Passes authenticated req.user and req.body to service.saveCalculation,
 *    and returns HTTP 201 Created with the saved calculation.
 * 3. Concepts used in the function:
 *    Express controller pattern, HTTP response generation.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/calculations/calculations.routes.js.
 * 5. Final output of the function, before and after:
 *    Before: Unprocessed calculation save request.
 *    After: HTTP 201 Created JSON response with saved calculation record.
 *
 * @param {object} req - Express request.
 * @param {object} res - Express response.
 * @param {Function} next - Express next middleware.
 */
async function saveCalculation(req, res, next) {
  try {
    const calculation = await service.saveCalculation(req.user, req.body);
    return sendSuccess(res, calculation, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles fetching paginated saved calculations for the caller.
 *
 * 1. The use of function:
 *    Processes GET /api/v1/calculations requests to return saved calculations.
 * 2. How does the specific function work:
 *    Calls service.getCalculations with req.user and req.query,
 *    and responds with HTTP 200 OK along with pagination metadata.
 * 3. Concepts used in the function:
 *    Paginated resource retrieval, ownership scoping.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/calculations/calculations.routes.js.
 * 5. Final output of the function, before and after:
 *    Before: HTTP GET request with query pagination parameters.
 *    After: HTTP 200 JSON response containing items array and pagination object.
 *
 * @param {object} req - Express request.
 * @param {object} res - Express response.
 * @param {Function} next - Express next middleware.
 */
async function getCalculations(req, res, next) {
  try {
    const { items, pagination } = await service.getCalculations(req.user, req.query);
    return sendSuccess(res, items, 200, pagination);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles fetching a single saved calculation by ID.
 *
 * 1. The use of function:
 *    Processes GET /api/v1/calculations/:id requests to retrieve calculation details.
 * 2. How does the specific function work:
 *    Calls service.getCalculationById with req.user and req.params.id,
 *    and responds with HTTP 200 OK with calculation payload.
 * 3. Concepts used in the function:
 *    Resource detail retrieval, access control.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/calculations/calculations.routes.js.
 * 5. Final output of the function, before and after:
 *    Before: Calculation ID path parameter.
 *    After: HTTP 200 JSON response with calculation data.
 *
 * @param {object} req - Express request.
 * @param {object} res - Express response.
 * @param {Function} next - Express next middleware.
 */
async function getCalculationById(req, res, next) {
  try {
    const calculation = await service.getCalculationById(req.user, req.params.id, req.query);
    return sendSuccess(res, calculation, 200);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles deleting a saved calculation.
 *
 * 1. The use of function:
 *    Processes DELETE /api/v1/calculations/:id requests to remove a saved calculation.
 * 2. How does the specific function work:
 *    Calls service.deleteCalculation with req.user and req.params.id,
 *    and responds with HTTP 200 OK confirming deletion.
 * 3. Concepts used in the function:
 *    Resource deletion, ownership boundary.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/calculations/calculations.routes.js.
 * 5. Final output of the function, before and after:
 *    Before: Calculation ID path parameter.
 *    After: HTTP 200 JSON response with success message.
 *
 * @param {object} req - Express request.
 * @param {object} res - Express response.
 * @param {Function} next - Express next middleware.
 */
async function deleteCalculation(req, res, next) {
  try {
    const result = await service.deleteCalculation(req.user, req.params.id, req.query);
    return sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  saveCalculation,
  getCalculations,
  getCalculationById,
  deleteCalculation,
};
