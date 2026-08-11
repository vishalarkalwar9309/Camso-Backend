'use strict';

/**
 * src/modules/notifications/notifications.repository.js
 *
 * WHAT THIS FILE DOES:
 *   Database access for notifications using Prisma.
 *
 * OVERALL DESIGN:
 *   Only fetches SENT notifications. 
 *
 * ELEMENTS:
 *   findPublicFeed             — fetches paginated SENT notifications
 *   findAdminNotifications     — paginated admin list (all statuses)
 *   findAdminNotificationById  — single notification by ID
 *   createNotification         — inserts new notification row
 *   updateNotification         — updates notification fields
 *
 * FINAL OUTPUT:
 *   module.exports = notificationsRepository
 *
 * IMPORTED BY:
 *   notifications.service.js
 */

const { prisma } = require('../../config/database');
const { parsePagination, parseSort } = require('../../core/utils/pagination');

const notificationsRepository = {
  /**
   * findPublicFeed
   * Fetches paginated notifications that have status = 'SENT'.
   */
  async findPublicFeed(query) {
    const { page, pageSize, skip, take, sort } = parsePagination(query, {
      sort: '-sent_at'
    });
    
    // Allow list for sorting
    const { orderBy } = parseSort(sort, ['created_at', 'sent_at'], 'sent_at', 'desc');

    const where = { status: 'SENT' };

    const [total, data] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          product_id: true,
          notification_type: true,
          sent_at: true
        }
      })
    ]);

    return { total, data, page, pageSize };
  },

  /**
   * findAdminNotifications
   *
   * USE: Returns paginated notifications for admin view (all statuses, all records).
   *
   * HOW IT WORKS:
   *   Builds where clause from optional filters. Applies parseSort. Runs count + findMany.
   *
   * @param {object} filters    — { notification_type, status, product_id, campaign_id }
   * @param {object} pagination — { skip, take, sort }
   * @returns {Promise<{ total: number, data: Array }>}
   */
  async findAdminNotifications(filters, pagination) {
    const ALLOWED_SORT = ['id', 'created_at', 'sent_at', 'status', 'notification_type'];
    const { orderBy } = parseSort(pagination.sort, ALLOWED_SORT, 'created_at', 'desc');

    const where = {};
    if (filters.notification_type) where.notification_type = filters.notification_type;
    if (filters.status) where.status = filters.status;
    if (filters.product_id) where.product_id = filters.product_id;
    if (filters.campaign_id) where.campaign_id = filters.campaign_id;

    const [total, data] = await prisma.$transaction([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        select: {
          id: true,
          product_id: true,
          campaign_id: true,
          notification_type: true,
          created_by: true,
          status: true,
          sent_at: true,
        },
      }),
    ]);
    return { total, data };
  },

  /**
   * findAdminNotificationById
   *
   * USE: Fetches a single notification by ID for admin view (any status).
   *
   * @param {number} id — notification PK
   * @returns {Promise<object|null>}
   */
  async findAdminNotificationById(id) {
    return prisma.notification.findUnique({
      where: { id },
      select: {
        id: true,
        product_id: true,
        campaign_id: true,
        notification_type: true,
        created_by: true,
        status: true,
        sent_at: true,
      },
    });
  },

  /**
   * createNotification
   *
   * USE: Inserts a new notification row with DRAFT status.
   *
   * @param {object} data — { notification_type, product_id, campaign_id, created_by, status }
   * @returns {Promise<object>}
   */
  async createNotification(data) {
    return prisma.notification.create({ data });
  },

  /**
   * updateNotification
   *
   * USE: Updates notification fields by primary key.
   *
   * @param {number} id   — notification PK
   * @param {object} data — update fields
   * @returns {Promise<object>}
   */
  async updateNotification(id, data) {
    return prisma.notification.update({ where: { id }, data });
  },
};

module.exports = notificationsRepository;
