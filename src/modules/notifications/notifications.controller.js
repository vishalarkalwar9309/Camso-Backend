'use strict';

/**
 * src/modules/notifications/notifications.controller.js
 *
 * WHAT THIS FILE DOES:
 *   HTTP request handlers for notifications endpoints.
 *
 * OVERALL DESIGN:
 *   Extracts query parameters and returns paginated API response.
 *
 * ELEMENTS:
 *   listFeed — handles GET /api/v1/notifications
 *
 * FINAL OUTPUT:
 *   module.exports = notificationsController
 *
 * IMPORTED BY:
 *   notifications.routes.js
 */

const notificationsService = require('./notifications.service');
const ApiResponse = require('../../core/utils/ApiResponse');

const notificationsController = {
  async listFeed(req, res) {
    const { data, meta } = await notificationsService.getPublicFeed(req.query);
    return ApiResponse.paginated(res, data, meta);
  }
};

module.exports = notificationsController;
