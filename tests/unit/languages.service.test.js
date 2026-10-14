'use strict';

jest.mock('../../src/modules/languages/languages.repository');
jest.mock('../../src/core/services/auditService');

const service = require('../../src/modules/languages/languages.service');
const repo = require('../../src/modules/languages/languages.repository');
const auditService = require('../../src/core/services/auditService');
const ApiError = require('../../src/core/utils/ApiError');

const ADMIN_ID = 'admin-user-001';

const MOCK_LANGUAGES = [
  { code: 'en', name: 'English', native_name: 'English', flag_emoji: '🇬🇧', is_active: true, sort_order: 0 },
  { code: 'fr', name: 'French', native_name: 'Français', flag_emoji: '🇫🇷', is_active: true, sort_order: 1 },
];

beforeEach(() => {
  jest.clearAllMocks();
  auditService.record.mockResolvedValue({});
});

describe('languages.service', () => {
  describe('getActiveLanguages', () => {
    it('returns active languages from repository', async () => {
      repo.findActiveLanguages.mockResolvedValue(MOCK_LANGUAGES);
      const res = await service.getActiveLanguages();
      expect(res).toEqual(MOCK_LANGUAGES);
      expect(repo.findActiveLanguages).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAdminLanguages', () => {
    it('returns all languages for Admin CMS', async () => {
      repo.findAllLanguagesAdmin.mockResolvedValue(MOCK_LANGUAGES);
      const res = await service.getAdminLanguages();
      expect(res).toEqual(MOCK_LANGUAGES);
      expect(repo.findAllLanguagesAdmin).toHaveBeenCalledTimes(1);
    });
  });

  describe('createLanguage', () => {
    it('creates a language and records audit log', async () => {
      repo.findLanguageByCode.mockResolvedValue(null);
      const newLang = { code: 'de', name: 'German', native_name: 'Deutsch', flag_emoji: '🇩🇪', is_active: true, sort_order: 2 };
      repo.createLanguage.mockResolvedValue(newLang);

      const res = await service.createLanguage(ADMIN_ID, newLang);

      expect(res).toEqual(newLang);
      expect(repo.createLanguage).toHaveBeenCalledWith(newLang);
      expect(auditService.record).toHaveBeenCalledWith({
        actorId: ADMIN_ID,
        action: 'CREATE',
        entityType: 'LANGUAGE',
        entityId: 'de',
        before: null,
        after: newLang,
      });
    });

    it('throws badRequest if language code is already taken', async () => {
      repo.findLanguageByCode.mockResolvedValue(MOCK_LANGUAGES[0]);

      await expect(
        service.createLanguage(ADMIN_ID, { code: 'en', name: 'English duplicate' })
      ).rejects.toThrow(ApiError);
    });
  });

  describe('updateLanguage', () => {
    it('updates an existing language and records audit log', async () => {
      const existing = MOCK_LANGUAGES[0];
      repo.findLanguageByCode.mockResolvedValue(existing);
      const updated = { ...existing, is_active: false };
      repo.updateLanguage.mockResolvedValue(updated);

      const res = await service.updateLanguage(ADMIN_ID, 'en', { is_active: false });

      expect(res).toEqual(updated);
      expect(auditService.record).toHaveBeenCalledWith({
        actorId: ADMIN_ID,
        action: 'UPDATE',
        entityType: 'LANGUAGE',
        entityId: 'en',
        before: existing,
        after: updated,
      });
    });

    it('throws notFound if language code does not exist', async () => {
      repo.findLanguageByCode.mockResolvedValue(null);

      await expect(
        service.updateLanguage(ADMIN_ID, 'zz', { is_active: false })
      ).rejects.toThrow(ApiError);
    });
  });
});
