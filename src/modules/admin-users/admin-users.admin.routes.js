'use strict';

/**
 * src/modules/admin-users/admin-users.admin.routes.js
 *
 * WHAT THIS FILE DOES:
 *   Defines admin routes for admin-user management.
 *   Mounted automatically at /api/v1/admin/admin-users by routes/index.js.
 *
 * OVERALL DESIGN:
 *   ALL operations are SUPER_ADMIN only (no VIEWER, no CONTENT_ADMIN, no MARKETING).
 *   This is security-critical: these routes control who can access the admin system.
 *
 * ELEMENTS:
 *   GET    /           → list    (SUPER_ADMIN only)
 *   GET    /:id        → getById (SUPER_ADMIN only)
 *   POST   /           → create  (SUPER_ADMIN only)
 *   PATCH  /:id        → update  (SUPER_ADMIN only) — includes role change + deactivation
 *
 * FINAL OUTPUT:
 *   module.exports = express.Router()
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 5 (Roles — SUPER_ADMIN only)
 *            docs/CAMSO_Backend_Plan_Aary.md Section 5 (admin-users endpoints)
 */

const express = require('express');
const asyncHandler = require('../../core/utils/asyncHandler');
const requireRole = require('../../core/middleware/requireRole');
const adminUsersController = require('./admin-users.controller');

const router = express.Router();

// ── ALL operations: SUPER_ADMIN only ──────────────────────────────────────
router.get('/', requireRole('SUPER_ADMIN'), asyncHandler(adminUsersController.list));
router.get('/:id', requireRole('SUPER_ADMIN'), asyncHandler(adminUsersController.getById));
router.post('/', requireRole('SUPER_ADMIN'), asyncHandler(adminUsersController.create));
router.patch('/:id', requireRole('SUPER_ADMIN'), asyncHandler(adminUsersController.update));

module.exports = router;
