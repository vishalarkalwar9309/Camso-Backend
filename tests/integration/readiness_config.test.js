'use strict';

/**
 * Integration tests — Readiness & Configuration Endpoints.
 *
 * Runs against the Express app and verified PostgreSQL development database.
 */

const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/database');
const { execFileSync } = require('child_process');
const path = require('path');

let dbAvailable = false;
try {
  execFileSync(process.execPath, [
    '-e',
    'require("./src/config/database").$connect().then(()=>process.exit(0)).catch(()=>process.exit(1))'
  ], {
    cwd: path.resolve(__dirname, '../..'),
    timeout: 3000,
    stdio: 'ignore',
  });
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

beforeAll(async () => {
  if (dbAvailable) {
    await prisma.$connect();
  }
});

afterAll(async () => {
  if (dbAvailable) {
    await prisma.$disconnect();
  }
});

function itDb(name, fn, timeout) {
  if (dbAvailable) {
    it(name, fn, timeout);
  } else {
    it.skip(name, fn, timeout);
  }
}

describe('Readiness & Liveness Endpoints', () => {
  it('GET /api/v1/health — returns 200 ok (liveness)', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.timestamp).toBeDefined();
  });

  it('GET /health — returns 200 ok (root liveness)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  itDb('GET /api/v1/ready — returns 200 ready when DB is connected (readiness)', async () => {
    const res = await request(app).get('/api/v1/ready');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ready');
    expect(res.body.data.checks.database).toBe('connected');
    expect(JSON.stringify(res.body)).not.toContain('password');
    expect(JSON.stringify(res.body)).not.toContain('localhost:5432');
  });

  itDb('GET /ready — returns 200 ready at root endpoint', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ready');
  });
});

describe('Configuration Endpoints — Languages', () => {
  itDb('GET /api/v1/languages — returns active supported languages', async () => {
    const res = await request(app).get('/api/v1/languages');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);

    const codes = res.body.data.map((l) => l.code);
    expect(codes).toContain('en');
    expect(codes).toContain('fr');
    expect(codes).toContain('de');
    expect(codes).toContain('it');
  });

  it('GET /api/v1/admin/languages — 401 without admin token', async () => {
    const res = await request(app).get('/api/v1/admin/languages');
    expect(res.status).toBe(401);
  });
});

describe('Configuration Endpoints — App Content & Dynamic Settings', () => {
  itDb('GET /api/v1/content — returns all active dynamic configurations', async () => {
    const res = await request(app).get('/api/v1/content');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const keys = res.body.data.map((c) => c.key);
    expect(keys).toContain('settings');
    expect(keys).toContain('about');
    expect(keys).toContain('contact');
    expect(keys).toContain('legal');
  });

  itDb('GET /api/v1/content/settings — returns runtime-configurable feature flags & notifications', async () => {
    const res = await request(app).get('/api/v1/content/settings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.key).toBe('settings');
    expect(res.body.data.content).toBeDefined();
    expect(res.body.data.content.notifications).toBeDefined();
    expect(res.body.data.content.features).toBeDefined();
  });

  itDb('GET /api/v1/content/unknown-key-xyz — returns 404', async () => {
    const res = await request(app).get('/api/v1/content/unknown-key-xyz');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PUT /api/v1/admin/content/settings — 401 without admin token', async () => {
    const res = await request(app)
      .put('/api/v1/admin/content/settings')
      .send({ title: 'New Title' });
    expect(res.status).toBe(401);
  });
});
