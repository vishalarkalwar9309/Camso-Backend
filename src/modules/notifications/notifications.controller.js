'use strict';

/**
 * src/modules/notifications/notifications.controller.js
 *
 * Handlers for administrative push notification dispatch.
 */

const service = require('./notifications.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

/**
 * POST /api/v1/admin/notifications/send
 */
const sendNotification = asyncHandler(async (req, res) => {
  const result = await service.dispatchNotification(req.body, req.user);
  sendSuccess(res, result, 200);
});

module.exports = {
  sendNotification,
};
