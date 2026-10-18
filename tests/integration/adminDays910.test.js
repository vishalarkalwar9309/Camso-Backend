/**
 * tests/integration/adminDays910.test.js
 *
 * 1. WHAT THIS FILE DOES:
 *    Executes integration tests for Days 9–10 scope including Admin Dealers CRUD,
 *    Feedback read and CSV export, Notifications CRUD, Campaigns CRUD and send,
 *    and Admin Users lifecycle governance (SUPER_ADMIN only).
 * 2. OVERALL DESIGN:
 *    Uses Supertest against the live Express application backed by Prisma PostgreSQL database.
 *    Mocks Firebase Admin messaging to verify push campaign dispatch without external network calls.
 *    Validates RBAC permissions, input validation, and account deactivation rejections.
 * 3. ELEMENTS IN THE FILE:
 *    - Admin Dealers CRUD test suite
 *    - Admin Feedback READ & CSV Export test suite
 *    - Admin Notifications CRUD test suite
 *    - Admin Campaigns CRUD & /send test suite
 *    - Admin Users Management & Inactive Admin rejection test suite
 * 4. FINAL OUTPUT OF THE FILE:
 *    Jest test execution verifying Days 9–10 admin endpoints and RBAC boundaries.
 */

const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma } = require('../../src/config/database');
const tokenService = require('../../src/core/utils/tokenService');

// ── Mock Firebase Admin for FCM tests ─────────────────────────────────────
jest.mock('../../src/config/firebase', () => ({
  isFirebaseReady: true,
  firebaseApp: {},
  admin: {
    messaging: () => ({
      sendEachForMulticast: jest.fn().mockResolvedValue({
        successCount: 2,
        failureCount: 1,
        responses: [
          { success: true },
          { success: true },
          {
            success: false,
            error: { code: 'messaging/registration-token-not-registered' },
          },
        ],
      }),
    }),
  },
}));

const app = createApp();

describe('Days 9–10 Admin Integration Tests', () => {
  let superAdminToken;
  let contentAdminToken;
  let viewerToken;
  let marketingToken;

  // Shared created IDs across test suites
  let dealerId;
  let notificationId;
  let campaignId;

  beforeAll(async () => {
    // Generate valid JWTs
    superAdminToken = tokenService.generateTokenPair({ id: 'cuid_admin_user_001', type: 'ADMIN', role: 'SUPER_ADMIN' }).accessToken;
    contentAdminToken = tokenService.generateTokenPair({ id: 'cuid_admin_user_002', type: 'ADMIN', role: 'CONTENT_ADMIN' }).accessToken;
    viewerToken = tokenService.generateTokenPair({ id: 'cuid_admin_user_003', type: 'ADMIN', role: 'VIEWER' }).accessToken;
    marketingToken = tokenService.generateTokenPair({ id: 'cuid_admin_user_004', type: 'ADMIN', role: 'MARKETING' }).accessToken;

    // Seed admin users in DB (required for adminGuard is_active check)
    await prisma.adminUser.upsert({ where: { email: 'admin@example.com' }, update: {}, create: { id: 'cuid_admin_user_001', email: 'admin@example.com', password_hash: 'hash', role: 'SUPER_ADMIN' } });
    await prisma.adminUser.upsert({ where: { email: 'content@example.com' }, update: {}, create: { id: 'cuid_admin_user_002', email: 'content@example.com', password_hash: 'hash', role: 'CONTENT_ADMIN' } });
    await prisma.adminUser.upsert({ where: { email: 'viewer@example.com' }, update: {}, create: { id: 'cuid_admin_user_003', email: 'viewer@example.com', password_hash: 'hash', role: 'VIEWER' } });
    await prisma.adminUser.upsert({ where: { email: 'marketing@example.com' }, update: {}, create: { id: 'cuid_admin_user_004', email: 'marketing@example.com', password_hash: 'hash', role: 'MARKETING' } });

    // Clean up any test-specific admin users from previous runs
    await prisma.adminUser.deleteMany({ where: { email: { contains: '@camso.test' } } });

    // Seed language for translations
    await prisma.language.upsert({ where: { code: 'en' }, update: {}, create: { code: 'en', name: 'English', is_active: true } });

    // Seed a dealer for read tests
    const existingDealer = await prisma.dealer.findFirst({ where: { email: 'test-dealer@camso.test' } });
    if (!existingDealer) {
      const d = await prisma.dealer.create({
        data: { name: 'Test Dealer', type: 'DEALER', address: '1 Main St', city: 'TestCity', state: 'TS', country: 'IN', geo_lat: 12.0, geo_lng: 77.0, phone: '9999999999', email: 'test-dealer@camso.test', has_csr: false, is_active: true },
      });
      dealerId = d.id;
    } else {
      dealerId = existingDealer.id;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ════════════════════════════════════════════════════════════════
  // ADMIN DEALERS
  // ════════════════════════════════════════════════════════════════
  describe('Admin Dealers', () => {
    it('VIEWER can list dealers', async () => {
      const res = await request(app).get('/api/v1/admin/dealers').set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('VIEWER can get dealer by ID', async () => {
      const res = await request(app).get(`/api/v1/admin/dealers/${dealerId}`).set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(dealerId);
    });

    it('VIEWER cannot create a dealer', async () => {
      const res = await request(app).post('/api/v1/admin/dealers').set('Authorization', `Bearer ${viewerToken}`).send({ name: 'X' });
      expect(res.status).toBe(403);
    });

    it('MARKETING cannot create a dealer', async () => {
      const res = await request(app).post('/api/v1/admin/dealers').set('Authorization', `Bearer ${marketingToken}`).send({ name: 'X' });
      expect(res.status).toBe(403);
    });

    let newDealerId;
    it('CONTENT_ADMIN can create a dealer', async () => {
      const res = await request(app)
        .post('/api/v1/admin/dealers')
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({ name: 'New Dealer', type: 'DISTRIBUTOR', address: '2 Test Ave', city: 'Pune', state: 'MH', country: 'IN', geo_lat: 18.5, geo_lng: 73.8, phone: '8888888888', email: 'new-dealer@camso.test', has_csr: true, is_active: true });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('New Dealer');
      newDealerId = res.body.data.id;
    });

    it('CONTENT_ADMIN can update a dealer', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/dealers/${newDealerId}`)
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({ is_active: false });
      expect(res.status).toBe(200);
      expect(res.body.data.is_active).toBe(false);
    });

    it('Validation: missing required field on create', async () => {
      const res = await request(app)
        .post('/api/v1/admin/dealers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Incomplete' });
      expect(res.status).toBe(422);
    });

    it('404 on non-existent dealer', async () => {
      const res = await request(app).get('/api/v1/admin/dealers/99999999').set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(404);
    });

    it('Unauthenticated request is rejected', async () => {
      const res = await request(app).get('/api/v1/admin/dealers');
      expect(res.status).toBe(401);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // ADMIN FEEDBACK
  // ════════════════════════════════════════════════════════════════
  describe('Admin Feedback', () => {
    it('VIEWER can list feedback', async () => {
      const res = await request(app).get('/api/v1/admin/feedback').set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('CONTENT_ADMIN can list feedback', async () => {
      const res = await request(app).get('/api/v1/admin/feedback').set('Authorization', `Bearer ${contentAdminToken}`);
      expect(res.status).toBe(200);
    });

    it('SUPER_ADMIN can export feedback as CSV', async () => {
      const res = await request(app).get('/api/v1/admin/feedback/export?format=csv').set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      // CSV header row must be present
      expect(res.text).toContain('id,user_id,device_id');
    });

    it('MARKETING cannot access admin feedback', async () => {
      const res = await request(app).get('/api/v1/admin/feedback').set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(403);
    });

    it('Unauthenticated cannot access admin feedback', async () => {
      const res = await request(app).get('/api/v1/admin/feedback');
      expect(res.status).toBe(401);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // ADMIN NOTIFICATIONS
  // ════════════════════════════════════════════════════════════════
  describe('Admin Notifications', () => {
    it('VIEWER can list notifications', async () => {
      const res = await request(app).get('/api/v1/admin/notifications').set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
    });

    it('VIEWER cannot create a notification', async () => {
      const res = await request(app).post('/api/v1/admin/notifications').set('Authorization', `Bearer ${viewerToken}`).send({ notification_type: 'PROMOTION' });
      expect(res.status).toBe(403);
    });

    it('CONTENT_ADMIN cannot create a notification (MARKETING role required)', async () => {
      const res = await request(app).post('/api/v1/admin/notifications').set('Authorization', `Bearer ${contentAdminToken}`).send({ notification_type: 'PROMOTION' });
      expect(res.status).toBe(403);
    });

    it('MARKETING can create a notification', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications')
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({
          notification_type: 'NEW_LAUNCH',
          translations: [
            { field: 'title', language_code: 'en', value: 'New Launch Alert' },
            { field: 'body', language_code: 'en', value: 'Check out our new product.' },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body.data.notification_type).toBe('NEW_LAUNCH');
      notificationId = res.body.data.id;
    });

    it('MARKETING can get a notification by ID', async () => {
      const res = await request(app).get(`/api/v1/admin/notifications/${notificationId}`).set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(notificationId);
    });

    it('MARKETING can update a notification', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ translations: [{ field: 'title', language_code: 'en', value: 'Updated Title' }] });
      expect(res.status).toBe(200);
    });

    it('Validation: missing notification_type returns 422', async () => {
      const res = await request(app).post('/api/v1/admin/notifications').set('Authorization', `Bearer ${marketingToken}`).send({});
      expect(res.status).toBe(422);
    });

    it('Public /notifications endpoint still returns only SENT records', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(200);
      // All returned notifications must have status SENT
      res.body.data.forEach((n) => {
        if (n.status) expect(n.status).toBe('SENT');
      });
    });
  });

  // ════════════════════════════════════════════════════════════════
  // ADMIN CAMPAIGNS
  // ════════════════════════════════════════════════════════════════
  describe('Admin Campaigns', () => {
    it('VIEWER can list campaigns', async () => {
      const res = await request(app).get('/api/v1/admin/campaigns').set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
    });

    it('CONTENT_ADMIN cannot create a campaign', async () => {
      const res = await request(app).post('/api/v1/admin/campaigns').set('Authorization', `Bearer ${contentAdminToken}`).send({ name: 'X', target_type: 'ALL_USERS' });
      expect(res.status).toBe(403);
    });

    it('MARKETING can create a campaign as DRAFT', async () => {
      const res = await request(app)
        .post('/api/v1/admin/campaigns')
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ name: 'Test Campaign', target_type: 'ALL_USERS' });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.name).toBe('Test Campaign');
      campaignId = res.body.data.id;
    });

    it('MARKETING can get campaign by ID', async () => {
      const res = await request(app).get(`/api/v1/admin/campaigns/${campaignId}`).set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(campaignId);
    });

    it('MARKETING can update a DRAFT campaign', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ name: 'Updated Campaign' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Campaign');
    });

    it('Validation: missing target_value for COUNTRY target type', async () => {
      const res = await request(app)
        .post('/api/v1/admin/campaigns')
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ name: 'Bad Campaign', target_type: 'COUNTRY' });
      expect(res.status).toBe(422);
    });

    it('MARKETING can send a campaign (FCM mocked)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/campaigns/${campaignId}/send`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('targetCount');
      expect(res.body.data).toHaveProperty('successCount');
      expect(res.body.data).toHaveProperty('failureCount');
    });

    it('Cannot send an already-SENT campaign again', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/campaigns/${campaignId}/send`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(400);
    });

    it('Cannot update an already-SENT campaign', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ name: 'Should fail' });
      expect(res.status).toBe(400);
    });

    it('VIEWER cannot send a campaign', async () => {
      const draftRes = await request(app)
        .post('/api/v1/admin/campaigns')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Viewer test', target_type: 'ALL_USERS' });
      const newId = draftRes.body.data.id;
      const sendRes = await request(app).post(`/api/v1/admin/campaigns/${newId}/send`).set('Authorization', `Bearer ${viewerToken}`);
      expect(sendRes.status).toBe(403);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // ADMIN USERS (SUPER_ADMIN only)
  // ════════════════════════════════════════════════════════════════
  describe('Admin Users Management', () => {
    let createdAdminId;

    it('Non-SUPER_ADMIN (VIEWER) cannot list admin users', async () => {
      const res = await request(app).get('/api/v1/admin/admin-users').set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(403);
    });

    it('Non-SUPER_ADMIN (MARKETING) cannot list admin users', async () => {
      const res = await request(app).get('/api/v1/admin/admin-users').set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(403);
    });

    it('SUPER_ADMIN can list admin users', async () => {
      const res = await request(app).get('/api/v1/admin/admin-users').set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('password_hash is never returned in list', async () => {
      const res = await request(app).get('/api/v1/admin/admin-users').set('Authorization', `Bearer ${superAdminToken}`);
      res.body.data.forEach((admin) => {
        expect(admin.password_hash).toBeUndefined();
      });
    });

    it('SUPER_ADMIN can create a new admin user', async () => {
      const uid = Math.random().toString(36).slice(2, 10);
      const testEmail = `newadmin_${uid}@test.camso`;
      const res = await request(app)
        .post('/api/v1/admin/admin-users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: testEmail, password: 'securepass123', role: 'CONTENT_ADMIN' });
      expect(res.status).toBe(201);
      expect(res.body.data.email).toContain('newadmin');
      expect(res.body.data.role).toBe('CONTENT_ADMIN');
      expect(res.body.data.password_hash).toBeUndefined();
      createdAdminId = res.body.data.id;
    });

    it('Duplicate email is rejected with 409', async () => {
      const res = await request(app)
        .post('/api/v1/admin/admin-users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: 'admin@example.com', password: 'somepassword', role: 'VIEWER' });
      expect(res.status).toBe(409);
    });

    it('Invalid role is rejected with 422', async () => {
      const res = await request(app)
        .post('/api/v1/admin/admin-users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: 'invalid@camso.test', password: 'somepassword', role: 'GOD_ADMIN' });
      expect(res.status).toBe(422);
    });

    it('Short password is rejected with 422', async () => {
      const res = await request(app)
        .post('/api/v1/admin/admin-users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: 'short@camso.test', password: 'short', role: 'VIEWER' });
      expect(res.status).toBe(422);
    });

    it('SUPER_ADMIN can get admin user by ID', async () => {
      if (!createdAdminId) return; // guard: skip if create failed
      const res = await request(app).get(`/api/v1/admin/admin-users/${createdAdminId}`).set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.password_hash).toBeUndefined();
    });

    it('SUPER_ADMIN can deactivate an admin user', async () => {
      if (!createdAdminId) return; // guard: skip if create failed
      const res = await request(app)
        .patch(`/api/v1/admin/admin-users/${createdAdminId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ is_active: false });
      expect(res.status).toBe(200);
      expect(res.body.data.is_active).toBe(false);
    });

    it('SUPER_ADMIN can change admin user role', async () => {
      if (!createdAdminId) return; // guard: skip if create failed
      const res = await request(app)
        .patch(`/api/v1/admin/admin-users/${createdAdminId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'MARKETING' });
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('MARKETING');
    });

    it('Non-SUPER_ADMIN cannot deactivate admin users', async () => {
      if (!createdAdminId) return; // guard
      const res = await request(app)
        .patch(`/api/v1/admin/admin-users/${createdAdminId}`)
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({ is_active: false });
      expect(res.status).toBe(403);
    });

    it('Inactive admin is rejected by adminGuard', async () => {
      if (!createdAdminId) return; // guard: skip if create failed
      // Ensure the created admin is deactivated (status from earlier patch test)
      await prisma.adminUser.update({ where: { id: createdAdminId }, data: { is_active: false } });
      const inactiveToken = tokenService.generateTokenPair({ id: createdAdminId, type: 'ADMIN', role: 'MARKETING' }).accessToken;
      const res = await request(app).get('/api/v1/admin/admin-users').set('Authorization', `Bearer ${inactiveToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/inactive/i);
    });
  });
});
