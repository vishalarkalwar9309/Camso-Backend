'use strict';

/**
 * Unit tests for src/core/services/fcmService.js
 */

const { sendMulticastNotification, FCM_BATCH_SIZE } = require('../../src/core/services/fcmService');
const firebaseConfig = require('../../src/config/firebase');
const prisma = require('../../src/config/database');

describe('FCM Notification Service (src/core/services/fcmService.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles empty or whitespace-only token arrays cleanly', async () => {
    const res1 = await sendMulticastNotification({ tokens: [] });
    expect(res1.totalTokens).toBe(0);
    expect(res1.successCount).toBe(0);

    const res2 = await sendMulticastNotification({ tokens: ['  ', null, ''] });
    expect(res2.totalTokens).toBe(0);
  });

  it('deduplicates identical tokens', async () => {
    jest.spyOn(firebaseConfig, 'getIsFirebaseReady').mockReturnValue(false);

    const res = await sendMulticastNotification({
      tokens: ['tok_A', 'tok_B', 'tok_A', 'tok_B'],
      title: 'Deduplication Test',
    });

    expect(res.totalTokens).toBe(2);
    expect(res.is_mock).toBe(true);
  });

  it('simulates dispatch safely when Firebase credentials are not configured', async () => {
    jest.spyOn(firebaseConfig, 'getIsFirebaseReady').mockReturnValue(false);

    const res = await sendMulticastNotification({
      tokens: ['tok_1', 'tok_2'],
      title: 'Offline Test',
      body: 'Message body',
    });

    expect(res.is_mock).toBe(true);
    expect(res.totalTokens).toBe(2);
    expect(res.successCount).toBe(2);
    expect(res.failureCount).toBe(0);
    expect(res.invalidTokens).toEqual([]);
  });

  it('batches tokens into groups of 500 and sends via messaging client', async () => {
    const mockSendEachForMulticast = jest.fn().mockImplementation((msg) => {
      return Promise.resolve({
        successCount: msg.tokens.length,
        failureCount: 0,
        responses: msg.tokens.map(() => ({ success: true })),
      });
    });

    const mockMessaging = {
      sendEachForMulticast: mockSendEachForMulticast,
    };

    jest.spyOn(firebaseConfig, 'getIsFirebaseReady').mockReturnValue(true);
    jest.spyOn(firebaseConfig, 'getMessaging').mockReturnValue(mockMessaging);

    // Create 505 tokens to force 2 batches
    const manyTokens = Array.from({ length: 505 }, (_, i) => `token_${i}`);

    const res = await sendMulticastNotification({
      tokens: manyTokens,
      title: 'Batching Test',
      body: 'Testing FCM chunking',
      data: { campaignId: 101 },
      deactivateInvalidDevices: false,
    });

    expect(res.is_mock).toBe(false);
    expect(res.totalTokens).toBe(505);
    expect(res.successCount).toBe(505);
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(2);

    // First batch has 500, second batch has 5
    expect(mockSendEachForMulticast.mock.calls[0][0].tokens.length).toBe(FCM_BATCH_SIZE);
    expect(mockSendEachForMulticast.mock.calls[1][0].tokens.length).toBe(5);
  });

  it('identifies invalid tokens and triggers device deactivation in database', async () => {
    const mockSendEachForMulticast = jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true },
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
      ],
    });

    const mockMessaging = {
      sendEachForMulticast: mockSendEachForMulticast,
    };

    jest.spyOn(firebaseConfig, 'getIsFirebaseReady').mockReturnValue(true);
    jest.spyOn(firebaseConfig, 'getMessaging').mockReturnValue(mockMessaging);

    const updateManySpy = jest.spyOn(prisma.userDevice, 'updateMany').mockResolvedValue({ count: 1 });

    const res = await sendMulticastNotification({
      tokens: ['valid_tok', 'dead_tok'],
      title: 'Invalid Token Test',
      deactivateInvalidDevices: true,
    });

    expect(res.successCount).toBe(1);
    expect(res.failureCount).toBe(1);
    expect(res.invalidTokens).toContain('dead_tok');
    expect(updateManySpy).toHaveBeenCalledWith({
      where: { fcm_token: { in: ['dead_tok'] } },
      data: { is_active: false },
    });
  });

  it('refuses simulated success in production mode when Firebase is not configured', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    jest.spyOn(firebaseConfig, 'getIsFirebaseReady').mockReturnValue(false);

    try {
      const res = await sendMulticastNotification({
        tokens: ['tok_1', 'tok_2'],
        title: 'Production Test',
        body: 'Testing production guard',
      });

      expect(res.is_mock).toBe(false);
      expect(res.totalTokens).toBe(2);
      expect(res.successCount).toBe(0);
      expect(res.failureCount).toBe(2);
      expect(res.error).toMatch(/Firebase Cloud Messaging is not configured or unavailable in production/);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
