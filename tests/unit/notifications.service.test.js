'use strict';

const prisma = require('../../src/config/database');
const fcmService = require('../../src/core/services/fcmService');
const auditService = require('../../src/core/services/auditService');
const notificationsService = require('../../src/modules/notifications/notifications.service');

describe('src/modules/notifications/notifications.service.js Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('resolveTargetTokens', () => {
    it('queries all active devices with fcm_token for ALL_USERS strategy', async () => {
      const mockDevices = [
        { fcm_token: 'token-1' },
        { fcm_token: 'token-2' },
      ];
      jest.spyOn(prisma.userDevice, 'findMany').mockResolvedValue(mockDevices);

      const tokens = await notificationsService.resolveTargetTokens('ALL_USERS', null);

      expect(prisma.userDevice.findMany).toHaveBeenCalledWith({
        where: { is_active: true, fcm_token: { not: null } },
        select: { fcm_token: true },
      });
      expect(tokens).toEqual(['token-1', 'token-2']);
    });

    it('filters by platform when target_type is PLATFORM', async () => {
      jest.spyOn(prisma.userDevice, 'findMany').mockResolvedValue([{ fcm_token: 'token-android' }]);

      const tokens = await notificationsService.resolveTargetTokens('PLATFORM', 'ANDROID');

      expect(prisma.userDevice.findMany).toHaveBeenCalledWith({
        where: { is_active: true, platform: 'ANDROID', fcm_token: { not: null } },
        select: { fcm_token: true },
      });
      expect(tokens).toEqual(['token-android']);
    });

    it('filters by user preferred_language when target_type is LANGUAGE', async () => {
      jest.spyOn(prisma.userDevice, 'findMany').mockResolvedValue([{ fcm_token: 'token-fr' }]);

      const tokens = await notificationsService.resolveTargetTokens('LANGUAGE', 'fr');

      expect(prisma.userDevice.findMany).toHaveBeenCalledWith({
        where: {
          is_active: true,
          fcm_token: { not: null },
          user: { preferred_language: 'fr' },
        },
        select: { fcm_token: true },
      });
      expect(tokens).toEqual(['token-fr']);
    });
  });

  describe('dispatchNotification', () => {
    it('throws validation error if title is empty or not provided', async () => {
      await expect(
        notificationsService.dispatchNotification({ title: '' }, { id: 'admin-1', email: 'admin@camso.local' })
      ).rejects.toThrow('Notification title is required.');
    });

    it('resolves tokens, dispatches via fcmService, records audit log, and returns metrics', async () => {
      jest.spyOn(prisma.userDevice, 'findMany').mockResolvedValue([
        { fcm_token: 'token-a' },
        { fcm_token: 'token-b' },
      ]);

      jest.spyOn(fcmService, 'sendMulticastNotification').mockResolvedValue({
        totalTokens: 2,
        successCount: 2,
        failureCount: 0,
        invalidTokens: [],
        is_mock: true,
      });

      jest.spyOn(auditService, 'recordAudit').mockResolvedValue({ id: 'audit-1' });

      const actor = { id: 'admin-super', email: 'super@camso.local' };
      const result = await notificationsService.dispatchNotification(
        {
          title: 'Special Promotion',
          body: 'Check out the new industrial tires',
          target_type: 'ALL_USERS',
          data: { type: 'promo' },
        },
        actor
      );

      expect(fcmService.sendMulticastNotification).toHaveBeenCalledWith({
        tokens: ['token-a', 'token-b'],
        title: 'Special Promotion',
        body: 'Check out the new industrial tires',
        data: { type: 'promo' },
        deactivateInvalidDevices: true,
      });

      expect(auditService.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-super',
          actorEmail: 'super@camso.local',
          action: 'CREATE',
          entityType: 'NOTIFICATION_DISPATCH',
        })
      );

      expect(result).toEqual({
        targetCount: 2,
        successCount: 2,
        failureCount: 0,
        invalidTokensCount: 0,
        is_mock: true,
      });
    });
  });
});
