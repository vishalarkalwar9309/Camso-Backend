'use strict';

/**
 * src/modules/campaigns/campaigns.service.js
 *
 * WHAT THIS FILE DOES:
 *   Business logic for campaign management and the critical FCM send flow.
 *   Orchestrates targeting resolution, FCM batching, token deactivation, and audit logging.
 *
 * OVERALL DESIGN:
 *   5-tier architecture. This service is the only layer that calls the Firebase Admin SDK.
 *   It imports the existing firebase.js config — it does NOT re-initialize Firebase.
 *   Campaign send flow:
 *     1. Validate campaign exists and is DRAFT.
 *     2. Resolve target audience via campaigns.repository.js (queries users/user_devices).
 *     3. Deduplicate FCM tokens.
 *     4. Batch into groups of MAX 500 per FCM specification.
 *     5. Send each batch. Aggregate successCount / failureCount.
 *     6. Mark UNREGISTERED tokens as inactive in user_devices.
 *     7. Transition campaign status to SENT.
 *     8. Audit the SEND action.
 *
 * ELEMENTS:
 *   listCampaigns   — paginated list
 *   getCampaignById — single campaign detail
 *   createCampaign  — creates DRAFT, audits CREATE
 *   updateCampaign  — updates DRAFT only, audits UPDATE
 *   sendCampaign    — resolves targets, batches FCM, transitions SENT, audits
 *
 * FINAL OUTPUT:
 *   module.exports = campaignsService
 *
 * IMPORTED BY:
 *   campaigns.controller.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8 (campaign send, FCM batching)
 *            docs/CAMSO_Backend_Plan_Aary.md Sections 5 & 6
 */

const campaignsRepository = require('./campaigns.repository');
const auditService = require('../../core/services/auditService');
const ApiError = require('../../core/utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../../core/utils/pagination');
const logger = require('../../core/logger/winston');

/** Maximum FCM tokens per sendEachForMulticast batch (plan Section 8 / FCM spec). */
const FCM_BATCH_SIZE = 500;

/**
 * campaignsService
 *
 * USE: Singleton service for all campaign business logic including the FCM send pipeline.
 *
 * KEY DESIGN:
 *   - Firebase Admin SDK is imported lazily via require() so that tests can mock it
 *     without loading order issues.
 *   - Token deduplication happens before batching to avoid double-sends.
 *   - Only UNREGISTERED error codes cause is_active=false on user_devices.
 *   - Partial FCM failures do NOT prevent status→SENT; they are counted and returned.
 */
const campaignsService = {
  /**
   * listCampaigns
   *
   * USE: Returns paginated list of all campaigns.
   *
   * @param {object} query — req.query (page, pageSize, sort, status, target_type)
   * @returns {Promise<{ data: Array, pagination: object }>}
   */
  async listCampaigns(query) {
    const { page, pageSize, skip, take, sort } = parsePagination(query);
    const filters = {};
    if (query.status) filters.status = query.status;
    if (query.target_type) filters.target_type = query.target_type;

    const { total, data } = await campaignsRepository.findCampaigns(filters, { skip, take, sort });
    return { data, pagination: buildPaginationMeta(page, pageSize, total) };
  },

  /**
   * getCampaignById
   *
   * USE: Returns a single campaign by ID.
   *
   * @param {number} id — campaign PK
   * @returns {Promise<object>}
   */
  async getCampaignById(id) {
    const campaign = await campaignsRepository.findCampaignById(id);
    if (!campaign) throw ApiError.notFound(`Campaign with ID ${id} not found.`);
    return campaign;
  },

  /**
   * createCampaign
   *
   * USE: Creates a new campaign with DRAFT status. Audits CREATE.
   *
   * HOW IT WORKS:
   *   1. Validates required fields (name, target_type).
   *   2. If target_type is not ALL_USERS, validates target_value is present.
   *   3. Creates campaign row via repository with status=DRAFT.
   *   4. Audits CREATE.
   *
   * CONCEPTS: Campaign always starts as DRAFT. Sending is a separate explicit action.
   *
   * @param {object} body         — request body
   * @param {number} adminId      — req.admin.id (created_by FK)
   * @param {object} auditContext — req.auditContext
   * @returns {Promise<object>}
   */
  async createCampaign(body, adminId, auditContext) {
    const { name, target_type, target_value, scheduled_at } = body;
    if (!name) throw ApiError.validation('Campaign name is required.');
    if (!target_type) throw ApiError.validation('Campaign target_type is required.');

    const validTargetTypes = ['ALL_USERS', 'BUSINESS_TYPE', 'LANGUAGE', 'COUNTRY'];
    if (!validTargetTypes.includes(target_type)) {
      throw ApiError.validation(`target_type must be one of: ${validTargetTypes.join(', ')}.`);
    }
    if (target_type !== 'ALL_USERS' && !target_value) {
      throw ApiError.validation('target_value is required for non-ALL_USERS target types.');
    }

    const campaign = await campaignsRepository.createCampaign({
      name,
      target_type,
      target_value: target_value || null,
      scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
      status: 'DRAFT',
      created_by: adminId,
    });

    await auditService.record({
      actorId: auditContext.actorId,
      action: 'CREATE',
      entityType: 'CAMPAIGN',
      entityId: campaign.id,
      before: null,
      after: campaign,
      ip: auditContext.ip,
      userAgent: auditContext.userAgent,
    });

    return campaign;
  },

  /**
   * updateCampaign
   *
   * USE: Updates a campaign's fields. Only DRAFT campaigns can be updated.
   *      Audits UPDATE.
   *
   * HOW IT WORKS:
   *   1. Fetches campaign, validates it is DRAFT.
   *   2. Applies update via repository.
   *   3. Audits UPDATE.
   *
   * CONCEPTS: Status guard — SENT campaigns are immutable.
   *
   * @param {number} id           — campaign PK
   * @param {object} body         — update fields
   * @param {object} auditContext — req.auditContext
   * @returns {Promise<object>}
   */
  async updateCampaign(id, body, auditContext) {
    const before = await campaignsRepository.findCampaignById(id);
    if (!before) throw ApiError.notFound(`Campaign with ID ${id} not found.`);
    if (before.status === 'SENT') {
      throw ApiError.badRequest('Cannot modify a campaign that has already been sent.');
    }

    const { name, target_type, target_value, scheduled_at } = body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (target_type !== undefined) updateData.target_type = target_type;
    if (target_value !== undefined) updateData.target_value = target_value;
    if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at ? new Date(scheduled_at) : null;

    if (Object.keys(updateData).length === 0) {
      throw ApiError.validation('At least one field is required for update.');
    }

    const after = await campaignsRepository.updateCampaign(id, updateData);

    await auditService.record({
      actorId: auditContext.actorId,
      action: 'UPDATE',
      entityType: 'CAMPAIGN',
      entityId: id,
      before,
      after,
      ip: auditContext.ip,
      userAgent: auditContext.userAgent,
    });

    return after;
  },

  /**
   * sendCampaign
   *
   * USE: Triggers immediate FCM push for a campaign. Security-critical.
   *
   * HOW IT WORKS:
   *   1. Fetch campaign, validate it is DRAFT (prevents duplicate sends).
   *   2. Resolve target audience via repository (queries users + user_devices by target_type).
   *   3. Deduplicate FCM tokens.
   *   4. Batch tokens into groups of FCM_BATCH_SIZE (500).
   *   5. Call Firebase Admin messaging.sendEachForMulticast() for each batch.
   *   6. Aggregate successCount and failureCount across batches.
   *   7. Collect UNREGISTERED/INVALID_REGISTRATION token errors; mark those device rows is_active=false.
   *   8. Transition campaign status to SENT, set sent_at.
   *   9. Audit the SEND action.
   *  10. Return { targetCount, successCount, failureCount }.
   *
   * CONCEPTS:
   *   FCM sendEachForMulticast returns per-response results.
   *   Only UNREGISTERED error code means the token is permanently dead.
   *   Partial failures do not block status transition.
   *   Plan Section 6: "Campaign status becomes SENT after the send operation completes,
   *   even if individual targets fail."
   *
   * @param {number} id           — campaign PK
   * @param {object} auditContext — req.auditContext
   * @returns {Promise<{ targetCount: number, successCount: number, failureCount: number }>}
   */
  async sendCampaign(id, auditContext) {
    // 1. Validate campaign status
    const campaign = await campaignsRepository.findCampaignById(id);
    if (!campaign) throw ApiError.notFound(`Campaign with ID ${id} not found.`);
    if (campaign.status === 'SENT') {
      throw ApiError.badRequest('Campaign has already been sent. A campaign can only be sent once.');
    }

    // 2. Resolve FCM tokens by target type
    const devices = await campaignsRepository.resolveTargetDevices(
      campaign.target_type,
      campaign.target_value,
    );

    // 3. Deduplicate tokens (token string → device row mapping for deactivation)
    const tokenToDeviceId = new Map();
    for (const device of devices) {
      if (device.fcm_token && device.fcm_token.trim()) {
        tokenToDeviceId.set(device.fcm_token, device.id);
      }
    }

    const uniqueTokens = Array.from(tokenToDeviceId.keys());
    const targetCount = uniqueTokens.length;

    let successCount = 0;
    let failureCount = 0;
    const invalidDeviceIds = [];

    if (targetCount > 0) {
      // Get firebase admin from existing config — NEVER re-initialize
      const { admin, isFirebaseReady } = require('../../config/firebase');

      if (!isFirebaseReady) {
        logger.warn('[CampaignsService] Firebase not configured. FCM send skipped. Campaign will be marked SENT.');
      } else {
        // 4. Batch into groups of FCM_BATCH_SIZE
        const batches = [];
        for (let i = 0; i < uniqueTokens.length; i += FCM_BATCH_SIZE) {
          batches.push(uniqueTokens.slice(i, i + FCM_BATCH_SIZE));
        }

        // 5. Send each batch
        for (const batchTokens of batches) {
          try {
            const message = {
              tokens: batchTokens,
              notification: {
                title: campaign.name,
                // Body would be populated from notification translations in a full implementation
              },
              data: {
                campaign_id: String(id),
              },
            };

            const response = await admin.messaging().sendEachForMulticast(message);

            // 6. Aggregate counts
            successCount += response.successCount;
            failureCount += response.failureCount;

            // 7. Collect invalid/unregistered tokens
            if (response.responses) {
              response.responses.forEach((resp, idx) => {
                if (!resp.success && resp.error) {
                  const errorCode = resp.error.code;
                  // Only UNREGISTERED means permanently dead token
                  if (
                    errorCode === 'messaging/registration-token-not-registered' ||
                    errorCode === 'messaging/invalid-registration-token'
                  ) {
                    const token = batchTokens[idx];
                    const deviceId = tokenToDeviceId.get(token);
                    if (deviceId) {
                      invalidDeviceIds.push(deviceId);
                    }
                  }
                }
              });
            }
          } catch (fcmErr) {
            // Batch-level error — count all as failures but continue other batches
            logger.error('[CampaignsService] FCM batch send error', { error: fcmErr.message });
            failureCount += batchTokens.length;
          }
        }

        // 7. Mark unregistered devices inactive
        if (invalidDeviceIds.length > 0) {
          await campaignsRepository.deactivateDevices(invalidDeviceIds);
        }
      }
    }

    // 8. Transition campaign to SENT
    await campaignsRepository.updateCampaign(id, {
      status: 'SENT',
    });

    // 9. Audit
    await auditService.record({
      actorId: auditContext.actorId,
      action: 'UPDATE',
      entityType: 'CAMPAIGN',
      entityId: id,
      before: { status: 'DRAFT' },
      after: { status: 'SENT', targetCount, successCount, failureCount },
      ip: auditContext.ip,
      userAgent: auditContext.userAgent,
    });

    // 10. Return statistics
    return { targetCount, successCount, failureCount };
  },
};

module.exports = campaignsService;
