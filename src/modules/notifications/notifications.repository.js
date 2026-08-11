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
 *   findPublicFeed — fetches paginated SENT notifications
 *
 * FINAL OUTPUT:
 *   module.exports = notificationsRepository
 *
 * IMPORTED BY:
 *   notifications.service.js
 */

const prisma = require('../../config/database');
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
  }
};

module.exports = notificationsRepository;
