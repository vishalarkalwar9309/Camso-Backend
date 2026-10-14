'use strict';

/**
 * src/modules/dealers/dealers.admin.routes.js
 *
 * WHAT THIS FILE DOES:
 *   Defines admin routes for the dealers module.
 *   Mounted automatically at /api/v1/admin/dealers by routes/index.js.
 *
 * OVERALL DESIGN:
 *   adminGuard + auditContext are applied to ALL /admin/* routes by the central router.
 *   requireRole enforces per-route role restrictions from the master plan.
 *
 * ELEMENTS:
 *   GET    /           → adminList   (VIEWER, CONTENT_ADMIN, SUPER_ADMIN)
 *   GET    /:id        → adminGetById (VIEWER, CONTENT_ADMIN, SUPER_ADMIN)
 *   POST   /           → adminCreate  (CONTENT_ADMIN, SUPER_ADMIN)
 *   PATCH  /:id        → adminUpdate  (CONTENT_ADMIN, SUPER_ADMIN) incl. is_active
 *
 * FINAL OUTPUT:
 *   module.exports = express.Router()
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8 (Aary's endpoints — dealers admin)
 *            docs/CAMSO_Backend_Plan_Aary.md Section 5
 */

const express = require('express');
const asyncHandler = require('../../core/utils/asyncHandler');
const requireRole = require('../../core/middleware/requireRole');
const dealersController = require('./dealers.controller');

const router = express.Router();

// ── Read (VIEWER, CONTENT_ADMIN, SUPER_ADMIN) ──────────────────────────────
router.get(
  '/',
  requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'),
  asyncHandler(dealersController.adminList),
);

router.get(
  '/:id',
  requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'),
  asyncHandler(dealersController.adminGetById),
);

// ── Write (CONTENT_ADMIN, SUPER_ADMIN) ─────────────────────────────────────
router.post(
  '/',
  requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'),
  asyncHandler(dealersController.adminCreate),
);

router.patch(
  '/:id',
  requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'),
  asyncHandler(dealersController.adminUpdate),
);

module.exports = router;
