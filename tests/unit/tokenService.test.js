'use strict';

const {
  generateAccessToken,
  verifyAccessToken,
  generateRawRefreshToken,
  hashRefreshToken,
  buildRefreshTokenExpiry,
} = require('../../src/core/utils/tokenService');


describe('tokenService', () => {
  const PAYLOAD = { sub: 'user-cuid-123', is_guest: false };

  // -------------------------------------------------------------------------
  describe('generateAccessToken', () => {
    it('returns a non-empty string', () => {
      const token = generateAccessToken(PAYLOAD);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('produces a three-part JWT (header.payload.signature)', () => {
      const token = generateAccessToken(PAYLOAD);
      expect(token.split('.')).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  describe('verifyAccessToken', () => {
    it('returns the correct sub and is_guest claims', () => {
      const token = generateAccessToken(PAYLOAD);
      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe(PAYLOAD.sub);
      expect(decoded.is_guest).toBe(PAYLOAD.is_guest);
    });

    it('includes iat and exp claims', () => {
      const token = generateAccessToken(PAYLOAD);
      const decoded = verifyAccessToken(token);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('throws JsonWebTokenError for a tampered token', () => {
      const token = generateAccessToken(PAYLOAD);
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });

    it('throws TokenExpiredError for an expired token', async () => {
      // jsonwebtoken accepts numeric seconds for expiresIn
      const jwt = require('jsonwebtoken');
      const jwtConfig = require('../../src/config/jwt');

      const expired = jwt.sign(PAYLOAD, jwtConfig.accessSecret, { expiresIn: 1 });

      // Wait just over 1 second
      await new Promise((r) => setTimeout(r, 1100));

      expect(() => verifyAccessToken(expired)).toThrow(
        expect.objectContaining({ name: 'TokenExpiredError' })
      );
    }, 5000); // extend timeout for this test only
  });

  // -------------------------------------------------------------------------
  describe('generateRawRefreshToken', () => {
    it('returns a 128-character hex string', () => {
      const token = generateRawRefreshToken();
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(128);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('produces a different value each call', () => {
      const t1 = generateRawRefreshToken();
      const t2 = generateRawRefreshToken();
      expect(t1).not.toBe(t2);
    });
  });

  // -------------------------------------------------------------------------
  describe('hashRefreshToken', () => {
    it('returns a non-empty string', () => {
      const hash = hashRefreshToken('some-raw-token');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('is deterministic — same input produces same output', () => {
      const raw = generateRawRefreshToken();
      expect(hashRefreshToken(raw)).toBe(hashRefreshToken(raw));
    });

    it('produces different hashes for different inputs', () => {
      const raw1 = generateRawRefreshToken();
      const raw2 = generateRawRefreshToken();
      expect(hashRefreshToken(raw1)).not.toBe(hashRefreshToken(raw2));
    });
  });

  // -------------------------------------------------------------------------
  describe('buildRefreshTokenExpiry', () => {
    it('returns a Date object', () => {
      const expiry = buildRefreshTokenExpiry();
      expect(expiry).toBeInstanceOf(Date);
    });

    it('returns a date in the future', () => {
      const expiry = buildRefreshTokenExpiry();
      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
