'use strict';

/**
 * src/modules/notifications/notifications.admin.routes.js
 *
 * Administrative routes for FCM push notifications, campaign dispatch, and notification CRUD.
 * Mounted at /api/v1/admin/notifications in src/routes/index.js.
 */

const { Router } = require('express');
const adminGuard = require('../../core/middleware/adminGuard');
const auditContext = require('../../core/middleware/auditContext');
const requireRole = require('../../core/middleware/requireRole');
const asyncHandler = require('../../core/utils/asyncHandler');
const controller = require('./notifications.controller');
const { validate, sendNotificationSchema } = require('./notifications.validation');

const router = Router();

// Protect all admin notification routes
router.use(adminGuard);
router.use(auditContext);

// ── Read (VIEWER, MARKETING, SUPER_ADMIN) ──────────────────────────────────
router.get(
  '/',
  requireRole('VIEWER', 'MARKETING', 'SUPER_ADMIN'),
  asyncHandler(controller.adminList)
);

router.get(
  '/:id',
  requireRole('VIEWER', 'MARKETING', 'SUPER_ADMIN'),
  asyncHandler(controller.adminGetById)
);

// ── Write (MARKETING, SUPER_ADMIN) ─────────────────────────────────────────
router.post(
  '/',
  requireRole('MARKETING', 'SUPER_ADMIN'),
  asyncHandler(controller.adminCreate)
);

router.patch(
  '/:id',
  requireRole('MARKETING', 'SUPER_ADMIN'),
  asyncHandler(controller.adminUpdate)
);

/**
 * POST /api/v1/admin/notifications/send
 * Requires MARKETING or SUPER_ADMIN role.
 */
router.post(
  '/send',
  requireRole('MARKETING', 'SUPER_ADMIN'),
  validate(sendNotificationSchema),
  controller.sendNotification
);

module.exports = router;
