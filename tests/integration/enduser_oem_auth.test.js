'use strict';

/**
 * tests/integration/enduser_oem_auth.test.js
 *
 * Comprehensive Integration Tests for:
 * 1. End User persona (renamed from Customer) registration, login, role mapping & backward compatibility.
 * 2. Dealer & Distributor authentication continuity.
 * 3. OEM Partner registration, admin approval workflow, login, role enforcement, and portal isolation.
 * 4. Cross-company access denial & prevention of role self-escalation.
 */

const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/database');
const { generateAdminAccessToken, generateAccessToken } = require('../../src/core/utils/tokenService');

describe('End User & OEM Partner Authentication Suite', () => {
  const timestamp = Date.now();
  let superAdminToken;
  let superAdminId;

  // Track created entities for cleanup
  const createdUserEmails = [];
  const createdOrgIds = [];

  beforeAll(async () => {
    await prisma.$connect();

    // Fetch existing super admin
    const admin = await prisma.adminUser.findFirst({
      where: { role: 'SUPER_ADMIN', is_active: true },
    });

    if (admin) {
      superAdminId = admin.id;
      superAdminToken = generateAdminAccessToken({
        sub: admin.id,
        email: admin.email,
        role: admin.role,
      });
    } else {
      const newAdmin = await prisma.adminUser.create({
        data: {
          email: `admin.oemtest.${timestamp}@camso.local`,
          password_hash: 'mockhash',
          role: 'SUPER_ADMIN',
          is_active: true,
        },
      });
      superAdminId = newAdmin.id;
      superAdminToken = generateAdminAccessToken({
        sub: newAdmin.id,
        email: newAdmin.email,
        role: newAdmin.role,
      });
    }
  });

  afterAll(async () => {
    // Cleanup users
    if (createdUserEmails.length > 0) {
      await prisma.user.deleteMany({
        where: { email: { in: createdUserEmails } },
      });
      await prisma.businessUser.deleteMany({
        where: { email: { in: createdUserEmails } },
      });
    }

    // Cleanup organizations
    if (createdOrgIds.length > 0) {
      await prisma.businessOrganization.deleteMany({
        where: { id: { in: createdOrgIds } },
      });
    }

    await prisma.$disconnect();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Part 1: End User Persona & Backward Compatibility
  // ───────────────────────────────────────────────────────────────────────────
  describe('Part 1: End User (formerly Customer) Registration & Profile', () => {
    const endUserEmail = `enduser_${timestamp}@test.com`;
    let endUserToken;

    it('successfully registers an End User with role END_USER in profile', async () => {
      createdUserEmails.push(endUserEmail);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: endUserEmail,
          password: 'EndUserPass123!',
          display_name: 'Test End User',
          preferred_language: 'en',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('END_USER');
      expect(res.body.data.user.user_type).toBe('End User');
      expect(res.body.data.user.display_name).toBe('Test End User');

      endUserToken = res.body.data.access_token;
    });

    it('returns role: END_USER on GET /api/v1/users/me', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${endUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('END_USER');
      expect(res.body.data.user_type).toBe('End User');
      expect(res.body.data.email).toBe(endUserEmail);
    });

    it('maintains backward compatibility when legacy client presents a token with CUSTOMER role', async () => {
      const legacyToken = generateAccessToken({
        sub: 'legacy-customer-cuid',
        is_guest: false,
        role: 'CUSTOMER',
      });

      // Submit feedback using legacy CUSTOMER token
      const res = await request(app)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${legacyToken}`)
        .send({
          bucket: 'PRODUCT',
          rating: 4,
          comment: 'Legacy customer token compatibility test',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Part 2: OEM Partner Lifecycle & Role Enforcement
  // ───────────────────────────────────────────────────────────────────────────
  describe('Part 2: OEM Partner Registration, Admin Approval, and Portal Authorization', () => {
    const oemEmail = `lead.engineer.${timestamp}@cat.com`;
    const oemOrgName = `Caterpillar OEM Systems ${timestamp}`;
    let oemOrgId;
    let oemToken;
    let dealerToken;
    let distributorToken;

    it('allows OEM Partner registration and sets organization and user to PENDING status', async () => {
      createdUserEmails.push(oemEmail);

      const res = await request(app)
        .post('/api/v1/business-auth/register')
        .send({
          organization: {
            name: oemOrgName,
            type: 'OEM_PARTNER',
            country: 'US',
            city: 'Peoria',
            state: 'IL',
          },
          user: {
            email: oemEmail,
            password: 'OemSecurePass123!',
            display_name: 'Lead OEM Engineer',
            phone: '+1-309-555-0199',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toMatch(/pending administrator approval/i);
      expect(res.body.data.organization.type).toBe('OEM_PARTNER');
      expect(res.body.data.organization.approval_status).toBe('PENDING');
      expect(res.body.data.user.role).toBe('OEM_PARTNER');
      expect(res.body.data.user.status).toBe('PENDING');

      oemOrgId = res.body.data.organization.id;
      createdOrgIds.push(oemOrgId);
    });

    it('prevents role self-escalation: role cannot be overridden by user registration payload', async () => {
      const attackerEmail = `attacker.${timestamp}@oem.com`;
      createdUserEmails.push(attackerEmail);

      const res = await request(app)
        .post('/api/v1/business-auth/register')
        .send({
          organization: {
            name: `Attacker Org ${timestamp}`,
            type: 'OEM_PARTNER',
          },
          user: {
            email: attackerEmail,
            password: 'AttackPass123!',
            role: 'SUPER_ADMIN', // Attempted escalation
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('OEM_PARTNER'); // Enforced to OEM_PARTNER
      expect(res.body.data.user.role).not.toBe('SUPER_ADMIN');
    });

    it('rejects OEM login before administrator approval with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/business-auth/login')
        .send({
          email: oemEmail,
          password: 'OemSecurePass123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/administrator approval/i);
    });

    it('allows Super Admin to approve the OEM Partner organization', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${oemOrgId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ approval_status: 'APPROVED' });

      expect(res.status).toBe(200);
      expect(res.body.data.approval_status).toBe('APPROVED');
      expect(res.body.data.is_active).toBe(true);
    });

    it('successfully logs in approved OEM partner and issues tokens with OEM_PARTNER role', async () => {
      const res = await request(app)
        .post('/api/v1/business-auth/login')
        .send({
          email: oemEmail,
          password: 'OemSecurePass123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.tokens).toHaveProperty('access_token');
      expect(res.body.data.user.role).toBe('OEM_PARTNER');
      expect(res.body.data.organization.type).toBe('OEM_PARTNER');

      oemToken = res.body.data.tokens.access_token;
    });

    it('allows OEM Partner to access GET /api/v1/business/oem/portal', async () => {
      const res = await request(app)
        .get('/api/v1/business/oem/portal')
        .set('Authorization', `Bearer ${oemToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.portal).toBe('OEM_PARTNER_PORTAL');
      expect(res.body.data.organization_id).toBe(oemOrgId);
      expect(res.body.data.authorized_features).toContain('cad_drawings_access');
      expect(res.body.data.authorized_features).toContain('technical_specifications');
    });

    it('allows OEM Partner to access GET /api/v1/business/oem/documents', async () => {
      const res = await request(app)
        .get('/api/v1/business/oem/documents')
        .set('Authorization', `Bearer ${oemToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('denies OEM Partner from accessing Dealer portal (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/business/dealer/portal')
        .set('Authorization', `Bearer ${oemToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/restricted to DEALER/i);
    });

    it('denies OEM Partner from accessing Distributor portal (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/business/distributor/portal')
        .set('Authorization', `Bearer ${oemToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/restricted to DISTRIBUTOR/i);
    });

    it('enforces organization data isolation: OEM user only receives their own company data', async () => {
      const res = await request(app)
        .get('/api/v1/business/organization')
        .set('Authorization', `Bearer ${oemToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(oemOrgId);
      expect(res.body.data.name).toBe(oemOrgName);
      expect(res.body.data.type).toBe('OEM_PARTNER');
    });

    it('denies Dealer persona from accessing OEM Partner portal (403 Forbidden)', async () => {
      // Use existing demo dealer or create business token
      const dealerPayloadToken = generateAccessToken({
        sub: 'dealer-sub-id',
        is_guest: false,
        role: 'DEALER',
      });
      // Sign with business token generator for realism
      const { generateBusinessAccessToken } = require('../../src/core/utils/tokenService');
      const realDealerToken = generateBusinessAccessToken({
        sub: 'dealer-sub-id',
        email: 'dealer@test.com',
        role: 'DEALER',
        org_id: 'org-dealer-mock',
      });

      const res = await request(app)
        .get('/api/v1/business/oem/portal')
        .set('Authorization', `Bearer ${realDealerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/restricted to OEM_PARTNER/i);
    });
  });
});
