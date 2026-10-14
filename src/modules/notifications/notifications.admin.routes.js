'use strict';

/**
 * src/modules/notifications/notifications.admin.routes.js
 *
 * Administrative routes for FCM push notifications and campaign dispatch.
 * Mounted at /api/v1/admin/notifications in src/routes/index.js.
 */

const { Router } = require('express');
const adminGuard = require('../../core/middleware/adminGuard');
const requireRole = require('../../core/middleware/requireRole');
const controller = require('./notifications.controller');
const { validate, sendNotificationSchema } = require('./notifications.validation');

const router = Router();

// Protect all admin notification routes
router.use(adminGuard);

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
