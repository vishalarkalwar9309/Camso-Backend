'use strict';

/**
 * src/modules/analytics/analytics.admin.routes.js
 *
 * WHAT THIS FILE DOES:
 *   Defines administrative analytics routes.
 *   Auto-mounted at /api/v1/admin/analytics by src/routes/index.js.
 *
 * OVERALL DESIGN:
 *   Protected by global adminGuard and auditContext in adminRouter.
 *   Provides content analytics metrics for administrative users (VIEWER, CONTENT_ADMIN, SUPER_ADMIN).
 *
 * ELEMENTS IN THIS FILE:
 *   - GET /content: Administrative endpoint for document downloads and VOC feedback metrics
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported Express router instance.
 *
 * IMPORTED BY:
 *   src/routes/index.js (autoMountModules)
 */

const express = require('express');
const asyncHandler = require('../../core/utils/asyncHandler');
const requireRole = require('../../core/middleware/requireRole');
const analyticsController = require('./analytics.controller');

const router = express.Router();

/**
 * GET /api/v1/admin/analytics/content
 *
 * Content performance analytics: total document downloads, top documents, and VOC feedback summary.
 * Accessible to VIEWER, CONTENT_ADMIN, and SUPER_ADMIN roles.
 */
router.get(
  '/content',
  requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'),
  asyncHandler(analyticsController.getContentAnalytics),
);

module.exports = router;
