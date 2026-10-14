'use strict';

/**
 * src/modules/notifications/notifications.controller.js
 *
 * Handlers for notifications endpoints (public feed + admin CRUD + push dispatch).
 */

const notificationsService = require('./notifications.service');
const ApiResponse = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const { validateCuid } = require('../../core/utils/idValidation');

/**
 * POST /api/v1/admin/notifications/send
 */
const sendNotification = asyncHandler(async (req, res) => {
  const result = await notificationsService.dispatchNotification(req.body, req.user || req.admin);
  ApiResponse.sendSuccess(res, result, 200);
});

const notificationsController = {
  sendNotification,

  /**
   * GET /api/v1/notifications
   */
  async listFeed(req, res) {
    const { data, meta } = await notificationsService.getPublicFeed(req.query);
    return ApiResponse.paginated(res, data, meta);
  },

  /**
   * GET /api/v1/admin/notifications
   */
  async adminList(req, res) {
    const { data, pagination } = await notificationsService.adminListNotifications(req.query);
    return ApiResponse.paginated(res, data, pagination);
  },

  /**
   * GET /api/v1/admin/notifications/:id
   */
  async adminGetById(req, res) {
    const id = validateCuid(req.params.id);
    const notification = await notificationsService.adminGetNotificationById(id, req.query.lang || 'en');
    return ApiResponse.success(res, notification);
  },

  /**
   * POST /api/v1/admin/notifications
   */
  async adminCreate(req, res) {
    const adminId = (req.admin && req.admin.id) || (req.user && req.user.id);
    const notification = await notificationsService.adminCreateNotification(req.body, adminId, req.auditContext || {});
    return ApiResponse.success(res, notification, 201);
  },

  /**
   * PATCH /api/v1/admin/notifications/:id
   */
  async adminUpdate(req, res) {
    const id = validateCuid(req.params.id);
    const notification = await notificationsService.adminUpdateNotification(id, req.body, req.auditContext || {});
    return ApiResponse.success(res, notification);
  },
};

notificationsController.sendNotification = sendNotification;
module.exports = notificationsController;
