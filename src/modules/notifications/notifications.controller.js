'use strict';

/**
 * src/modules/notifications/notifications.controller.js
 *
 * WHAT THIS FILE DOES:
 *   HTTP request handlers for notifications endpoints (public + admin).
 *
 * OVERALL DESIGN:
 *   Thin controller. Validates input, calls service, returns ApiResponse envelopes.
 *   Public and admin handlers coexist; route files control which are exposed where.
 *
 * ELEMENTS:
 *   listFeed      — handles GET /api/v1/notifications (public SENT feed)
 *   adminList     — handles GET /api/v1/admin/notifications
 *   adminGetById  — handles GET /api/v1/admin/notifications/:id
 *   adminCreate   — handles POST /api/v1/admin/notifications
 *   adminUpdate   — handles PATCH /api/v1/admin/notifications/:id
 *
 * FINAL OUTPUT:
 *   module.exports = notificationsController
 *
 * IMPORTED BY:
 *   notifications.routes.js
 *   notifications.admin.routes.js
 */

const notificationsService = require('./notifications.service');
const ApiResponse = require('../../core/utils/ApiResponse');
const ApiError = require('../../core/utils/ApiError');

const notificationsController = {
  /**
   * listFeed
   * USE: Express handler for GET /api/v1/notifications (public).
   * Returns paginated SENT notifications.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async listFeed(req, res) {
    const { data, meta } = await notificationsService.getPublicFeed(req.query);
    return ApiResponse.paginated(res, data, meta);
  },

  /**
   * adminList
   * USE: Express handler for GET /api/v1/admin/notifications.
   * Returns paginated all notifications (admin sees all statuses).
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminList(req, res) {
    const { data, pagination } = await notificationsService.adminListNotifications(req.query);
    return ApiResponse.paginated(res, data, pagination);
  },

  /**
   * adminGetById
   * USE: Express handler for GET /api/v1/admin/notifications/:id.
   * Returns a single notification with all fields and translations.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminGetById(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw ApiError.validation('Invalid notification ID.');
    const notification = await notificationsService.adminGetNotificationById(id, req.query.lang || 'en');
    return ApiResponse.success(res, notification);
  },

  /**
   * adminCreate
   * USE: Express handler for POST /api/v1/admin/notifications.
   * Creates a new notification as DRAFT. Admin must send via campaigns.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminCreate(req, res) {
    const notification = await notificationsService.adminCreateNotification(req.body, req.admin.id, req.auditContext);
    return ApiResponse.success(res, notification, 201);
  },

  /**
   * adminUpdate
   * USE: Express handler for PATCH /api/v1/admin/notifications/:id.
   * Updates notification fields and translations.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminUpdate(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw ApiError.validation('Invalid notification ID.');
    const notification = await notificationsService.adminUpdateNotification(id, req.body, req.auditContext);
    return ApiResponse.success(res, notification);
  },
};

module.exports = notificationsController;
