'use strict';

/**
 * src/modules/campaigns/campaigns.admin.routes.js
 *
 * WHAT THIS FILE DOES:
 *   Defines admin routes for the campaigns module.
 *   Mounted automatically at /api/v1/admin/campaigns by routes/index.js.
 *
 * OVERALL DESIGN:
 *   adminGuard + auditContext are applied by the central router.
 *   VIEWER and above can read. Only MARKETING and SUPER_ADMIN can write.
 *   The /send route is the security-critical FCM trigger.
 *
 * ELEMENTS:
 *   GET  /           → adminList    (VIEWER, MARKETING, SUPER_ADMIN)
 *   GET  /:id        → adminGetById (VIEWER, MARKETING, SUPER_ADMIN)
 *   POST /           → adminCreate  (MARKETING, SUPER_ADMIN)
 *   PATCH /:id       → adminUpdate  (MARKETING, SUPER_ADMIN)
 *   POST /:id/send   → adminSend    (MARKETING, SUPER_ADMIN)
 *
 * CRITICAL: /:id/send is nested, not a sibling of /:id.
 *           Route specificity handles this correctly in Express.
 *
 * FINAL OUTPUT:
 *   module.exports = express.Router()
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8 (Aary's endpoints — campaigns admin)
 *            docs/CAMSO_Backend_Plan_Aary.md Section 5
 */

const express = require('express');
const asyncHandler = require('../../core/utils/asyncHandler');
const requireRole = require('../../core/middleware/requireRole');
const campaignsController = require('./campaigns.controller');

const router = express.Router();

// ── Read (VIEWER, MARKETING, SUPER_ADMIN) ─────────────────────────────────
router.get(
  '/',
  requireRole('VIEWER', 'MARKETING', 'SUPER_ADMIN'),
  asyncHandler(campaignsController.adminList),
);

router.get(
  '/:id',
  requireRole('VIEWER', 'MARKETING', 'SUPER_ADMIN'),
  asyncHandler(campaignsController.adminGetById),
);

// ── Write (MARKETING, SUPER_ADMIN) ────────────────────────────────────────
router.post(
  '/',
  requireRole('MARKETING', 'SUPER_ADMIN'),
  asyncHandler(campaignsController.adminCreate),
);

router.patch(
  '/:id',
  requireRole('MARKETING', 'SUPER_ADMIN'),
  asyncHandler(campaignsController.adminUpdate),
);

// ── Send (MARKETING, SUPER_ADMIN) — security-critical FCM trigger ─────────
router.post(
  '/:id/send',
  requireRole('MARKETING', 'SUPER_ADMIN'),
  asyncHandler(campaignsController.adminSend),
);

module.exports = router;
