'use strict';

jest.mock('../../src/modules/content/content.repository');
jest.mock('../../src/core/services/auditService');

const service = require('../../src/modules/content/content.service');
const repo = require('../../src/modules/content/content.repository');
const auditService = require('../../src/core/services/auditService');
const ApiError = require('../../src/core/utils/ApiError');

const ADMIN_ID = 'admin-user-001';

const MOCK_ITEM = {
  id: 'content-cuid-1',
  key: 'settings',
  title: 'App Settings',
  content: { notifications: { updates: true } },
  extra: { version: '1.0.0' },
  is_active: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  auditService.record.mockResolvedValue({});
});

describe('content.service', () => {
  describe('getPublicContentByKey', () => {
    it('returns active content by key', async () => {
      repo.findActiveContentByKey.mockResolvedValue(MOCK_ITEM);
      const res = await service.getPublicContentByKey('settings');
      expect(res).toEqual(MOCK_ITEM);
      expect(repo.findActiveContentByKey).toHaveBeenCalledWith('settings');
    });

    it('throws notFound if active content does not exist', async () => {
      repo.findActiveContentByKey.mockResolvedValue(null);
      await expect(service.getPublicContentByKey('unknown')).rejects.toThrow(ApiError);
    });
  });

  describe('getAllPublicContent', () => {
    it('returns all active content items', async () => {
      repo.findAllActiveContent.mockResolvedValue([MOCK_ITEM]);
      const res = await service.getAllPublicContent();
      expect(res).toEqual([MOCK_ITEM]);
    });
  });

  describe('getAdminContentByKey', () => {
    it('returns content item for Admin CMS', async () => {
      repo.findContentByKeyAdmin.mockResolvedValue(MOCK_ITEM);
      const res = await service.getAdminContentByKey('settings');
      expect(res).toEqual(MOCK_ITEM);
    });

    it('throws notFound if item does not exist', async () => {
      repo.findContentByKeyAdmin.mockResolvedValue(null);
      await expect(service.getAdminContentByKey('unknown')).rejects.toThrow(ApiError);
    });
  });

  describe('updateContent', () => {
    it('upserts content item and records audit log', async () => {
      repo.findContentByKeyAdmin.mockResolvedValue(MOCK_ITEM);
      const updated = { ...MOCK_ITEM, title: 'Updated Settings' };
      repo.upsertContent.mockResolvedValue(updated);

      const res = await service.updateContent(ADMIN_ID, 'settings', { title: 'Updated Settings' });

      expect(res).toEqual(updated);
      expect(repo.upsertContent).toHaveBeenCalledWith('settings', { title: 'Updated Settings' });
      expect(auditService.record).toHaveBeenCalledWith({
        actorId: ADMIN_ID,
        action: 'UPDATE',
        entityType: 'APP_CONTENT',
        entityId: 'settings',
        before: MOCK_ITEM,
        after: updated,
      });
    });
  });
});
