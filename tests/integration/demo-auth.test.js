'use strict';

/**
 * tests/integration/demo-auth.test.js
 *
 * Live authentication and role boundary isolation integration tests
 * for all four synthetic demo accounts seeded in Gate 2B.
 */

const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/database');

const customerEmail = process.env.DEMO_END_USER_EMAIL || process.env.DEMO_CUSTOMER_EMAIL || 'demo.customer@camso.local';
const customerPassword = process.env.DEMO_END_USER_PASSWORD || process.env.DEMO_CUSTOMER_PASSWORD;
const adminEmail = process.env.DEMO_ADMIN_EMAIL || 'demo.admin@camso.local';
const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
const dealerEmail = process.env.DEMO_DEALER_EMAIL || 'demo.dealer@camso.local';
const dealerPassword = process.env.DEMO_DEALER_PASSWORD;
const distribEmail = process.env.DEMO_DISTRIBUTOR_EMAIL || 'demo.distributor@camso.local';
const distribPassword = process.env.DEMO_DISTRIBUTOR_PASSWORD;

const hasCredentials = Boolean(
  customerPassword && adminPassword && dealerPassword && distribPassword
);

const describeDb = hasCredentials ? describe : describe.skip;

describeDb('Gate 2B Demo Accounts — Live Authentication & Boundary Verification', () => {
  let customerToken = null;
  let adminToken = null;
  let dealerToken = null;
  let distribToken = null;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // 1. End User / Customer Persona
  // ---------------------------------------------------------------------------
  describe(`End User Persona (${customerEmail})`, () => {
    it('authenticates via POST /api/v1/auth/login and receives access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: customerEmail,
          password: customerPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.access_token).toBeDefined();
      expect(res.body.data.user.email).toBe(customerEmail);
      expect(res.body.data.user.is_guest).toBe(false);

      customerToken = res.body.data.access_token;
    });

    it('can access customer profile GET /api/v1/users/me with customer token', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(customerEmail);
    });

    it('is blocked from admin routes (GET /api/v1/admin/admin-users) with 401/403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/admin-users')
        .set('Authorization', `Bearer ${customerToken}`);

      expect([401, 403]).toContain(res.status);
    });

    it('is blocked from business portal routes (GET /api/v1/business/organization) with 401/403', async () => {
      const res = await request(app)
        .get('/api/v1/business/organization')
        .set('Authorization', `Bearer ${customerToken}`);

      expect([401, 403]).toContain(res.status);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Super Admin Persona
  // ---------------------------------------------------------------------------
  describe(`Super Admin Persona (${adminEmail})`, () => {
    it('authenticates via POST /api/v1/admin-auth/login and receives SUPER_ADMIN token', async () => {
      const res = await request(app)
        .post('/api/v1/admin-auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Top-level tokens (backward compatibility)
      expect(res.body.data.access_token).toBeDefined();
      expect(res.body.data.refresh_token).toBeDefined();
      // Nested tokens object with dual camelCase and snake_case aliases
      expect(res.body.data.tokens).toBeDefined();
      expect(res.body.data.tokens.accessToken).toBe(res.body.data.access_token);
      expect(res.body.data.tokens.refreshToken).toBe(res.body.data.refresh_token);
      expect(res.body.data.tokens.access_token).toBe(res.body.data.access_token);
      expect(res.body.data.tokens.refresh_token).toBe(res.body.data.refresh_token);

      expect(res.body.data.admin.email).toBe(adminEmail);
      expect(res.body.data.admin.role).toBe('SUPER_ADMIN');

      adminToken = res.body.data.access_token;
    });

    it('can access admin self profile GET /api/v1/admin-auth/me using tokens.accessToken', async () => {
      const res = await request(app)
        .get('/api/v1/admin-auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('demo.admin@camso.local');
      expect(res.body.data.role).toBe('SUPER_ADMIN');
    });

    it('can list admin users via GET /api/v1/admin/admin-users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/admin-users?pageSize=100')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((a) => a.email === 'demo.admin@camso.local')).toBe(true);
    });

    it('can inspect business organizations via GET /api/v1/admin/organizations', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations?pageSize=100')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const codes = res.body.data.map((o) => o.code);
      expect(codes).toContain('ORG-DEALER-DEMO');
      expect(codes).toContain('ORG-DISTRIB-DEMO');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Dealer Persona
  // ---------------------------------------------------------------------------
  describe(`Dealer Persona (${dealerEmail})`, () => {
    it('authenticates via POST /api/v1/business-auth/login and receives DEALER token', async () => {
      const res = await request(app)
        .post('/api/v1/business-auth/login')
        .send({
          email: dealerEmail,
          password: dealerPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.access_token).toBeDefined();
      expect(res.body.data.user.email).toBe(dealerEmail);
      expect(res.body.data.user.role).toBe('DEALER');
      expect(res.body.data.organization.code).toBe('ORG-DEALER-DEMO');

      dealerToken = res.body.data.tokens.access_token;
    });

    it('can access scoped organization details GET /api/v1/business/organization', async () => {
      const res = await request(app)
        .get('/api/v1/business/organization')
        .set('Authorization', `Bearer ${dealerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('ORG-DEALER-DEMO');
      expect(res.body.data.type).toBe('DEALER');
    });

    it('can access dealer portal GET /api/v1/business/dealer/portal', async () => {
      const res = await request(app)
        .get('/api/v1/business/dealer/portal')
        .set('Authorization', `Bearer ${dealerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.portal).toBe('DEALER_PORTAL');
    });

    it('is blocked from distributor portal GET /api/v1/business/distributor/portal (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/business/distributor/portal')
        .set('Authorization', `Bearer ${dealerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Distributor Persona
  // ---------------------------------------------------------------------------
  describe(`Distributor Persona (${distribEmail})`, () => {
    it('authenticates via POST /api/v1/business-auth/login and receives DISTRIBUTOR token', async () => {
      const res = await request(app)
        .post('/api/v1/business-auth/login')
        .send({
          email: distribEmail,
          password: distribPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.access_token).toBeDefined();
      expect(res.body.data.user.email).toBe(distribEmail);
      expect(res.body.data.user.role).toBe('DISTRIBUTOR');
      expect(res.body.data.organization.code).toBe('ORG-DISTRIB-DEMO');

      distribToken = res.body.data.tokens.access_token;
    });

    it('can access scoped organization details GET /api/v1/business/organization', async () => {
      const res = await request(app)
        .get('/api/v1/business/organization')
        .set('Authorization', `Bearer ${distribToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('ORG-DISTRIB-DEMO');
      expect(res.body.data.type).toBe('DISTRIBUTOR');
    });

    it('can access distributor portal GET /api/v1/business/distributor/portal', async () => {
      const res = await request(app)
        .get('/api/v1/business/distributor/portal')
        .set('Authorization', `Bearer ${distribToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.portal).toBe('DISTRIBUTOR_PORTAL');
    });

    it('is blocked from dealer portal GET /api/v1/business/dealer/portal (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/business/dealer/portal')
        .set('Authorization', `Bearer ${distribToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
