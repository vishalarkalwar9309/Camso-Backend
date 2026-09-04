'use strict';

/**
 * Integration tests — Authentication + Users HTTP layer.
 *
 * Uses Supertest against the Express app directly (no HTTP port binding).
 *
 * DATABASE CONSTRAINT:
 *   These tests require a live PostgreSQL connection.
 *   If the database is unavailable, ALL integration tests are explicitly
 *   SKIPPED (shown as ○ SKIPPED in Jest output — never as ✓ PASSED).
 *
 *   Unit tests (tests/unit/) run independently and are unaffected.
 */

const request = require('supertest');
const app     = require('../../src/app');
const prisma  = require('../../src/config/database');

// ---------------------------------------------------------------------------
// DB availability gate
// ---------------------------------------------------------------------------
let dbAvailable = false;

beforeAll(async () => {
  try {
    await prisma.$connect();
    dbAvailable = true;
  } catch {
    console.warn(
      '\n⚠️  ─────────────────────────────────────────────────────\n' +
      '   INTEGRATION TESTS SKIPPED — PostgreSQL is unavailable.\n' +
      '   Run these tests when a database connection is available.\n' +
      '   Unit tests (tests/unit/) are unaffected.\n' +
      '   ─────────────────────────────────────────────────────\n'
    );
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

/**
 * Wraps a test so it is skipped (marked ○ SKIPPED) when the DB is unavailable.
 * Usage: itDb('test name', async () => { ... });
 */
function itDb(name, fn, timeout) {
  if (dbAvailable) {
    it(name, fn, timeout);
  } else {
    it.skip(name, fn, timeout);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DEVICE = { device_id: `test-device-${Date.now()}`, platform: 'ANDROID' };
const USER   = { email: `test-${Date.now()}@camso.test`, password: 'TestPass99!' };

let accessToken  = '';
let refreshToken = '';

// ---------------------------------------------------------------------------
// POST /api/v1/auth/guest
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/guest', () => {
  itDb('201 — creates a new guest session for an unknown device', async () => {
    const res = await request(app)
      .post('/api/v1/auth/guest')
      .send(DEVICE);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.refresh_token).toBeDefined();
    expect(res.body.data.user.is_guest).toBe(true);
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  itDb('200 — reuses existing guest session for known device', async () => {
    const res = await request(app)
      .post('/api/v1/auth/guest')
      .send(DEVICE); // same device_id as above

    expect(res.status).toBe(200);
    expect(res.body.data.user.is_guest).toBe(true);
  });

  itDb('400 — missing device_id', async () => {
    const res = await request(app)
      .post('/api/v1/auth/guest')
      .send({ platform: 'IOS' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  itDb('400 — invalid platform value', async () => {
    const res = await request(app)
      .post('/api/v1/auth/guest')
      .send({ device_id: 'x', platform: 'WINDOWS' });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/register
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/register', () => {
  itDb('201 — creates a new registered user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(USER);

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(USER.email);
    expect(res.body.data.user.is_guest).toBe(false);
    expect(res.body.data.user).not.toHaveProperty('password_hash');

    // Store tokens for downstream tests
    accessToken  = res.body.data.access_token;
    refreshToken = res.body.data.refresh_token;
  });

  itDb('response does not contain password_hash at any level', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: `another-${Date.now()}@camso.test`, password: 'TestPass99!' });

    expect(JSON.stringify(res.body)).not.toContain('password_hash');
  });

  itDb('409 — duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(USER); // same email

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already exists/i);
  });

  itDb('400 — password too short (< 8 chars)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'short@test.com', password: 'abc' });

    expect(res.status).toBe(400);
  });

  itDb('400 — invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'ValidPass1!' });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/login', () => {
  itDb('200 — valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send(USER);

    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  itDb('401 — wrong password (same message as unknown email)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: USER.email, password: 'WrongPass!' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password.');
  });

  itDb('401 — unknown email (same message as wrong password)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@camso.test', password: 'DoesNotMatter1!' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password.');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/refresh
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/refresh', () => {
  itDb('200 — returns a new token pair', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.refresh_token).toBeDefined();

    // Store new tokens for subsequent tests
    accessToken  = res.body.data.access_token;
    refreshToken = res.body.data.refresh_token;
  });

  itDb('401 — old refresh token is revoked after rotation', async () => {
    // Login fresh to get a clean token pair
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send(USER);
    const oldRefresh = loginRes.body.data.refresh_token;

    // Rotate it
    await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: oldRefresh });

    // Attempt to reuse the old (now revoked) token
    const reuse = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: oldRefresh });

    expect(reuse.status).toBe(401);
  });

  itDb('401 — garbage refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: 'garbage-token-xyz' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/users/me
// ---------------------------------------------------------------------------
describe('GET /api/v1/users/me', () => {
  itDb('200 — returns authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(USER.email);
    expect(res.body.data).not.toHaveProperty('password_hash');
  });

  itDb('response contains no password_hash at any level', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(JSON.stringify(res.body)).not.toContain('password_hash');
  });

  itDb('401 — no Authorization header', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  itDb('401 — malformed Authorization header', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'InvalidHeader');

    expect(res.status).toBe(401);
  });

  itDb('401 — expired access token', async () => {
    const jwt = require('jsonwebtoken');
    const jwtConfig = require('../../src/config/jwt');
    const expiredToken = jwt.sign(
      { sub: 'any-user', is_guest: false },
      jwtConfig.accessSecret,
      { expiresIn: 1 }
    );
    await new Promise((r) => setTimeout(r, 1100));

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/expired/i);
  }, 5000);
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/users/me
// ---------------------------------------------------------------------------
describe('PATCH /api/v1/users/me', () => {
  itDb('200 — updates display_name', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ display_name: 'Test User' });

    expect(res.status).toBe(200);
    expect(res.body.data.display_name).toBe('Test User');
  });

  itDb('200 — updates preferred_language', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ preferred_language: 'hi' });

    expect(res.status).toBe(200);
    expect(res.body.data.preferred_language).toBe('hi');
  });

  itDb('400 — empty body (no permitted fields)', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  itDb('401 — no token', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .send({ display_name: 'Hacker' });

    expect(res.status).toBe(401);
  });

  itDb('email field in body does not change email (stripped by validation)', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'hacker@test.com', display_name: 'OK Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(USER.email); // unchanged
  });
});
