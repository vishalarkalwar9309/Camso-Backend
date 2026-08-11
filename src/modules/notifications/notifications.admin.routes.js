'use strict';

/**
 * src/modules/notifications/notifications.admin.routes.js
 *
 * WHAT THIS FILE DOES:
 *   Defines admin routes for the notifications module.
 *   Mounted automatically at /api/v1/admin/notifications by routes/index.js.
 *
 * OVERALL DESIGN:
 *   adminGuard + auditContext are applied by the central router.
 *   VIEWER and above can read. Only MARKETING and SUPER_ADMIN can write.
 *
 * ELEMENTS:
 *   GET    /           → adminList    (VIEWER, MARKETING, SUPER_ADMIN)
 *   GET    /:id        → adminGetById (VIEWER, MARKETING, SUPER_ADMIN)
 *   POST   /           → adminCreate  (MARKETING, SUPER_ADMIN)
 *   PATCH  /:id        → adminUpdate  (MARKETING, SUPER_ADMIN)
 *
 * FINAL OUTPUT:
 *   module.exports = express.Router()
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8 (Aary's endpoints — notifications admin)
 *            docs/CAMSO_Backend_Plan_Aary.md Section 5
 */

const express = require('express');
const asyncHandler = require('../../core/utils/asyncHandler');
const requireRole = require('../../core/middleware/requireRole');
const notificationsController = require('./notifications.controller');

const router = express.Router();

// ── Read (VIEWER, MARKETING, SUPER_ADMIN) ──────────────────────────────────
router.get(
  '/',
  requireRole('VIEWER', 'MARKETING', 'SUPER_ADMIN'),
  asyncHandler(notificationsController.adminList),
);

router.get(
  '/:id',
  requireRole('VIEWER', 'MARKETING', 'SUPER_ADMIN'),
  asyncHandler(notificationsController.adminGetById),
);

// ── Write (MARKETING, SUPER_ADMIN) ─────────────────────────────────────────
router.post(
  '/',
  requireRole('MARKETING', 'SUPER_ADMIN'),
  asyncHandler(notificationsController.adminCreate),
);

router.patch(
  '/:id',
  requireRole('MARKETING', 'SUPER_ADMIN'),
  asyncHandler(notificationsController.adminUpdate),
);

module.exports = router;
