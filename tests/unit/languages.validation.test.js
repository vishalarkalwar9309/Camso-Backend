'use strict';

const {
  createLanguageSchema,
  updateLanguageSchema,
  languageCodeParamSchema,
} = require('../../src/modules/languages/languages.validation');

describe('languages.validation schemas', () => {
  describe('createLanguageSchema', () => {
    it('validates a valid language creation payload', () => {
      const payload = {
        code: 'es',
        name: 'Spanish',
        native_name: 'Español',
        flag_emoji: '🇪🇸',
        is_active: true,
        sort_order: 4,
      };
      const { error, value } = createLanguageSchema.validate(payload);
      expect(error).toBeUndefined();
      expect(value.code).toBe('es');
    });

    it('rejects missing code or invalid code length', () => {
      const { error: err1 } = createLanguageSchema.validate({ name: 'Spanish' });
      expect(err1).toBeDefined();

      const { error: err2 } = createLanguageSchema.validate({ code: 'esp', name: 'Spanish' });
      expect(err2).toBeDefined();
    });

    it('rejects missing name', () => {
      const { error } = createLanguageSchema.validate({ code: 'es' });
      expect(error).toBeDefined();
    });
  });

  describe('updateLanguageSchema', () => {
    it('validates partial update payload', () => {
      const { error, value } = updateLanguageSchema.validate({ is_active: false });
      expect(error).toBeUndefined();
      expect(value.is_active).toBe(false);
    });

    it('rejects empty payload with min(1)', () => {
      const { error } = updateLanguageSchema.validate({});
      expect(error).toBeDefined();
    });
  });

  describe('languageCodeParamSchema', () => {
    it('validates 2-letter lowercase code', () => {
      const { error, value } = languageCodeParamSchema.validate({ code: 'fr' });
      expect(error).toBeUndefined();
      expect(value.code).toBe('fr');
    });

    it('rejects invalid code', () => {
      const { error } = languageCodeParamSchema.validate({ code: 'french' });
      expect(error).toBeDefined();
    });
  });
});
