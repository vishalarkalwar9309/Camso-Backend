'use strict';

/**
 * 1. What this file does:
 *    Defines Express routes for the User Activity telemetry and audit log module.
 * 2. Overall design:
 *    Exposes endpoints for recording client activity events (with optional authentication)
 *    and querying personalized activity history (requiring Bearer authentication).
 * 3. Elements in the file:
 *    - POST /: Records an activity event from a mobile client or business actor.
 *    - GET /: Retrieves paginated activity records for the authenticated user or guest device.
 *    - GET /business: Retrieves activity records for the calling business user or dealership.
 * 4. Final output of the file:
 *    Exports Express Router instance to be mounted at /api/v1/activity in src/routes/index.js.
 */

const { Router } = require('express');
const authGuard = require('../../core/middleware/authGuard');
const businessGuard = require('../../core/middleware/businessGuard');
const optionalAuthGuard = require('../../core/middleware/optionalAuthGuard');
const asyncHandler = require('../../core/utils/asyncHandler');
const controller = require('./activity.controller');
const {
  recordActivitySchema,
  listActivitySchema,
  validate,
} = require('./activity.validation');

const router = Router();

// POST /api/v1/activity — Log user/guest/business activity
router.post(
  '/',
  optionalAuthGuard,
  validate(recordActivitySchema, 'body'),
  asyncHandler(controller.recordActivity)
);

// GET /api/v1/activity/business — List activity for business accounts
router.get(
  '/business',
  businessGuard,
  validate(listActivitySchema, 'query'),
  asyncHandler(controller.getBusinessActivities)
);

// GET /api/v1/activity — List activity for authenticated end-user or guest
router.get(
  '/',
  authGuard,
  validate(listActivitySchema, 'query'),
  asyncHandler(controller.getUserActivities)
);

module.exports = router;
