'use strict';

/**
 * admin-auth.service.test.js — Unit tests for Admin authentication service.
 */

const service = require('../../src/modules/admin-auth/admin-auth.service');
const repo = require('../../src/modules/admin-auth/admin-auth.repository');
const { hashPassword } = require('../../src/core/utils/password');
const { recordAudit } = require('../../src/core/services/auditService');

jest.mock('../../src/modules/admin-auth/admin-auth.repository');
jest.mock('../../src/core/services/auditService');

describe('Admin Auth Service (Unit Tests)', () => {
  let sampleHash;

  beforeAll(async () => {
    sampleHash = await hashPassword('AdminPass123!');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('throws 401 UNAUTHORIZED on unknown email', async () => {
      repo.findAdminByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@ceat.com', password: 'password' })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid admin email or password.',
      });
    });

    it('throws 401 UNAUTHORIZED on wrong password', async () => {
      repo.findAdminByEmail.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@ceat.com',
        password_hash: sampleHash,
        is_active: true,
        role: 'SUPER_ADMIN',
      });

      await expect(
        service.login({ email: 'admin@ceat.com', password: 'WrongPassword!' })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid admin email or password.',
      });
    });

    it('throws 403 FORBIDDEN on deactivated admin account', async () => {
      repo.findAdminByEmail.mockResolvedValue({
        id: 'admin-1',
        email: 'deactivated@ceat.com',
        password_hash: sampleHash,
        is_active: false,
        role: 'CONTENT_ADMIN',
      });

      await expect(
        service.login({ email: 'deactivated@ceat.com', password: 'AdminPass123!' })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringMatching(/deactivated/i),
      });
    });

    it('successfully logs in, issues token pair, and writes audit record', async () => {
      repo.findAdminByEmail.mockResolvedValue({
        id: 'admin-123',
        email: 'super@ceat.com',
        password_hash: sampleHash,
        is_active: true,
        role: 'SUPER_ADMIN',
        created_at: new Date(),
        updated_at: new Date(),
      });
      repo.createAdminRefreshToken.mockResolvedValue({});
      recordAudit.mockResolvedValue({});

      const result = await service.login({ email: 'super@ceat.com', password: 'AdminPass123!' });

      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('access_token');
      expect(result.tokens).toHaveProperty('refresh_token');
      expect(result.admin.id).toBe('admin-123');
      expect(result.admin.role).toBe('SUPER_ADMIN');
      expect(result.admin).not.toHaveProperty('password_hash');

      expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'admin-123',
        action: 'LOGIN',
        entityType: 'ADMIN_SESSION',
      }));
    });
  });

  describe('refresh', () => {
    it('throws 401 on unknown or expired refresh token', async () => {
      repo.findAdminRefreshTokenByHash.mockResolvedValue(null);

      await expect(
        service.refresh({ refresh_token: 'fake-refresh-token' })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid or expired admin refresh token.',
      });
    });

    it('successfully rotates admin refresh token', async () => {
      repo.findAdminRefreshTokenByHash.mockResolvedValue({
        id: 'token-id-1',
        admin_id: 'admin-123',
        revoked_at: null,
        expires_at: new Date(Date.now() + 60000),
      });
      repo.findAdminById.mockResolvedValue({
        id: 'admin-123',
        email: 'super@ceat.com',
        role: 'SUPER_ADMIN',
        is_active: true,
      });
      repo.rotateAdminRefreshToken.mockResolvedValue([{}, {}]);

      const result = await service.refresh({ refresh_token: 'valid-raw-token' });

      expect(result.tokens).toHaveProperty('access_token');
      expect(result.tokens).toHaveProperty('refresh_token');
      expect(repo.rotateAdminRefreshToken).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revokes the admin refresh token', async () => {
      repo.revokeAdminRefreshToken.mockResolvedValue({ count: 1 });

      const result = await service.logout({ refresh_token: 'token-to-revoke' });

      expect(result.message).toBe('Admin logged out successfully.');
      expect(repo.revokeAdminRefreshToken).toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('returns sanitized admin profile', async () => {
      repo.findAdminById.mockResolvedValue({
        id: 'admin-1',
        email: 'viewer@ceat.com',
        role: 'VIEWER',
        is_active: true,
        password_hash: 'secret',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const profile = await service.getMe('admin-1');

      expect(profile.id).toBe('admin-1');
      expect(profile.role).toBe('VIEWER');
      expect(profile).not.toHaveProperty('password_hash');
    });
  });
});
