'use strict';

const { hashPassword, comparePassword } = require('../../src/core/utils/password');


describe('password utility', () => {
  const PLAINTEXT = 'mySecurePassword123';

  describe('hashPassword', () => {
    it('returns a non-empty string', async () => {
      const hash = await hashPassword(PLAINTEXT);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('returns a valid bcrypt hash (starts with $2b$)', async () => {
      const hash = await hashPassword(PLAINTEXT);
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('produces a different hash each call (salt randomness)', async () => {
      const hash1 = await hashPassword(PLAINTEXT);
      const hash2 = await hashPassword(PLAINTEXT);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('returns true for the correct plaintext', async () => {
      const hash = await hashPassword(PLAINTEXT);
      const result = await comparePassword(PLAINTEXT, hash);
      expect(result).toBe(true);
    });

    it('returns false for an incorrect plaintext', async () => {
      const hash = await hashPassword(PLAINTEXT);
      const result = await comparePassword('wrongPassword!', hash);
      expect(result).toBe(false);
    });

    it('returns false for an empty string', async () => {
      const hash = await hashPassword(PLAINTEXT);
      const result = await comparePassword('', hash);
      expect(result).toBe(false);
    });
  });
});
