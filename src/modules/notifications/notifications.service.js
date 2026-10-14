'use strict';

/**
 * src/modules/notifications/notifications.service.js
 *
 * FCM Push Notification & Campaign Dispatch Service.
 *
 * Resolves recipient device tokens from `user_devices` based on targeting rules,
 * batches and delivers via `fcmService.sendMulticastNotification()`,
 * logs to audit trail, and returns execution metrics.
 */

const prisma = require('../../config/database');
const fcmService = require('../../core/services/fcmService');
const auditService = require('../../core/services/auditService');
const ApiError = require('../../core/utils/ApiError');

/**
 * Resolves active device tokens matching the target strategy.
 *
 * @param {string} targetType - 'ALL_USERS' | 'PLATFORM' | 'LANGUAGE'
 * @param {string|null} targetValue - e.g. 'ANDROID', 'IOS', 'en', 'fr'
 * @returns {Promise<string[]>}
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
 *
 * @param {object} params
 * @param {string} params.title - Notification title
 * @param {string} [params.body] - Notification body
 * @param {string} [params.target_type='ALL_USERS'] - Targeting strategy
 * @param {string} [params.target_value] - Target filter value
 * @param {object} [params.data={}] - Custom data payload
 * @param {object} actor - Admin caller ({ id, email, role })
 * @returns {Promise<{ targetCount: number, successCount: number, failureCount: number, is_mock: boolean }>}
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

module.exports = {
  resolveTargetTokens,
  dispatchNotification,
};
