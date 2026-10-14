'use strict';

const {
  updateContentSchema,
  contentKeyParamSchema,
} = require('../../src/modules/content/content.validation');

describe('content.validation schemas', () => {
  describe('contentKeyParamSchema', () => {
    it('validates a valid lowercase key', () => {
      const { error, value } = contentKeyParamSchema.validate({ key: 'settings' });
      expect(error).toBeUndefined();
      expect(value.key).toBe('settings');
    });

    it('rejects short or empty key', () => {
      const { error } = contentKeyParamSchema.validate({ key: 'a' });
      expect(error).toBeDefined();
    });
  });

  describe('updateContentSchema', () => {
    it('validates update payload with json content and extra', () => {
      const payload = {
        title: 'App Settings',
        content: { notifications: { updates: true } },
        extra: { version: '2.0.0' },
        is_active: true,
      };
      const { error, value } = updateContentSchema.validate(payload);
      expect(error).toBeUndefined();
      expect(value.title).toBe('App Settings');
      expect(value.content.notifications.updates).toBe(true);
    });

    it('rejects empty payload with min(1)', () => {
      const { error } = updateContentSchema.validate({});
      expect(error).toBeDefined();
    });
  });
});
