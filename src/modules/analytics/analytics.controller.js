'use strict';

/**
 * src/modules/analytics/analytics.controller.js
 *
 * WHAT THIS FILE DOES:
 *   Controller layer for administrative content analytics HTTP requests.
 *   Dispatches incoming requests to analyticsService and formats output using ApiResponse.
 *
 * OVERALL DESIGN:
 *   Thin controller layer following the 5-tier architecture.
 *   Does not execute database queries directly; handles HTTP envelope and status codes.
 *
 * ELEMENTS IN THIS FILE:
 *   - getContentAnalytics(req, res): Express handler for GET /api/v1/admin/analytics/content
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing Express controller handlers for analytics.
 *
 * IMPORTED BY:
 *   src/modules/analytics/analytics.admin.routes.js
 */

const analyticsService = require('./analytics.service');
const ApiResponse = require('../../core/utils/ApiResponse');

const analyticsController = {
  /**
   * getContentAnalytics
   *
   * USE:
   *   Express handler for GET /api/v1/admin/analytics/content.
   *
   * HOW IT WORKS:
   *   1. Forwards req.query to analyticsService.getContentAnalytics.
   *   2. Wraps the result in standard ApiResponse.success envelope.
   *   3. Sends HTTP 200 response to client.
   *
   * CONCEPTS:
   *   Express controller pattern, standard response envelope.
   *
   * PLACES IMPORTED AND USED:
   *   src/modules/analytics/analytics.admin.routes.js
   *
   * FINAL OUTPUT:
   *   JSON HTTP response containing content analytics metrics.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async getContentAnalytics(req, res) {
    const data = await analyticsService.getContentAnalytics(req.query);
    return ApiResponse.success(res, data);
  },
};

module.exports = analyticsController;
