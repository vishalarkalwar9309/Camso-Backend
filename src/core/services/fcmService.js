'use strict';

/**
 * src/core/services/fcmService.js
 *
 * Outbound Firebase Cloud Messaging (FCM) transport engine.
 *
 * Responsibilities:
 * 1. Token deduplication across target devices.
 * 2. Token batching in chunks of 500 (FCM provider limit).
 * 3. Error analysis identifying permanently invalid / unregistered tokens.
 * 4. Safe deactivation of invalid device tokens in user_devices.
 * 5. Transparent mock fallback when Firebase credentials are unavailable.
 */

const firebase = require('../../config/firebase');
const prisma = require('../../config/database');

const FCM_BATCH_SIZE = 500;

const INVALID_TOKEN_ERRORS = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
];

/**
 * Sends a notification payload to an array of FCM device tokens with batching & error tracking.
 *
 * @param {object} params
 * @param {string[]} params.tokens - Array of target FCM device tokens
 * @param {string} params.title - Notification title
 * @param {string} [params.body] - Notification body message
 * @param {object} [params.data={}] - Custom key-value data payload
 * @param {boolean} [params.deactivateInvalidDevices=true] - Whether to mark dead tokens is_active=false in DB
 * @returns {Promise<{ totalTokens: number, successCount: number, failureCount: number, invalidTokens: string[], is_mock: boolean }>}
 */
async function sendMulticastNotification({
  tokens = [],
  title,
  body = '',
  data = {},
  deactivateInvalidDevices = true,
}) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return {
      totalTokens: 0,
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
      is_mock: !firebase.getIsFirebaseReady(),
    };
  }

  // 1. Deduplicate tokens (ignore null, empty strings)
  const uniqueTokens = Array.from(
    new Set(tokens.filter((t) => typeof t === 'string' && t.trim() !== ''))
  );
  const totalTokens = uniqueTokens.length;

  if (totalTokens === 0) {
    return {
      totalTokens: 0,
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
      is_mock: !firebase.getIsFirebaseReady(),
    };
  }

  // 2. Check if Firebase messaging is available
  if (!firebase.getIsFirebaseReady()) {
    console.warn(`[FCM] Firebase not configured. Simulated dispatch to ${totalTokens} target token(s).`);
    return {
      totalTokens,
      successCount: totalTokens,
      failureCount: 0,
      invalidTokens: [],
      is_mock: true,
    };
  }

  const messaging = firebase.getMessaging();
  if (!messaging) {
    console.warn(`[FCM] Firebase messaging client not available. Dispatch skipped.`);
    return {
      totalTokens,
      successCount: 0,
      failureCount: totalTokens,
      invalidTokens: [],
      is_mock: true,
    };
  }

  // 3. Batch into groups of FCM_BATCH_SIZE (max 500)
  const batches = [];
  for (let i = 0; i < totalTokens; i += FCM_BATCH_SIZE) {
    batches.push(uniqueTokens.slice(i, i + FCM_BATCH_SIZE));
  }

  let successCount = 0;
  let failureCount = 0;
  const invalidTokens = [];

  // Convert all data payload values to string (FCM requirement)
  const stringifiedData = {};
  for (const [key, value] of Object.entries(data)) {
    stringifiedData[key] = String(value);
  }

  // 4. Send each batch
  for (const batch of batches) {
    const message = {
      tokens: batch,
      notification: {
        title: title || 'CAMSO Notification',
        body: body || '',
      },
      data: stringifiedData,
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      successCount += response.successCount;
      failureCount += response.failureCount;

      if (response.responses && response.responses.length > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errCode = resp.error.code;
            if (INVALID_TOKEN_ERRORS.includes(errCode)) {
              invalidTokens.push(batch[idx]);
            }
          }
        });
      }
    } catch (batchErr) {
      console.error(`[FCM] Batch send error: ${batchErr.message}`);
      failureCount += batch.length;
    }
  }

  // 5. Deactivate invalid device tokens in user_devices table if requested
  if (deactivateInvalidDevices && invalidTokens.length > 0) {
    try {
      await prisma.userDevice.updateMany({
        where: { fcm_token: { in: invalidTokens } },
        data: { is_active: false },
      });
    } catch (dbErr) {
      console.warn(`[FCM] Failed to deactivate invalid device tokens: ${dbErr.message}`);
    }
  }

  return {
    totalTokens,
    successCount,
    failureCount,
    invalidTokens,
    is_mock: false,
  };
}

module.exports = {
  sendMulticastNotification,
  FCM_BATCH_SIZE,
  INVALID_TOKEN_ERRORS,
};
