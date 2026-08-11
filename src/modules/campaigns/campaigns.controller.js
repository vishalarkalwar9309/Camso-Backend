'use strict';

/**
 * src/modules/campaigns/campaigns.controller.js
 *
 * WHAT THIS FILE DOES:
 *   HTTP request handlers for the admin campaigns endpoints.
 *   Validates requests, calls campaignsService, returns ApiResponse envelopes.
 *
 * OVERALL DESIGN:
 *   Thin controller layer. No database access, no business logic.
 *   All logic delegated to campaignsService.
 *
 * ELEMENTS:
 *   adminList    — handles GET /api/v1/admin/campaigns
 *   adminGetById — handles GET /api/v1/admin/campaigns/:id
 *   adminCreate  — handles POST /api/v1/admin/campaigns
 *   adminUpdate  — handles PATCH /api/v1/admin/campaigns/:id
 *   adminSend    — handles POST /api/v1/admin/campaigns/:id/send (FCM trigger)
 *
 * FINAL OUTPUT:
 *   module.exports = campaignsController
 *
 * IMPORTED BY:
 *   campaigns.admin.routes.js
 */

const campaignsService = require('./campaigns.service');
const ApiResponse = require('../../core/utils/ApiResponse');
const ApiError = require('../../core/utils/ApiError');

const campaignsController = {
  /**
   * adminList
   * USE: Express handler for GET /api/v1/admin/campaigns.
   * Returns paginated campaign records.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminList(req, res) {
    const { data, pagination } = await campaignsService.listCampaigns(req.query);
    return ApiResponse.paginated(res, data, pagination);
  },

  /**
   * adminGetById
   * USE: Express handler for GET /api/v1/admin/campaigns/:id.
   * Returns a single campaign by ID.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminGetById(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw ApiError.validation('Invalid campaign ID.');
    const campaign = await campaignsService.getCampaignById(id);
    return ApiResponse.success(res, campaign);
  },

  /**
   * adminCreate
   * USE: Express handler for POST /api/v1/admin/campaigns.
   * Creates a new campaign as DRAFT. Audited.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminCreate(req, res) {
    const campaign = await campaignsService.createCampaign(req.body, req.admin.id, req.auditContext);
    return ApiResponse.success(res, campaign, 201);
  },

  /**
   * adminUpdate
   * USE: Express handler for PATCH /api/v1/admin/campaigns/:id.
   * Updates campaign fields. SENT campaigns cannot be re-edited.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminUpdate(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw ApiError.validation('Invalid campaign ID.');
    const campaign = await campaignsService.updateCampaign(id, req.body, req.auditContext);
    return ApiResponse.success(res, campaign);
  },

  /**
   * adminSend
   *
   * USE: Express handler for POST /api/v1/admin/campaigns/:id/send.
   * Security-critical: Triggers immediate FCM push for the campaign's target audience.
   *
   * HOW IT WORKS:
   *   1. Validates campaign ID.
   *   2. Delegates entirely to campaignsService.sendCampaign().
   *   3. Returns FCM send statistics (targetCount, successCount, failureCount).
   *
   * CONCEPTS: Campaign send is a mutation (audited). FCM batching is in the service.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async adminSend(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw ApiError.validation('Invalid campaign ID.');
    const result = await campaignsService.sendCampaign(id, req.auditContext);
    return ApiResponse.success(res, result);
  },
};

module.exports = campaignsController;
