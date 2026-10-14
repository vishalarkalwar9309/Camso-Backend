'use strict';

/**
 * tests/integration/notifications_dispatch.test.js
 *
 * Integration tests for administrative push notification dispatch endpoint:
 * POST /api/v1/admin/notifications/send
 */

const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/database');
const { generateAdminAccessToken } = require('../../src/core/utils/tokenService');

describe('Notification Dispatch Integration Suite (POST /api/v1/admin/notifications/send)', () => {
  let superAdminToken;
  let marketingToken;
  let contentAdminToken;
  let demoAdmin;

  beforeAll(async () => {
    await prisma.$connect();

    demoAdmin = await prisma.adminUser.findUnique({
      where: { email: 'demo.admin@camso.local' },
    });

    superAdminToken = generateAdminAccessToken({
      sub: demoAdmin.id,
      email: demoAdmin.email,
      role: 'SUPER_ADMIN',
    });

    marketingToken = generateAdminAccessToken({
      sub: demoAdmin.id,
      email: demoAdmin.email,
      role: 'MARKETING',
    });

    contentAdminToken = generateAdminAccessToken({
      sub: demoAdmin.id,
      email: demoAdmin.email,
      role: 'CONTENT_ADMIN',
    });
  });

  afterAll(async () => {
    if (demoAdmin) {
      await prisma.auditLog.deleteMany({
        where: {
          actor_id: demoAdmin.id,
          entity_type: 'NOTIFICATION_DISPATCH',
        },
      });
    }
    await prisma.$disconnect();
  });

  it('rejects dispatch with 401 Unauthorized when no token is provided', async () => {
    const res = await request(app)
      .post('/api/v1/admin/notifications/send')
      .send({ title: 'New Launch' });

    expect(res.status).toBe(401);
  });

  it('rejects dispatch with 403 Forbidden for CONTENT_ADMIN (requires MARKETING or SUPER_ADMIN)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/notifications/send')
      .set('Authorization', `Bearer ${contentAdminToken}`)
      .send({ title: 'New Launch' });

    expect(res.status).toBe(403);
  });

  it('rejects with 400 Bad Request when title is empty', async () => {
    const res = await request(app)
      .post('/api/v1/admin/notifications/send')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('successfully dispatches broadcast notification for SUPER_ADMIN role', async () => {
    const res = await request(app)
      .post('/api/v1/admin/notifications/send')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        title: 'New CAMSO Heavy Duty Tire Available',
        body: 'Check out the upgraded traction tread in our product catalogue.',
        target_type: 'ALL_USERS',
        data: {
          type: 'new_product',
          productId: 'cmv-test-prod',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.targetCount).toBeDefined();
    expect(res.body.data.successCount).toBeDefined();
    expect(res.body.data.failureCount).toBe(0);
    expect(res.body.data.is_mock).toBe(true); // running offline/mock without live CEAT FCM credentials

    // Verify audit log entry
    const audit = await prisma.auditLog.findFirst({
      where: {
        actor_id: demoAdmin.id,
        entity_type: 'NOTIFICATION_DISPATCH',
      },
      orderBy: { created_at: 'desc' },
    });
    expect(audit).not.toBeNull();
    expect(audit.action).toBe('CREATE');
  });

  it('successfully dispatches platform-targeted notification for MARKETING role', async () => {
    const res = await request(app)
      .post('/api/v1/admin/notifications/send')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        title: 'iOS App Performance Update',
        body: 'Please restart your app for latest catalogue sync.',
        target_type: 'PLATFORM',
        target_value: 'IOS',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.is_mock).toBe(true);
  });
});
