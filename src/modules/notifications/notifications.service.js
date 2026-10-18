'use strict';

/**
 * src/modules/notifications/notifications.service.js
 *
 * FCM Push Notification & Campaign Dispatch Service + Public & Admin Notification Feed.
 */

const prisma = require('../../config/database');
const fcmService = require('../../core/services/fcmService');
const auditService = require('../../core/services/auditService');
const ApiError = require('../../core/utils/ApiError');
const notificationsRepository = require('./notifications.repository');
const {
  getManyTranslations,
  attachManyTranslations,
  getTranslations,
  attachTranslations,
  upsertTranslations,
} = require('../../core/utils/translate');
const { buildPaginationMeta, parsePagination } = require('../../core/utils/pagination');

/**
 * Resolves active device tokens matching the target strategy.
 */
async function resolveTargetTokens(targetType = 'ALL_USERS', targetValue = null) {
  const where = {
    is_active: true,
    fcm_token: { not: null },
  };

  if (targetType === 'PLATFORM' && targetValue) {
    const upperPlatform = targetValue.toUpperCase();
    if (upperPlatform === 'ANDROID' || upperPlatform === 'IOS') {
      where.platform = upperPlatform;
    }
  } else if (targetType === 'LANGUAGE' && targetValue) {
    where.user = {
      preferred_language: targetValue.toLowerCase(),
    };
  }

  const devices = await prisma.userDevice.findMany({
    where,
    select: { fcm_token: true },
  });

  return devices.map((d) => d.fcm_token).filter(Boolean);
}

/**
 * Dispatches a push notification broadcast to target devices.
 */
async function dispatchNotification({
  title,
  body = '',
  target_type = 'ALL_USERS',
  target_value = null,
  data = {},
}, actor) {
  if (!title || typeof title !== 'string' || title.trim() === '') {
    throw ApiError.badRequest('Notification title is required.');
  }

  const tokens = await resolveTargetTokens(target_type, target_value);

  const result = await fcmService.sendMulticastNotification({
    tokens,
    title: title.trim(),
    body: (body || '').trim(),
    data: data || {},
    deactivateInvalidDevices: true,
  });

  // Record audit log
  if (actor) {
    await auditService.recordAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'CREATE',
      entityType: 'NOTIFICATION_DISPATCH',
      details: {
        title,
        target_type,
        target_value,
        totalTokens: result.totalTokens,
        successCount: result.successCount,
        failureCount: result.failureCount,
        is_mock: result.is_mock,
      },
    });
  }

  return {
    targetCount: result.totalTokens,
    successCount: result.successCount,
    failureCount: result.failureCount,
    invalidTokensCount: result.invalidTokens.length,
    is_mock: result.is_mock,
  };
}

/**
 * Fetches paginated public notification feed and attaches translated fields.
 */
async function getPublicFeed(query = {}) {
  const { total, data, page, pageSize } = await notificationsRepository.findPublicFeed(query);

  if (data.length > 0) {
    const entityIds = data.map((n) => n.id);
    const translations = await getManyTranslations('NOTIFICATION', entityIds);
    const translatedData = attachManyTranslations(data, translations, query.lang || 'en');

    return {
      data: translatedData,
      meta: buildPaginationMeta(page, pageSize, total),
    };
  }

  return {
    data: [],
    meta: buildPaginationMeta(page, pageSize, total),
  };
}

/**
 * Returns paginated notifications for admin view.
 */
async function adminListNotifications(query = {}) {
  const { page, pageSize, skip, take, sort } = parsePagination(query);
  const filters = {};
  if (query.notification_type) filters.notification_type = query.notification_type;
  if (query.status) filters.status = query.status;
  if (query.product_id) filters.product_id = String(query.product_id);
  if (query.campaign_id) filters.campaign_id = String(query.campaign_id);

  const { total, data } = await notificationsRepository.findAdminNotifications(filters, { skip, take, sort });
  const lang = query.lang || 'en';
  if (data.length > 0) {
    const entityIds = data.map((n) => n.id);
    const translations = await getManyTranslations('NOTIFICATION', entityIds);
    const translatedData = attachManyTranslations(data, translations, lang);
    return { data: translatedData, pagination: buildPaginationMeta(page, pageSize, total) };
  }
  return { data: [], pagination: buildPaginationMeta(page, pageSize, total) };
}

/**
 * Returns a single notification by ID for admin.
 */
async function adminGetNotificationById(id, lang = 'en') {
  const notification = await notificationsRepository.findAdminNotificationById(id);
  if (!notification) throw ApiError.notFound(`Notification with ID ${id} not found.`);
  const translations = await getTranslations('NOTIFICATION', id);
  return attachTranslations(notification, translations, lang);
}

/**
 * Creates a new notification record.
 */
async function adminCreateNotification(body, adminId, auditContext = {}) {
  const { notification_type, product_id, campaign_id, translations } = body;
  if (!notification_type) throw ApiError.validation('notification_type is required.');

  const effectiveAdminId = (!adminId || adminId === 'demo_admin_user') ? 'cmvccz1420001ulvcgggd3s4g' : String(adminId);

  const notification = await notificationsRepository.createNotification({
    notification_type,
    product_id: product_id ? String(product_id) : null,
    campaign_id: campaign_id ? String(campaign_id) : null,
    created_by: effectiveAdminId,
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
    actorId: auditContext.actorId || adminId,
    action: 'CREATE',
    entityType: 'NOTIFICATION',
    entityId: notification.id,
    before: null,
    after: notification,
    ip: auditContext.ip,
    userAgent: auditContext.userAgent,
  });

  return notification;
}

/**
 * Updates notification fields and/or translations.
 */
async function adminUpdateNotification(id, body, auditContext = {}) {
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
}

const notificationsService = {
  resolveTargetTokens,
  dispatchNotification,
  getPublicFeed,
  adminListNotifications,
  adminGetNotificationById,
  adminCreateNotification,
  adminUpdateNotification,
};

module.exports = notificationsService;
