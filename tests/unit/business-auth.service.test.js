'use strict';

/**
 * business-auth.service.test.js — Unit tests for Dealer & Distributor authentication service.
 */

const service = require('../../src/modules/business-auth/business-auth.service');
const repo = require('../../src/modules/business-auth/business-auth.repository');
const { hashPassword } = require('../../src/core/utils/password');

jest.mock('../../src/modules/business-auth/business-auth.repository');

describe('Business Auth Service (Unit Tests)', () => {
  let sampleHash;

  beforeAll(async () => {
    sampleHash = await hashPassword('DealerPass123!');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('throws 409 CONFLICT if user email already exists', async () => {
      repo.findBusinessUserByEmail.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.register({
          organization: { name: 'Metro Tire Dealer', type: 'DEALER' },
          user: { email: 'dealer@metrotire.com', password: 'Password123!' },
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringMatching(/already exists/i),
      });
    });

    it('successfully registers organization and staff user in PENDING status', async () => {
      repo.findBusinessUserByEmail.mockResolvedValue(null);
      repo.registerBusinessOrganization.mockResolvedValue({
        organization: {
          id: 'org-cuid-1',
          name: 'Apex Distributors',
          code: 'APEX-01',
          type: 'DISTRIBUTOR',
          approval_status: 'PENDING',
          is_active: false,
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
        },
        user: {
          id: 'buser-cuid-1',
          organization_id: 'org-cuid-1',
          email: 'admin@apexdist.com',
          display_name: 'Apex Admin',
          role: 'DISTRIBUTOR',
          status: 'PENDING',
          created_at: new Date(),
        },
      });

      const res = await service.register({
        organization: { name: 'Apex Distributors', type: 'DISTRIBUTOR' },
        user: { email: 'admin@apexdist.com', password: 'Password123!' },
      });

      expect(res.message).toMatch(/pending administrator approval/i);
      expect(res.organization.approval_status).toBe('PENDING');
      expect(res.user.status).toBe('PENDING');
      expect(res.user).not.toHaveProperty('password_hash');
    });

    it('successfully registers OEM_PARTNER organization in PENDING status', async () => {
      repo.findBusinessUserByEmail.mockResolvedValue(null);
      repo.registerBusinessOrganization.mockResolvedValue({
        organization: {
          id: 'org-oem-1',
          name: 'Caterpillar OEM Engineering',
          type: 'OEM_PARTNER',
          approval_status: 'PENDING',
          is_active: false,
          country: 'US',
        },
        user: {
          id: 'buser-oem-1',
          organization_id: 'org-oem-1',
          email: 'lead.engineer@cat.com',
          role: 'OEM_PARTNER',
          status: 'PENDING',
          created_at: new Date(),
        },
      });

      const res = await service.register({
        organization: { name: 'Caterpillar OEM Engineering', type: 'OEM_PARTNER' },
        user: { email: 'lead.engineer@cat.com', password: 'Password123!' },
      });

      expect(res.organization.type).toBe('OEM_PARTNER');
      expect(res.user.role).toBe('OEM_PARTNER');
      expect(res.organization.approval_status).toBe('PENDING');
      expect(res.user.status).toBe('PENDING');
    });
  });

  describe('login', () => {
    it('throws 401 UNAUTHORIZED on unknown email', async () => {
      repo.findBusinessUserByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@dealer.com', password: 'password' })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid business email or password.',
      });
    });

    it('throws 401 UNAUTHORIZED on invalid password', async () => {
      repo.findBusinessUserByEmail.mockResolvedValue({
        id: 'u-1',
        email: 'dealer@ceat.com',
        password_hash: sampleHash,
        status: 'ACTIVE',
        organization: { approval_status: 'APPROVED', is_active: true },
      });

      await expect(
        service.login({ email: 'dealer@ceat.com', password: 'WrongPassword!' })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid business email or password.',
      });
    });

    it('throws 403 FORBIDDEN when user status is PENDING', async () => {
      repo.findBusinessUserByEmail.mockResolvedValue({
        id: 'u-1',
        email: 'pending@dealer.com',
        password_hash: sampleHash,
        status: 'PENDING',
        organization: { approval_status: 'APPROVED', is_active: true },
      });

      await expect(
        service.login({ email: 'pending@dealer.com', password: 'DealerPass123!' })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringMatching(/pending administrator approval/i),
      });
    });

    it('throws 403 FORBIDDEN when organization approval_status is PENDING', async () => {
      repo.findBusinessUserByEmail.mockResolvedValue({
        id: 'u-1',
        email: 'dealer@neworg.com',
        password_hash: sampleHash,
        status: 'ACTIVE',
        organization: { approval_status: 'PENDING', is_active: false },
      });

      await expect(
        service.login({ email: 'dealer@neworg.com', password: 'DealerPass123!' })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringMatching(/organization is pending/i),
      });
    });

    it('throws 403 FORBIDDEN when organization is SUSPENDED', async () => {
      repo.findBusinessUserByEmail.mockResolvedValue({
        id: 'u-1',
        email: 'dealer@suspended.com',
        password_hash: sampleHash,
        status: 'ACTIVE',
        organization: { approval_status: 'SUSPENDED', is_active: false },
      });

      await expect(
        service.login({ email: 'dealer@suspended.com', password: 'DealerPass123!' })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringMatching(/organization has been suspended/i),
      });
    });

    it('successfully logs in approved dealer and issues token with DEALER role and organization_id', async () => {
      repo.findBusinessUserByEmail.mockResolvedValue({
        id: 'dealer-user-123',
        email: 'dealer@ceat.com',
        password_hash: sampleHash,
        display_name: 'Metro Tires Contact',
        role: 'DEALER',
        status: 'ACTIVE',
        organization_id: 'org-metro-777',
        organization: {
          id: 'org-metro-777',
          name: 'Metro Tires Ltd',
          type: 'DEALER',
          approval_status: 'APPROVED',
          is_active: true,
        },
      });
      repo.createBusinessRefreshToken.mockResolvedValue({});

      const res = await service.login({ email: 'dealer@ceat.com', password: 'DealerPass123!' });

      expect(res.tokens).toHaveProperty('access_token');
      expect(res.tokens).toHaveProperty('refresh_token');
      expect(res.user.role).toBe('DEALER');
      expect(res.user.organization_id).toBe('org-metro-777');
      expect(res.organization.id).toBe('org-metro-777');
    });

    it('successfully logs in approved OEM partner and issues token with OEM_PARTNER role and organization_id', async () => {
      repo.findBusinessUserByEmail.mockResolvedValue({
        id: 'oem-user-123',
        email: 'lead.engineer@cat.com',
        password_hash: sampleHash,
        display_name: 'Lead OEM Engineer',
        role: 'OEM_PARTNER',
        status: 'ACTIVE',
        organization_id: 'org-cat-888',
        organization: {
          id: 'org-cat-888',
          name: 'Caterpillar OEM Inc',
          type: 'OEM_PARTNER',
          approval_status: 'APPROVED',
          is_active: true,
        },
      });
      repo.createBusinessRefreshToken.mockResolvedValue({});

      const res = await service.login({ email: 'lead.engineer@cat.com', password: 'DealerPass123!' });

      expect(res.tokens).toHaveProperty('access_token');
      expect(res.tokens).toHaveProperty('refresh_token');
      expect(res.user.role).toBe('OEM_PARTNER');
      expect(res.user.organization_id).toBe('org-cat-888');
      expect(res.organization.type).toBe('OEM_PARTNER');
    });
  });

  describe('refresh', () => {
    it('successfully rotates business refresh token for active user', async () => {
      repo.findBusinessRefreshTokenByHash.mockResolvedValue({
        id: 'tok-1',
        business_user_id: 'buser-1',
        revoked_at: null,
        expires_at: new Date(Date.now() + 60000),
      });
      repo.findBusinessUserById.mockResolvedValue({
        id: 'buser-1',
        email: 'dealer@ceat.com',
        role: 'DEALER',
        status: 'ACTIVE',
        organization_id: 'org-1',
        organization: { approval_status: 'APPROVED' },
      });
      repo.rotateBusinessRefreshToken.mockResolvedValue([{}, {}]);

      const res = await service.refresh({ refresh_token: 'raw-token' });

      expect(res.tokens).toHaveProperty('access_token');
      expect(res.tokens).toHaveProperty('refresh_token');
      expect(repo.rotateBusinessRefreshToken).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('successfully revokes business refresh token', async () => {
      repo.revokeBusinessRefreshToken.mockResolvedValue({ count: 1 });

      const res = await service.logout({ refresh_token: 'raw-token' });

      expect(res.message).toBe('Business user logged out successfully.');
      expect(repo.revokeBusinessRefreshToken).toHaveBeenCalled();
    });
  });
});
