'use strict';

/**
 * 1. What this file does:
 *    Defines Express routes for the User Calculations module.
 * 2. Overall design:
 *    Exposes REST endpoints for saving, listing, retrieving, and deleting engineering calculations.
 *    All routes require Bearer token authentication (registered user or guest).
 * 3. Elements in the file:
 *    - POST /: Saves a calculation.
 *    - GET /: Lists paginated calculations.
 *    - GET /:id: Retrieves a calculation by ID.
 *    - DELETE /:id: Deletes a calculation by ID.
 * 4. Final output of the file:
 *    Exports Express Router instance to be mounted at /api/v1/calculations in src/routes/index.js.
 */

const { Router } = require('express');
const authGuard = require('../../core/middleware/authGuard');
const asyncHandler = require('../../core/utils/asyncHandler');
const controller = require('./calculations.controller');
const {
  createCalculationSchema,
  listCalculationsSchema,
  calculationIdParamSchema,
  validate,
} = require('./calculations.validation');

const router = Router();

// All calculation endpoints require a valid JWT (registered user or guest)
router.use(authGuard);

// POST /api/v1/calculations — Save calculation
router.post(
  '/',
  validate(createCalculationSchema, 'body'),
  asyncHandler(controller.saveCalculation)
);

// GET /api/v1/calculations — List saved calculations
router.get(
  '/',
  validate(listCalculationsSchema, 'query'),
  asyncHandler(controller.getCalculations)
);

// GET /api/v1/calculations/:id — Retrieve calculation by ID
router.get(
  '/:id',
  validate(calculationIdParamSchema, 'params'),
  asyncHandler(controller.getCalculationById)
);

// DELETE /api/v1/calculations/:id — Delete calculation
router.delete(
  '/:id',
  validate(calculationIdParamSchema, 'params'),
  asyncHandler(controller.deleteCalculation)
);

module.exports = router;
