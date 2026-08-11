'use strict';

/**
 * tests/integration/health.test.js
 *
 * WHAT THIS FILE DOES:
 *   Integration tests for /api/v1/health and /api/v1/ready endpoints.
 *   Uses supertest against the Express app returned by createApp().
 *
 * OVERALL DESIGN:
 *   Verifies HTTP status codes, envelope structures, and health probe contracts.
 *
 * ELEMENTS IN THIS FILE:
 *   - GET /api/v1/health test suite
 *   - GET /api/v1/ready test suite
 *
 * FINAL OUTPUT OF THE FILE:
 *   Supertest integration test execution results.
 */

const request = require('supertest');
const { createApp } = require('../../src/app');
const app = createApp();

describe('Health & Readiness Integration Tests', () => {

  test('GET /api/v1/health returns 200 with ok status', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(typeof res.body.data.uptime).toBe('number');
  });

  test('GET /api/v1/ready returns response with check breakdown', async () => {
    const res = await request(app).get('/api/v1/ready');

    // May return 200 or 503 depending on local Postgres availability, but body format is strict
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('checks');
  });

  test('GET /api/v1/nonexistent returns 404 with ApiError envelope', async () => {
    const res = await request(app).get('/api/v1/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.type).toBe('NOT_FOUND');
  });
});
