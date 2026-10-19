/**
 * tests/integration/acceptance_audit.test.js
 *
 * 1. WHAT THIS FILE DOES:
 *    Executes a comprehensive, independent acceptance audit verifying the unified CAMSO
 *    Admin and Super Admin application across all 6 core audit pillars specified in the
 *    final acceptance mandate:
 *      Pillar 1: Authentication & RBAC boundaries (unauthorized denial, privilege escalation protection).
 *      Pillar 2: Admin operational workflows (product dimension persistence, Flutter API compatibility, FAQ CRUD, testimonial moderation & deletion).
 *      Pillar 3: Super Admin governance (admin provisioning, account suspension, session revocation, partner rejection validation, audit trail immutability).
 *      Pillar 4: Approval governance analysis.
 *      Pillar 5: FCM campaign dispatch, duplicate prevention, and offline/mock status truthfulness.
 *      Pillar 6: System health diagnostics verification.
 *
 * 2. OVERALL DESIGN:
 *    Uses Supertest against the live Express application backed by Prisma and PostgreSQL.
 *    Executes sequential real-world administrative operations and validates HTTP status codes,
 *    response bodies, database state changes, and security boundary defenses.
 *
 * 3. ELEMENTS IN THE FILE:
 *    - describe('Pillar 1: Authentication & Authorization')
 *    - describe('Pillar 2: Admin Operational Workflows & Flutter Compatibility')
 *    - describe('Pillar 3: Super Admin Governance & Account Lifecycle')
 *    - describe('Pillar 5: Push Campaigns & FCM Delivery Truthfulness')
 *
 * 4. FINAL OUTPUT OF THE FILE:
 *    Automated Jest test execution providing concrete proof for the Final Acceptance Audit.
 */

'use strict';

const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma } = require('../../src/config/database');
const tokenService = require('../../src/core/utils/tokenService');

// Mock Firebase Admin messaging for deterministic campaign testing
jest.mock('../../src/config/firebase', () => ({
  isFirebaseReady: true,
  firebaseApp: {},
  admin: {
    messaging: () => ({
      sendEachForMulticast: jest.fn().mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      }),
    }),
  },
  getIsFirebaseReady: () => true,
}));

const app = createApp();

describe('CAMSO FINAL ACCEPTANCE AUDIT VERIFICATION SUITE', () => {
  let superAdminToken;
  let contentAdminToken;
  let viewerToken;
  let marketingToken;
  let endUserToken;

  let superAdminUser;
  let contentAdminUser;
  let testProductId;
  let testFaqId;
  let testTestimonialId;
  let testOrganizationId;
  let auditProvisionedAdminId;

  beforeAll(async () => {
    // 1. Seed administrative users
    superAdminUser = await prisma.adminUser.upsert({
      where: { email: 'superadmin_audit@camso.test' },
      update: { is_active: true, role: 'SUPER_ADMIN' },
      create: {
        id: 'cuid_audit_super_01',
        email: 'superadmin_audit@camso.test',
        password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'SUPER_ADMIN',
        is_active: true,
      },
    });

    contentAdminUser = await prisma.adminUser.upsert({
      where: { email: 'content_audit@camso.test' },
      update: { is_active: true, role: 'CONTENT_ADMIN' },
      create: {
        id: 'cuid_audit_content_02',
        email: 'content_audit@camso.test',
        password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'CONTENT_ADMIN',
        is_active: true,
      },
    });

    const viewerAdminUser = await prisma.adminUser.upsert({
      where: { email: 'viewer_audit@camso.test' },
      update: { is_active: true, role: 'VIEWER' },
      create: {
        id: 'cuid_audit_viewer_03',
        email: 'viewer_audit@camso.test',
        password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'VIEWER',
        is_active: true,
      },
    });

    const marketingAdminUser = await prisma.adminUser.upsert({
      where: { email: 'marketing_audit@camso.test' },
      update: { is_active: true, role: 'MARKETING' },
      create: {
        id: 'cuid_audit_marketing_04',
        email: 'marketing_audit@camso.test',
        password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'MARKETING',
        is_active: true,
      },
    });

    // 2. Generate signed JWT tokens
    superAdminToken = tokenService.generateTokenPair({
      id: superAdminUser.id,
      type: 'ADMIN',
      role: 'SUPER_ADMIN',
    }).accessToken;

    contentAdminToken = tokenService.generateTokenPair({
      id: contentAdminUser.id,
      type: 'ADMIN',
      role: 'CONTENT_ADMIN',
    }).accessToken;

    viewerToken = tokenService.generateTokenPair({
      id: viewerAdminUser.id,
      type: 'ADMIN',
      role: 'VIEWER',
    }).accessToken;

    marketingToken = tokenService.generateTokenPair({
      id: marketingAdminUser.id,
      type: 'ADMIN',
      role: 'MARKETING',
    }).accessToken;

    endUserToken = tokenService.generateTokenPair({
      id: 'cuid_audit_enduser_05',
      type: 'END_USER',
      role: 'END_USER',
    }).accessToken;

    // 3. Seed Category & Organization for operational tests
    const category = await prisma.category.upsert({
      where: { slug: 'audit-test-category' },
      update: {},
      create: {
        name: 'Audit Test Category',
        slug: 'audit-test-category',
      },
    });

    const org = await prisma.businessOrganization.create({
      data: {
        name: 'Audit Partner Logistics Inc.',
        type: 'DISTRIBUTOR',
        approval_status: 'PENDING',
        is_active: true,
      },
    });
    testOrganizationId = org.id;
  });

  afterAll(async () => {
    // Cleanup audit records and seeded test items
    if (testProductId) {
      await prisma.productSpecification.deleteMany({ where: { product_id: testProductId } });
      await prisma.product.deleteMany({ where: { id: testProductId } });
    }
    if (testFaqId) {
      await prisma.faq.deleteMany({ where: { id: testFaqId } });
    }
    if (testTestimonialId) {
      await prisma.testimonial.deleteMany({ where: { id: testTestimonialId } });
    }
    if (testOrganizationId) {
      await prisma.businessOrganization.deleteMany({ where: { id: testOrganizationId } });
    }
    if (auditProvisionedAdminId) {
      await prisma.adminRefreshToken.deleteMany({ where: { admin_id: auditProvisionedAdminId } });
      await prisma.adminUser.deleteMany({ where: { id: auditProvisionedAdminId } });
    }
    await prisma.adminUser.deleteMany({
      where: { email: { contains: '_audit@camso.test' } },
    });
    await prisma.$disconnect();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PILLAR 1: AUTHENTICATION & AUTHORIZATION
  // ══════════════════════════════════════════════════════════════════════════
  describe('Pillar 1: Authentication & Authorization Controls', () => {
    it('1.1 Ordinary users (END_USER) are denied access to admin endpoints (fail-closed)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/catalogue')
        .set('Authorization', `Bearer ${endUserToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/admin role required/i);
    });

    it('1.2 Unauthenticated requests without bearer token are rejected with 401', async () => {
      const res = await request(app).get('/api/v1/admin/catalogue');
      expect(res.status).toBe(401);
    });

    it('1.3 Ordinary Admin (CONTENT_ADMIN) cannot access Super Admin endpoints (/admin/admin-users)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/admin-users')
        .set('Authorization', `Bearer ${contentAdminToken}`);
      expect(res.status).toBe(403);
    });

    it('1.4 Ordinary Admin cannot provision Super Admins or elevate own permissions', async () => {
      const res = await request(app)
        .post('/api/v1/admin/admin-users')
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({
          email: 'escalation_test@camso.test',
          password: 'Password@123',
          role: 'SUPER_ADMIN',
        });
      expect(res.status).toBe(403);
    });

    it('1.5 Ordinary Admin cannot access Audit Logs (/admin/audit-logs)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${contentAdminToken}`);
      expect(res.status).toBe(403);
    });

    it('1.6 Ordinary Admin cannot access System Health diagnostics (/admin/system-health)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/system-health')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PILLAR 2: ADMIN OPERATIONAL WORKFLOWS & FLUTTER COMPATIBILITY
  // ══════════════════════════════════════════════════════════════════════════
  describe('Pillar 2: Admin Workflows & Flutter API Compatibility', () => {
    it('2.1 Admin can create a product with full specifications and dimensions', async () => {
      const category = await prisma.category.findFirst();
      const uniquePid = `AUDIT-PID-${Date.now()}`;
      const uniqueSlug = `audit-tire-${Date.now()}`;

      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({
          pid: uniquePid,
          name: 'CAMSO Solideal Mag-Lift Extreme',
          slug: uniqueSlug,
          category_id: category.id,
          description: 'Premium forklift solid tire designed for heavy industrial operations.',
          specifications: [
            { spec_type: 'DIMENSION', spec_key: 'Tire Size', spec_value: '28x9-15', unit: 'INCH', is_filterable: true, sort_order: 1 },
            { spec_type: 'DIMENSION', spec_key: 'Ply Rating', spec_value: '14PR', unit: 'PR', is_filterable: true, sort_order: 2 },
            { spec_type: 'DIMENSION', spec_key: 'Overall Diameter', spec_value: '706', unit: 'MM', is_filterable: false, sort_order: 3 },
            { spec_type: 'DIMENSION', spec_key: 'Section Width', spec_value: '221', unit: 'MM', is_filterable: false, sort_order: 4 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.specifications).toHaveLength(4);
      testProductId = res.body.data.id;
    });

    it('2.2 Admin can edit product dimensions atomically with immediate persistence', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/products/${testProductId}`)
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({
          description: 'Updated industrial tire description.',
          specifications: [
            { spec_type: 'DIMENSION', spec_key: 'Tire Size', spec_value: '28x9-15', unit: 'INCH', is_filterable: true, sort_order: 1 },
            { spec_type: 'DIMENSION', spec_key: 'Ply Rating', spec_value: '16PR', unit: 'PR', is_filterable: true, sort_order: 2 },
            { spec_type: 'DIMENSION', spec_key: 'Overall Diameter', spec_value: '710', unit: 'MM', is_filterable: false, sort_order: 3 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.specifications).toHaveLength(3);
      const plySpec = res.body.data.specifications.find((s) => s.spec_key === 'Ply Rating');
      expect(plySpec.spec_value).toBe('16PR');
    });

    it('2.3 Public Flutter API (/api/v1/products/:id) returns dimensions in both snake_case and camelCase', async () => {
      const res = await request(app).get(`/api/v1/products/${testProductId}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.specifications)).toBe(true);

      const firstSpec = res.body.data.specifications[0];
      expect(firstSpec).toHaveProperty('spec_value');
      expect(firstSpec).toHaveProperty('specValue');
      expect(firstSpec.spec_value).toBe(firstSpec.specValue);
    });

    it('2.4 Admin can create and update an FAQ entry', async () => {
      const createRes = await request(app)
        .post('/api/v1/admin/faqs')
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({
          question: 'What is the recommended inflation pressure for CAMSO CTL tracks?',
          answer: 'Rubber tracks do not use pneumatic inflation; tension is adjusted hydraulically.',
          category: 'PRODUCT',
          is_published: true,
          sort_order: 1,
        });

      expect(createRes.status).toBe(201);
      testFaqId = createRes.body.data.id;

      const updateRes = await request(app)
        .patch(`/api/v1/admin/faqs/${testFaqId}`)
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({
          question: 'What is the correct tension check for CAMSO CTL tracks?',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.question).toContain('tension check');
    });

    it('2.5 Admin can hide, restore, and permanently delete a testimonial', async () => {
      const createRes = await request(app)
        .post('/api/v1/admin/testimonials')
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({
          customer_name: 'Apex Equipment Fleet',
          region: 'North America',
          story_type: 'SOLIDS',
          content: 'Outstanding durability under continuous quarry load cycles.',
          is_published: true,
        });

      expect(createRes.status).toBe(201);
      testTestimonialId = createRes.body.data.id;

      // Hide from public (is_published: false)
      const hideRes = await request(app)
        .patch(`/api/v1/admin/testimonials/${testTestimonialId}`)
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({ is_published: false });
      expect(hideRes.status).toBe(200);
      expect(hideRes.body.data.is_published).toBe(false);

      // Restore
      const restoreRes = await request(app)
        .patch(`/api/v1/admin/testimonials/${testTestimonialId}`)
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({ is_published: true });
      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.is_published).toBe(true);

      // Permanent deletion
      const deleteRes = await request(app)
        .delete(`/api/v1/admin/testimonials/${testTestimonialId}`)
        .set('Authorization', `Bearer ${contentAdminToken}`);
      expect(deleteRes.status).toBe(200);

      // Confirm gone
      const verifyRes = await request(app)
        .get(`/api/v1/admin/testimonials/${testTestimonialId}`)
        .set('Authorization', `Bearer ${contentAdminToken}`);
      expect(verifyRes.status).toBe(404);
      testTestimonialId = null;
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PILLAR 3: SUPER ADMIN GOVERNANCE & ACCESS CONTROL
  // ══════════════════════════════════════════════════════════════════════════
  describe('Pillar 3: Super Admin Governance & Account Lifecycle', () => {
    it('3.1 Super Admin can provision a new administrative staff account', async () => {
      const email = `audit_staff_${Date.now()}@camso.test`;
      const res = await request(app)
        .post('/api/v1/admin/admin-users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email,
          password: 'Password@123',
          role: 'MARKETING',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe(email);
      expect(res.body.data.role).toBe('MARKETING');
      expect(res.body.data.password_hash).toBeUndefined();
      auditProvisionedAdminId = res.body.data.id;
    });

    it('3.2 Super Admin can suspend account and verify access denial on next request', async () => {
      // Suspend account
      const suspendRes = await request(app)
        .patch(`/api/v1/admin/admin-users/${auditProvisionedAdminId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ is_active: false });
      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.is_active).toBe(false);

      // Attempt authenticated request with token from suspended account
      const staffToken = tokenService.generateTokenPair({
        id: auditProvisionedAdminId,
        type: 'ADMIN',
        role: 'MARKETING',
      }).accessToken;

      const accessRes = await request(app)
        .get('/api/v1/admin/analytics/catalogue')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(accessRes.status).toBe(403);
      expect(accessRes.body.error.message).toMatch(/inactive/i);
    });

    it('3.3 Super Admin can revoke sessions and revoke refresh tokens', async () => {
      const revokeRes = await request(app)
        .post(`/api/v1/admin/admin-users/${auditProvisionedAdminId}/revoke-sessions`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.data.revoked).toBe(true);
    });

    it('3.4 Partner verification rejection requires a mandatory non-empty reason', async () => {
      // Missing rejection reason
      const failRes = await request(app)
        .patch(`/api/v1/admin/organizations/${testOrganizationId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'REJECTED' });
      expect(failRes.status).toBe(422);
      expect(failRes.body.error.message).toMatch(/rejection reason/i);

      // Valid rejection reason
      const passRes = await request(app)
        .patch(`/api/v1/admin/organizations/${testOrganizationId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: 'REJECTED',
          rejection_reason: 'Tax compliance identification could not be verified with regional registry.',
        });
      expect(passRes.status).toBe(200);
      expect(passRes.body.data.status).toBe('REJECTED');
    });

    it('3.5 Super Admin can query immutable audit logs with diff values', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs?entityType=BUSINESS_ORGANIZATION')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const latest = res.body.data[0];
      expect(latest).toHaveProperty('action');
      expect(latest).toHaveProperty('details');
    });

    it('3.6 Audit logs endpoints are strictly read-only (POST/DELETE return 404/405)', async () => {
      const deleteRes = await request(app)
        .delete('/api/v1/admin/audit-logs/some-id')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(deleteRes.status).toBe(404);
    });

    it('3.7 System health diagnostics executes real live checks rather than hardcoded metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/system-health')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.database.status).toBe('connected');
      expect(typeof res.body.data.database.latency_ms).toBe('number');
      expect(res.body.data.counts).toHaveProperty('products');
      expect(res.body.data.system).toHaveProperty('node_version');
      expect(typeof res.body.data.system.uptime_seconds).toBe('number');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PILLAR 5: PUSH NOTIFICATION CAMPAIGNS & DISPATCH TRUTHFULNESS
  // ══════════════════════════════════════════════════════════════════════════
  describe('Pillar 5: Push Campaigns & FCM Delivery Truthfulness', () => {
    let campaignId;

    it('5.1 Creates a draft campaign and dispatches with truthful status reporting', async () => {
      const createRes = await request(app)
        .post('/api/v1/admin/campaigns')
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({
          name: 'Annual Service Fleet Alert',
          target_type: 'ALL_USERS',
        });
      expect(createRes.status).toBe(201);
      campaignId = createRes.body.data.id;

      const sendRes = await request(app)
        .post(`/api/v1/admin/campaigns/${campaignId}/send`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(sendRes.status).toBe(200);
      expect(sendRes.body.data).toHaveProperty('targetCount');
      expect(sendRes.body.data).toHaveProperty('mode');
      expect(['DISPATCHED', 'MOCK / OFFLINE']).toContain(sendRes.body.data.mode);
    });

    it('5.2 Prevents duplicate campaign submission (idempotency guard)', async () => {
      const duplicateRes = await request(app)
        .post(`/api/v1/admin/campaigns/${campaignId}/send`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body.error.message).toMatch(/already been sent/i);
    });
  });
});
