'use strict';

/**
 * src/modules/feedback/feedback.admin.routes.js
 *
 * WHAT THIS FILE DOES:
 *   Defines admin routes for the feedback module.
 *   Mounted automatically at /api/v1/admin/feedback by routes/index.js.
 *
 * OVERALL DESIGN:
 *   adminGuard + auditContext are applied by the central router.
 *   Feedback admin is READ-ONLY. No create/update/delete endpoints.
 *   The export endpoint is a dedicated explicit endpoint per plan Section 8.
 *
 * ELEMENTS:
 *   GET  /        → adminList   (VIEWER, CONTENT_ADMIN, SUPER_ADMIN)
 *   GET  /export  → adminExport (VIEWER, CONTENT_ADMIN, SUPER_ADMIN)
 *
 * CRITICAL: /export MUST be registered BEFORE /:id to prevent route shadowing.
 *
 * FINAL OUTPUT:
 *   module.exports = express.Router()
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8
 *            docs/CAMSO_Backend_Plan_Aary.md Section 5
 */

const express = require('express');
const asyncHandler = require('../../core/utils/asyncHandler');
const requireRole = require('../../core/middleware/requireRole');
const feedbackController = require('./feedback.controller');

const router = express.Router();

// /export BEFORE /:id (route-ordering safety)
router.get(
  '/export',
  requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'),
  asyncHandler(feedbackController.adminExport),
);

router.get(
  '/',
  requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'),
  asyncHandler(feedbackController.adminList),
);

module.exports = router;
