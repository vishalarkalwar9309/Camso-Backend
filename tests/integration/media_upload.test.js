'use strict';

/**
 * tests/integration/media_upload.test.js
 *
 * Integration tests for administrative media upload endpoint:
 * POST /api/v1/admin/media/upload
 */

const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/database');
const { generateAdminAccessToken } = require('../../src/core/utils/tokenService');

describe('Media Upload Integration Suite (POST /api/v1/admin/media/upload)', () => {
  let superAdminToken;
  let viewerToken;
  let demoAdmin;

  beforeAll(async () => {
    await prisma.$connect();

    // Use seeded demo admin from Gate 2B to satisfy audit_logs_actor_id foreign key constraint
    demoAdmin = await prisma.adminUser.findUnique({
      where: { email: 'demo.admin@camso.local' },
    });

    superAdminToken = generateAdminAccessToken({
      sub: demoAdmin.id,
      email: demoAdmin.email,
      role: 'SUPER_ADMIN',
    });

    viewerToken = generateAdminAccessToken({
      sub: demoAdmin.id,
      email: demoAdmin.email,
      role: 'VIEWER',
    });
  });

  afterAll(async () => {
    // Clean up test audit logs created during this test
    if (demoAdmin) {
      await prisma.auditLog.deleteMany({
        where: {
          actor_id: demoAdmin.id,
          entity_type: 'MEDIA_ASSET',
        },
      });
    }
    await prisma.$disconnect();
  });

  it('rejects upload with 401 Unauthorized when no token is provided', async () => {
    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .attach('file', Buffer.from('fake image content'), 'test.png');

    expect(res.status).toBe(401);
  });

  it('rejects upload with 403 Forbidden for VIEWER admin role', async () => {
    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .set('Authorization', `Bearer ${viewerToken}`)
      .attach('file', Buffer.from('fake image content'), 'test.png');

    expect(res.status).toBe(403);
  });

  it('rejects with 400 Bad Request when no file is attached in form-data', async () => {
    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects with 400 Bad Request when unsupported file mimetype is uploaded', async () => {
    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .attach('file', Buffer.from('malicious payload'), 'script.sh');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('successfully uploads valid image PNG file and returns 201 with metadata', async () => {
    const fileContent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('folder', 'products')
      .attach('file', fileContent, 'test_product_tire.png');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.filename).toMatch(/_test_product_tire\.png$/);
    expect(res.body.data.mimetype).toBe('image/png');
    expect(res.body.data.size).toBe(fileContent.length);
    expect(res.body.data.url).toBeDefined();
    expect(res.body.data.is_mock).toBe(true); // in local dev without cloud storage

    // Verify audit log entry was created
    const audit = await prisma.auditLog.findFirst({
      where: {
        actor_id: demoAdmin.id,
        entity_type: 'MEDIA_ASSET',
      },
      orderBy: { created_at: 'desc' },
    });
    expect(audit).not.toBeNull();
    expect(audit.action).toBe('CREATE');
  });

  it('successfully uploads valid PDF document file', async () => {
    const pdfContent = Buffer.from('%PDF-1.4 header and mock document bytes');

    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('folder', 'documents')
      .attach('file', pdfContent, 'warranty_guide.pdf');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mimetype).toBe('application/pdf');
    expect(res.body.data.filename).toMatch(/_warranty_guide\.pdf$/);
  });
});
