'use strict';

/**
 * src/modules/campaigns/campaigns.repository.js
 *
 * WHAT THIS FILE DOES:
 *   Database access for campaign management and FCM target resolution.
 *   This is the ONLY file in this module that imports Prisma directly.
 *
 * OVERALL DESIGN:
 *   Cross-domain rule (master plan Section 3): Aary's campaign repository is permitted
 *   to query Vishal's tables (users, user_devices) directly via Prisma.
 *   It does NOT import Vishal's repository or service files.
 *
 * ELEMENTS:
 *   findCampaigns         — paginated campaigns list with filters
 *   findCampaignById      — single campaign by ID
 *   createCampaign        — inserts new campaign row
 *   updateCampaign        — updates campaign fields
 *   resolveTargetDevices  — resolves FCM target audience by target_type
 *   deactivateDevices     — marks user_devices rows as is_active=false (invalid tokens)
 *
 * FINAL OUTPUT:
 *   module.exports = campaignsRepository
 *
 * IMPORTED BY:
 *   campaigns.service.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 3 (Cross-domain query rule)
 *            docs/CAMSO_Backend_Plan_Aary.md Section 3 (Cross-domain tables)
 *            docs/CAMSO_Backend_Plan_Aary.md Section 5 (Campaign targeting reference)
 */

const { prisma } = require('../../config/database');
const { parseSort } = require('../../core/utils/pagination');

const ALLOWED_SORT = ['id', 'name', 'status', 'target_type', 'created_at', 'scheduled_at'];

/**
 * campaignsRepository
 *
 * USE: Data access layer for campaigns and cross-domain FCM targeting.
 *
 * KEY DESIGN:
 *   resolveTargetDevices implements the authoritative targeting logic from the plan:
 *     ALL_USERS     → all active user_devices
 *     BUSINESS_TYPE → users WHERE business_type = target_value, joined to active user_devices
 *     LANGUAGE      → users WHERE preferred_language = target_value, joined to active user_devices
 *     COUNTRY       → users WHERE country_code = target_value, joined to active user_devices
 */
const campaignsRepository = {
  /**
   * findCampaigns
   *
   * USE: Returns paginated list of campaigns with optional filters.
   *
   * @param {object} filters    — { status, target_type }
   * @param {object} pagination — { skip, take, sort }
   * @returns {Promise<{ total: number, data: Array }>}
   */
  async findCampaigns(filters, pagination) {
    const { orderBy } = parseSort(pagination.sort, ALLOWED_SORT, 'created_at', 'desc');
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.target_type) where.target_type = filters.target_type;

    const [total, data] = await prisma.$transaction([
      prisma.campaign.count({ where }),
      prisma.campaign.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
      }),
    ]);
    return { total, data };
  },

  /**
   * findCampaignById
   *
   * USE: Fetches a single campaign by PK.
   *
   * @param {number} id — campaign PK
   * @returns {Promise<object|null>}
   */
  async findCampaignById(id) {
    return prisma.campaign.findUnique({ where: { id } });
  },

  /**
   * createCampaign
   *
   * USE: Inserts a new campaign row with DRAFT status.
   *
   * @param {object} data — { name, target_type, target_value, scheduled_at, status, created_by }
   * @returns {Promise<object>}
   */
  async createCampaign(data) {
    return prisma.campaign.create({ data });
  },

  /**
   * updateCampaign
   *
   * USE: Updates campaign fields by primary key.
   *
   * @param {number} id   — campaign PK
   * @param {object} data — update fields
   * @returns {Promise<object>}
   */
  async updateCampaign(id, data) {
    return prisma.campaign.update({ where: { id }, data });
  },

  /**
   * resolveTargetDevices
   *
   * USE: Resolves the set of user_devices to target for a campaign send.
   *
   * HOW IT WORKS:
   *   Implements the four target_type cases from the authoritative plan:
   *
   *   ALL_USERS:
   *     → SELECT from user_devices WHERE is_active = true
   *
   *   BUSINESS_TYPE (target_value = e.g. "Distributor"):
   *     → SELECT user_devices WHERE is_active = true AND user_id IN
   *        (SELECT id FROM users WHERE business_type = target_value)
   *
   *   LANGUAGE (target_value = e.g. "fr"):
   *     → SELECT user_devices WHERE is_active = true AND user_id IN
   *        (SELECT id FROM users WHERE preferred_language = target_value)
   *
   *   COUNTRY (target_value = e.g. "IN"):
   *     → SELECT user_devices WHERE is_active = true AND user_id IN
   *        (SELECT id FROM users WHERE country_code = target_value)
   *
   *   Cross-domain rule: Queries users/user_devices via Prisma directly.
   *   Never imports Vishal's module files.
   *
   * CONCEPTS: Campaign targeting, cross-domain read, Prisma relational queries.
   *
   * @param {string} targetType  — 'ALL_USERS' | 'BUSINESS_TYPE' | 'LANGUAGE' | 'COUNTRY'
   * @param {string|null} targetValue — the filter value for non-ALL_USERS types
   * @returns {Promise<Array<{ id: number, fcm_token: string }>>}
   */
  async resolveTargetDevices(targetType, targetValue) {
    // Base query: active devices only. Null/empty fcm_token filtered in service.
    const baseWhere = { is_active: true };

    if (targetType === 'ALL_USERS') {
      return prisma.userDevice.findMany({
        where: { is_active: true },
        select: { id: true, fcm_token: true },
      });
    }

    // For user-scoped targeting, first resolve matching user IDs
    let userFilter = {};
    if (targetType === 'BUSINESS_TYPE') {
      userFilter = { business_type: targetValue };
    } else if (targetType === 'LANGUAGE') {
      userFilter = { preferred_language: targetValue };
    } else if (targetType === 'COUNTRY') {
      userFilter = { country_code: targetValue };
    }

    // Get matching user IDs
    const users = await prisma.user.findMany({
      where: userFilter,
      select: { id: true },
    });

    if (users.length === 0) return [];

    const userIds = users.map((u) => u.id);

    return prisma.userDevice.findMany({
      where: {
        ...baseWhere,
        user_id: { in: userIds },
      },
      select: { id: true, fcm_token: true },
    });
  },

  /**
   * deactivateDevices
   *
   * USE: Marks user_device rows as is_active=false for permanently invalid FCM tokens.
   *      Called after a campaign send when Firebase returns UNREGISTERED error codes.
   *
   * HOW IT WORKS:
   *   Batch update via Prisma updateMany on the provided device IDs.
   *
   * CONCEPTS: Token invalidation, Prisma updateMany.
   *
   * @param {number[]} deviceIds — array of user_device PKs to deactivate
   * @returns {Promise<void>}
   */
  async deactivateDevices(deviceIds) {
    if (!deviceIds || deviceIds.length === 0) return;
    await prisma.userDevice.updateMany({
      where: { id: { in: deviceIds } },
      data: { is_active: false },
    });
  },
};

module.exports = campaignsRepository;
