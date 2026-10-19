'use strict';

/**
 * tests/integration/superAdminConsole.test.js
 *
 * 1. What this file does:
 *    Integration tests for Super Admin control plane endpoints: audit logs, system health diagnostics,
 *    and session revocation.
 * 2. Overall design:
 *    Uses Supertest against the full Express application with real JWT token authentication and RBAC checks.
 *    Verifies fail-closed access control (blocking unauthenticated and lower-privileged roles) and successful
 *    governance operations for SUPER_ADMIN.
 * 3. Elements in the file:
 *    - Setup beforeAll: Seeds test AdminUser records and generates role-scoped access tokens.
 *    - Teardown afterAll: Teardown database fixtures.
 *    - Test suites for Audit Logs, System Health, and Session Revocation.
 * 4. Final output of the file:
 *    Executes Jest assertions verifying Super Admin API contracts.
 */

const request = require('supertest');
const { createApp } = require('../../src/app');
const app = createApp();
const { prisma } = require('../../src/config/database');
const tokenService = require('../../src/core/utils/tokenService');

describe('Super Admin Console Integration Tests', () => {
  let superAdminToken;
  let contentAdminToken;
  let viewerToken;

  const superAdminId = 'cuid_sa_test_001';
  const contentAdminId = 'cuid_sa_test_002';
  const viewerId = 'cuid_sa_test_003';

  beforeAll(async () => {
    // Generate valid JWTs for various admin roles
    const superPair = tokenService.generateTokenPair({ id: superAdminId, type: 'ADMIN', role: 'SUPER_ADMIN' });
    superAdminToken = superPair.accessToken;

    const contentPair = tokenService.generateTokenPair({ id: contentAdminId, type: 'ADMIN', role: 'CONTENT_ADMIN' });
    contentAdminToken = contentPair.accessToken;

    const viewerPair = tokenService.generateTokenPair({ id: viewerId, type: 'ADMIN', role: 'VIEWER' });
    viewerToken = viewerPair.accessToken;

    // Seed AdminUsers
    await prisma.adminUser.upsert({
      where: { email: 'superadmin.integration@camso.test' },
      update: { is_active: true, role: 'SUPER_ADMIN' },
      create: {
        id: superAdminId,
        email: 'superadmin.integration@camso.test',
        password_hash: '$2b$10$hashedpasswordforexamplepurposes12',
        role: 'SUPER_ADMIN',
        is_active: true,
      },
    });

    await prisma.adminUser.upsert({
      where: { email: 'content.integration@camso.test' },
      update: { is_active: true, role: 'CONTENT_ADMIN' },
      create: {
        id: contentAdminId,
        email: 'content.integration@camso.test',
        password_hash: '$2b$10$hashedpasswordforexamplepurposes12',
        role: 'CONTENT_ADMIN',
        is_active: true,
      },
    });

    await prisma.adminUser.upsert({
      where: { email: 'viewer.integration@camso.test' },
      update: { is_active: true, role: 'VIEWER' },
      create: {
        id: viewerId,
        email: 'viewer.integration@camso.test',
        password_hash: '$2b$10$hashedpasswordforexamplepurposes12',
        role: 'VIEWER',
        is_active: true,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.adminUser.deleteMany({
        where: {
          id: { in: [superAdminId, contentAdminId, viewerId] },
        },
      });
    } catch {
      // Ignore teardown errors
    }
  });

  describe('GET /api/v1/admin/audit-logs', () => {
    it('returns 401 when called without authorization header', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs');

      expect(res.status).toBe(401);
    });

    it('returns 403 when called by a VIEWER', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 when called by a CONTENT_ADMIN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${contentAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 200 with paginated audit logs for SUPER_ADMIN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs?page=1&pageSize=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta || res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/v1/admin/system-health', () => {
    it('returns 401 when called without authorization header', async () => {
      const res = await request(app)
        .get('/api/v1/admin/system-health');

      expect(res.status).toBe(401);
    });

    it('returns 403 when called by CONTENT_ADMIN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/system-health')
        .set('Authorization', `Bearer ${contentAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 200 with comprehensive telemetry for SUPER_ADMIN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/system-health')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('database');
      expect(res.body.data).toHaveProperty('storage');
      expect(res.body.data).toHaveProperty('firebase');
      expect(res.body.data).toHaveProperty('counts');
      expect(res.body.data).toHaveProperty('system');
    });
  });

  describe('POST /api/v1/admin/admin-users/:id/revoke-sessions', () => {
    it('returns 403 when called by CONTENT_ADMIN', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/admin-users/${viewerId}/revoke-sessions`)
        .set('Authorization', `Bearer ${contentAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 200 and revokes sessions when called by SUPER_ADMIN', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/admin-users/${viewerId}/revoke-sessions`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.revoked).toBe(true);
    });
  });
});
