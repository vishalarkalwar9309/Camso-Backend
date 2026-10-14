'use strict';

/**
 * Integration tests — Search & Discovery Module.
 *
 * Runs against the Express application and verified PostgreSQL development database.
 * Tests 6-tier search ranking, recent search user isolation, and popular search aggregation.
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

describe('GET /api/v1/search — 6-Tier Search Ranking', () => {
  itDb('Tier 1: Exact PID match takes highest precedence (rank_tier = 1)', async () => {
    const res = await request(app).get('/api/v1/search?q=SKS-S1-10-16.5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].pid).toBe('SKS-S1-10-16.5');
    expect(res.body.data.items[0].rank_tier).toBe(1);
  });

  itDb('Tier 2: Exact product name match (rank_tier = 2)', async () => {
    const res = await request(app).get('/api/v1/search?q=MH 701 Telehandler Tire');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].pid).toBe('MH701-460-70R24');
    expect(res.body.data.items[0].rank_tier).toBe(2);
  });

  itDb('Tier 3: Product-name prefix match (rank_tier = 3)', async () => {
    const res = await request(app).get('/api/v1/search?q=CTL');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].pid).toBe('CTL400-400X86X52');
    expect(res.body.data.items[0].rank_tier).toBe(3);
  });

  itDb('Tier 4: Category match (rank_tier = 4)', async () => {
    const res = await request(app).get('/api/v1/search?q=telehandler');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].category.slug).toBe('telehandler');
    expect(res.body.data.items[0].rank_tier).toBe(4);
  });

  itDb('Tier 5: Specification attribute match (rank_tier = 5)', async () => {
    const res = await request(app).get('/api/v1/search?q=10PR');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].rank_tier).toBe(5);
  });

  itDb('Tier 6: Partial product-name / description match (rank_tier = 6)', async () => {
    const res = await request(app).get('/api/v1/search?q=Extreme');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].rank_tier).toBe(6);
  });

  itDb('combines query with category filter parameter', async () => {
    const res = await request(app).get('/api/v1/search?q=701&category=telehandler');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].pid).toBe('MH701-460-70R24');
  });

  itDb('combines query with spec_* query filter', async () => {
    const res = await request(app).get('/api/v1/search?spec_ply_rating=10PR');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  itDb('returns empty items array for non-matching query', async () => {
    const res = await request(app).get('/api/v1/search?q=nonexistent-query-xyz-999');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  itDb('paginates results deterministically', async () => {
    const res = await request(app).get('/api/v1/search?page=1&pageSize=2');
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(2);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.pageSize).toBe(2);
    expect(res.body.meta.total).toBe(7);
    expect(res.body.meta.totalPages).toBe(4);
  });

  itDb('rejects invalid page number (< 1)', async () => {
    const res = await request(app).get('/api/v1/search?page=0');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/v1/search/recent — Recent Search Isolation', () => {
  itDb('401 without JWT authentication', async () => {
    const res = await request(app).get('/api/v1/search/recent');
    expect(res.status).toBe(401);
  });

  itDb('isolates search history strictly per authenticated user', async () => {
    // 1. Create and login User A
    const userAEmail = `user-a-${Date.now()}@camso.test`;
    const regARes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: userAEmail, password: 'TestPassword1!' });
    const tokenA = regARes.body.data.access_token;

    // 2. Perform search as User A
    const uniqueQueryA = `unique-a-${Date.now()}`;
    await request(app)
      .get(`/api/v1/search?q=${uniqueQueryA}`)
      .set('Authorization', `Bearer ${tokenA}`);

    // Allow background write to settle
    await new Promise((r) => setTimeout(r, 100));

    // 3. User A retrieves recent searches
    const recentARes = await request(app)
      .get('/api/v1/search/recent')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(recentARes.status).toBe(200);
    const queriesA = recentARes.body.data.map((r) => r.query_text);
    expect(queriesA).toContain(uniqueQueryA);

    // 4. Create and login User B
    const userBEmail = `user-b-${Date.now()}@camso.test`;
    const regBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: userBEmail, password: 'TestPassword1!' });
    const tokenB = regBRes.body.data.access_token;

    // 5. User B retrieves recent searches — must NOT see User A's query
    const recentBRes = await request(app)
      .get('/api/v1/search/recent')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(recentBRes.status).toBe(200);
    const queriesB = recentBRes.body.data.map((r) => r.query_text);
    expect(queriesB).not.toContain(uniqueQueryA);
  });
});

describe('GET /api/v1/search/popular — Popular Search Aggregations', () => {
  itDb('returns aggregated top searches and updates on repeated searches', async () => {
    const popularTerm = `term-${Date.now()}`;

    // Perform search multiple times
    await request(app).get(`/api/v1/search?q=${popularTerm}`);
    await request(app).get(`/api/v1/search?q=${popularTerm}`);

    // Allow background write to settle
    await new Promise((r) => setTimeout(r, 150));

    const res = await request(app).get('/api/v1/search/popular?limit=20');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const match = res.body.data.find((p) => p.query_text === popularTerm.toLowerCase());
    expect(match).toBeDefined();
    expect(match.hit_count).toBeGreaterThanOrEqual(2);
  });
});
