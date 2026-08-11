'use strict';

/**
 * tests/unit/tokenService.test.js
 *
 * WHAT THIS FILE DOES:
 *   Unit tests for src/core/utils/tokenService.js.
 *   Verifies JWT signing, token verification, HMAC hashing, rotation, and replay detection.
 *
 * OVERALL DESIGN:
 *   Uses Jest to test tokenService functions with mock repository calls.
 *
 * ELEMENTS IN THIS FILE:
 *   - JWT signing and verification suite
 *   - Refresh token rotation suite
 *   - Replay attack detection suite
 *   - Revocation suite
 *
 * FINAL OUTPUT OF THE FILE:
 *   Jest test suite output validating token security logic.
 */

const tokenService = require('../../src/core/utils/tokenService');
const refreshTokenRepository = require('../../src/modules/auth/refreshToken.repository');

jest.mock('../../src/modules/auth/refreshToken.repository');

describe('tokenService Unit Tests', () => {
  const mockPayload = { id: 1, email: 'admin@camso.com', role: 'SUPER_ADMIN', type: 'ADMIN' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('generateTokenPair returns valid accessToken and refreshToken string', () => {
    const pair = tokenService.generateTokenPair(mockPayload);

    expect(pair).toHaveProperty('accessToken');
    expect(pair).toHaveProperty('refreshToken');
    expect(pair).toHaveProperty('refreshExpiresAt');
    expect(typeof pair.accessToken).toBe('string');
    expect(typeof pair.refreshToken).toBe('string');
    expect(pair.refreshExpiresAt instanceof Date).toBe(true);
  });

  test('verifyAccessToken decodes valid JWT token', () => {
    const { accessToken } = tokenService.generateTokenPair(mockPayload);
    const decoded = tokenService.verifyAccessToken(accessToken);

    expect(decoded).not.toBeNull();
    expect(decoded.id).toBe(mockPayload.id);
    expect(decoded.role).toBe(mockPayload.role);
    expect(decoded.type).toBe('ADMIN');
  });

  test('verifyAccessToken returns null for invalid or tampered token', () => {
    const decoded = tokenService.verifyAccessToken('invalid.token.str');
    expect(decoded).toBeNull();
  });

  test('rotateRefreshToken revokes old token and issues new pair on valid refresh', async () => {
    const oldToken = 'raw-refresh-token-123';
    const mockExisting = { id: 10, admin_user_id: 1, user_id: null };

    refreshTokenRepository.findActiveByHash.mockResolvedValue(mockExisting);
    refreshTokenRepository.revokeById.mockResolvedValue({});
    refreshTokenRepository.createRefreshToken.mockResolvedValue({});

    const result = await tokenService.rotateRefreshToken(oldToken, 'admin_user_id', mockPayload);

    expect(refreshTokenRepository.findActiveByHash).toHaveBeenCalled();
    expect(refreshTokenRepository.revokeById).toHaveBeenCalledWith(10, expect.any(Date), undefined);
    expect(refreshTokenRepository.createRefreshToken).toHaveBeenCalled();
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });

  test('rotateRefreshToken detects replay attack and revokes all active tokens for principal', async () => {
    const replayedToken = 'replayed-refresh-token-456';
    const mockRevoked = { id: 10, admin_user_id: 1 };

    refreshTokenRepository.findActiveByHash.mockResolvedValue(null);
    refreshTokenRepository.findByHash.mockResolvedValue(mockRevoked);
    refreshTokenRepository.revokeAllForPrincipal.mockResolvedValue({});

    await expect(
      tokenService.rotateRefreshToken(replayedToken, 'admin_user_id', mockPayload),
    ).rejects.toThrow('Refresh token was already used. Please log in again.');

    expect(refreshTokenRepository.revokeAllForPrincipal).toHaveBeenCalledWith(
      'admin_user_id',
      1,
      expect.any(Date),
      undefined,
    );
  });

  test('revokeAll calls refreshTokenRepository.revokeAllForPrincipal', async () => {
    refreshTokenRepository.revokeAllForPrincipal.mockResolvedValue({});

    await tokenService.revokeAll('admin_user_id', 5);

    expect(refreshTokenRepository.revokeAllForPrincipal).toHaveBeenCalledWith(
      'admin_user_id',
      5,
      expect.any(Date),
      undefined,
    );
  });
});
