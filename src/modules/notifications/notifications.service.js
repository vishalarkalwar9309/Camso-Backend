'use strict';

/**
 * src/modules/notifications/notifications.service.js
 *
 * WHAT THIS FILE DOES:
 *   Business logic for public notification feed.
 *
 * OVERALL DESIGN:
 *   Retrieves SENT notifications and merges their translated title/body.
 *
 * ELEMENTS:
 *   getPublicFeed              — retrieves SENT notifications and merges their translated title/body
 *   adminListNotifications     — admin paginated list (all statuses)
 *   adminGetNotificationById   — admin single notification with translations
 *   adminCreateNotification    — creates notification, audits CREATE
 *   adminUpdateNotification    — updates notification, audits UPDATE
 *
 * FINAL OUTPUT:
 *   module.exports = notificationsService
 *
 * IMPORTED BY:
 *   notifications.controller.js
 */

const notificationsRepository = require('./notifications.repository');
const { getManyTranslations, attachManyTranslations, getTranslations, attachTranslations, upsertTranslations } = require('../../core/utils/translate');
const { buildPaginationMeta, parsePagination } = require('../../core/utils/pagination');
const auditService = require('../../core/services/auditService');
const ApiError = require('../../core/utils/ApiError');

const notificationsService = {
  /**
   * getPublicFeed
   * Fetches paginated notifications and their translated fields.
   */
  async getPublicFeed(query) {
    const { total, data, page, pageSize } = await notificationsRepository.findPublicFeed(query);
    
    if (data.length > 0) {
      const entityIds = data.map((n) => n.id);
      const translations = await getManyTranslations('NOTIFICATION', entityIds);
      const translatedData = attachManyTranslations(data, translations, query.lang || 'en');
      
      return {
        data: translatedData,
        meta: buildPaginationMeta(page, pageSize, total)
      };
    }

    return {
      data: [],
      meta: buildPaginationMeta(page, pageSize, total)
    };
  },

  /**
   * adminListNotifications
   *
   * USE: Returns paginated notifications for admin view (all statuses, all records).
   *
   * HOW IT WORKS:
   *   Parses pagination. Passes optional filters (notification_type, status, product_id).
   *   Fetches translations for the list and attaches them.
   *
   * @param {object} query — req.query
   * @returns {Promise<{ data: Array, pagination: object }>}
   */
  async adminListNotifications(query) {
    const { page, pageSize, skip, take, sort } = parsePagination(query);
    const filters = {};
    if (query.notification_type) filters.notification_type = query.notification_type;
    if (query.status) filters.status = query.status;
    if (query.product_id) filters.product_id = parseInt(query.product_id, 10);
    if (query.campaign_id) filters.campaign_id = parseInt(query.campaign_id, 10);

    const { total, data } = await notificationsRepository.findAdminNotifications(filters, { skip, take, sort });
    const lang = query.lang || 'en';
    if (data.length > 0) {
      const entityIds = data.map((n) => n.id);
      const translations = await getManyTranslations('NOTIFICATION', entityIds);
      const translatedData = attachManyTranslations(data, translations, lang);
      return { data: translatedData, pagination: buildPaginationMeta(page, pageSize, total) };
    }
    return { data: [], pagination: buildPaginationMeta(page, pageSize, total) };
  },

  /**
   * adminGetNotificationById
   *
   * USE: Returns a single notification by ID for admin (any status).
   *      Includes all translated fields (title, body) for the requested language.
   *
   * @param {number} id   — notification PK
   * @param {string} lang — language code (default 'en')
   * @returns {Promise<object>}
   */
  async adminGetNotificationById(id, lang = 'en') {
    const notification = await notificationsRepository.findAdminNotificationById(id);
    if (!notification) throw ApiError.notFound(`Notification with ID ${id} not found.`);
    const translations = await getTranslations('NOTIFICATION', id);
    return attachTranslations(notification, translations, lang);
  },

  /**
   * adminCreateNotification
   *
   * USE: Creates a new notification record (initially not SENT — SENT status is set by campaign send).
   *      Upserts translations for title and body if provided.
   *      Audits a CREATE event.
   *
   * HOW IT WORKS:
   *   1. Inserts notification row via repository.
   *   2. If translations provided (title/body per language), upserts via translate.js.
   *   3. Calls auditService.record(CREATE).
   *
   * @param {object} body         — request body (notification_type, product_id, translations[])
   * @param {number} adminId      — req.admin.id (created_by FK)
   * @param {object} auditContext — req.auditContext
   * @returns {Promise<object>}
   */
  async adminCreateNotification(body, adminId, auditContext) {
    const { notification_type, product_id, campaign_id, translations } = body;
    if (!notification_type) throw ApiError.validation('notification_type is required.');

    const notification = await notificationsRepository.createNotification({
      notification_type,
      product_id: product_id || null,
      campaign_id: campaign_id || null,
      created_by: adminId,
      status: 'DRAFT',
    });

    if (translations && Array.isArray(translations) && translations.length > 0) {
      const fields = {};
      for (const t of translations) {
        if (t.field && t.language_code && t.value !== undefined) {
          if (!fields[t.field]) fields[t.field] = {};
          fields[t.field][t.language_code] = t.value;
        }
      }
      await upsertTranslations('NOTIFICATION', notification.id, fields);
    }

    await auditService.record({
      actorId: auditContext.actorId,
      action: 'CREATE',
      entityType: 'NOTIFICATION',
      entityId: notification.id,
      before: null,
      after: notification,
      ip: auditContext.ip,
      userAgent: auditContext.userAgent,
    });

    return notification;
  },

  /**
   * adminUpdateNotification
   *
   * USE: Updates notification fields and/or translations. Audits UPDATE.
   *
   * HOW IT WORKS:
   *   1. Fetches before state.
   *   2. Applies field updates via repository.
   *   3. If translations provided, upserts them.
   *   4. Audits UPDATE.
   *
   * @param {number} id           — notification PK
   * @param {object} body         — update fields and optional translations[]
   * @param {object} auditContext — req.auditContext
   * @returns {Promise<object>}
   */
  async adminUpdateNotification(id, body, auditContext) {
    const before = await notificationsRepository.findAdminNotificationById(id);
    if (!before) throw ApiError.notFound(`Notification with ID ${id} not found.`);

    const { translations, ...updateFields } = body;
    let after = before;

    if (Object.keys(updateFields).length > 0) {
      after = await notificationsRepository.updateNotification(id, updateFields);
    }

    if (translations && Array.isArray(translations) && translations.length > 0) {
      const fields = {};
      for (const t of translations) {
        if (t.field && t.language_code && t.value !== undefined) {
          if (!fields[t.field]) fields[t.field] = {};
          fields[t.field][t.language_code] = t.value;
        }
      }
      await upsertTranslations('NOTIFICATION', id, fields);
    }

    await auditService.record({
      actorId: auditContext.actorId,
      action: 'UPDATE',
      entityType: 'NOTIFICATION',
      entityId: id,
      before,
      after,
      ip: auditContext.ip,
      userAgent: auditContext.userAgent,
    });

    return after;
  },
};

module.exports = notificationsService;
