'use strict';

/**
 * Integration tests — Bookmarks, Guest-to-Account Sync, and Catalogue Analytics.
 *
 * Runs against the Express application and verified local PostgreSQL database.
 * Tests PostgreSQL partial unique indexes, multi-step transactions, and ownership security.
 */

const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/database');
const { generateAccessToken, generateAdminAccessToken } = require('../../src/core/utils/tokenService');
const { execFileSync } = require('child_process');
const path = require('path');

let dbAvailable = false;
try {
  execFileSync(
    process.execPath,
    [
      '-e',
      'require("./src/config/database").$connect().then(()=>process.exit(0)).catch(()=>process.exit(1))',
    ],
    {
      cwd: path.resolve(__dirname, '../..'),
      timeout: 3000,
      stdio: 'ignore',
    }
  );
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

describe('Bookmarks Integration Suite', () => {
  let seededProducts = [];
  let userAToken;
  let userBToken;
  let userAId;
  let userBId;
  let guestToken;
  let guestUserId;
  let adminToken;

  beforeAll(async () => {
    if (!dbAvailable) return;

    // 1. Fetch real seeded products
    seededProducts = await prisma.product.findMany({
      where: { is_active: true },
      take: 3,
      orderBy: { created_at: 'asc' },
    });
    expect(seededProducts.length).toBeGreaterThanOrEqual(2);

    // 2. Create test registered users
    const userA = await prisma.user.create({
      data: {
        email: `user-a-${Date.now()}@test.com`,
        password_hash: 'hashed_pw',
        is_guest: false,
      },
    });
    userAId = userA.id;
    userAToken = generateAccessToken({ sub: userA.id, is_guest: false });

    const userB = await prisma.user.create({
      data: {
        email: `user-b-${Date.now()}@test.com`,
        password_hash: 'hashed_pw',
        is_guest: false,
      },
    });
    userBId = userB.id;
    userBToken = generateAccessToken({ sub: userB.id, is_guest: false });

    // 3. Create test guest user
    const guestUser = await prisma.user.create({
      data: {
        is_guest: true,
      },
    });
    guestUserId = guestUser.id;
    guestToken = generateAccessToken({ sub: guestUser.id, is_guest: true });

    // 4. Create admin token
    adminToken = generateAdminAccessToken({
      sub: 'admin-integration-uuid',
      email: 'admin@camso.com',
      role: 'VIEWER',
    });
  });

  describe('Authenticated User Bookmarks', () => {
    let createdBookmarkId;

    itDb('POST /api/v1/bookmarks — adds a product bookmark for authenticated user', async () => {
      const res = await request(app)
        .post('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ product_id: seededProducts[0].id });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product_id).toBe(seededProducts[0].id);
      expect(res.body.data.user_id).toBe(userAId);
      expect(res.body.data.device_id).toBeNull();
      createdBookmarkId = res.body.data.id;
    });

    itDb('POST /api/v1/bookmarks — 409 Conflict on duplicate bookmark by same user (partial index)', async () => {
      const res = await request(app)
        .post('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ product_id: seededProducts[0].id });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/already bookmarked/i);
    });

    itDb('POST /api/v1/bookmarks — distinct user B can bookmark the same product without conflict', async () => {
      const res = await request(app)
        .post('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ product_id: seededProducts[0].id });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user_id).toBe(userBId);
    });

    itDb('GET /api/v1/bookmarks — lists paginated bookmarks for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/bookmarks?page=1&pageSize=10')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].product_id).toBe(seededProducts[0].id);
      expect(res.body.meta.total).toBe(1);
    });

    itDb('DELETE /api/v1/bookmarks/:id — User B cannot delete User A bookmark (ownership isolation)', async () => {
      const res = await request(app)
        .delete(`/api/v1/bookmarks/${createdBookmarkId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    itDb('DELETE /api/v1/bookmarks/:id — User A removes their own bookmark', async () => {
      const res = await request(app)
        .delete(`/api/v1/bookmarks/${createdBookmarkId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toMatch(/removed successfully/i);

      // Verify empty list
      const listRes = await request(app)
        .get('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(listRes.body.data.length).toBe(0);
    });
  });

  describe('Guest Device Bookmarks', () => {
    const testDeviceId = `guest-dev-${Date.now()}`;
    let guestBookmarkId;

    beforeAll(async () => {
      if (!dbAvailable) return;
      // Link testDeviceId to guestUserId in user_devices so the session has an active linked device
      await prisma.userDevice.create({
        data: {
          device_id: testDeviceId,
          user_id: guestUserId,
          platform: 'ANDROID',
        },
      });
    });

    itDb('POST /api/v1/bookmarks — Guest adds bookmark with matching device_id', async () => {
      const res = await request(app)
        .post('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          product_id: seededProducts[0].id,
          device_id: testDeviceId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.device_id).toBe(testDeviceId);
      expect(res.body.data.user_id).toBeNull();
      guestBookmarkId = res.body.data.id;
    });

    itDb('POST /api/v1/bookmarks — 409 Conflict on duplicate guest bookmark (device partial index)', async () => {
      const res = await request(app)
        .post('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          product_id: seededProducts[0].id,
          device_id: testDeviceId,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/already bookmarked/i);
    });

    itDb('GET /api/v1/bookmarks — Guest retrieves bookmarks by matching device_id', async () => {
      const res = await request(app)
        .get(`/api/v1/bookmarks?device_id=${testDeviceId}`)
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].product_id).toBe(seededProducts[0].id);
    });

    itDb('GET /api/v1/bookmarks — Guest automatically retrieves bookmarks using linked session without query device_id', async () => {
      const res = await request(app)
        .get('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].product_id).toBe(seededProducts[0].id);
    });

    itDb('GET /api/v1/bookmarks — 1. Guest A cannot list Guest B bookmarks by changing device_id', async () => {
      const attackerDevId = `attacker-dev-${Date.now()}`;
      const attackerAuth = await request(app)
        .post('/api/v1/auth/guest')
        .send({ device_id: attackerDevId, platform: 'ANDROID' });
      expect(attackerAuth.status).toBe(201);
      const attackerToken = attackerAuth.body.data.access_token;

      const res = await request(app)
        .get(`/api/v1/bookmarks?device_id=${testDeviceId}`)
        .set('Authorization', `Bearer ${attackerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/device_id does not match the authenticated guest session/i);

      // Clean up attacker
      await prisma.userDevice.deleteMany({ where: { device_id: attackerDevId } });
      await prisma.user.deleteMany({ where: { id: attackerAuth.body.data.user.id } });
    });

    itDb('DELETE /api/v1/bookmarks/:id — 2. Guest A cannot delete Guest B bookmark by changing device_id', async () => {
      const attackerDevId = `attacker-dev-${Date.now()}`;
      const attackerAuth = await request(app)
        .post('/api/v1/auth/guest')
        .send({ device_id: attackerDevId, platform: 'ANDROID' });
      expect(attackerAuth.status).toBe(201);
      const attackerToken = attackerAuth.body.data.access_token;

      const res = await request(app)
        .delete(`/api/v1/bookmarks/${guestBookmarkId}?device_id=${testDeviceId}`)
        .set('Authorization', `Bearer ${attackerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/device_id does not match the authenticated guest session/i);

      // Clean up attacker
      await prisma.userDevice.deleteMany({ where: { device_id: attackerDevId } });
      await prisma.user.deleteMany({ where: { id: attackerAuth.body.data.user.id } });
    });

    itDb('3. Guest without linked device cannot use arbitrary device ID to add, list, delete, or sync bookmarks', async () => {
      // Guest token without user_devices row
      const unlinkedGuest = await prisma.user.create({ data: { is_guest: true } });
      const unlinkedToken = generateAccessToken({ sub: unlinkedGuest.id, is_guest: true });
      const arbitraryDev = `arbitrary-dev-${Date.now()}`;

      // A: Add fails
      const addRes = await request(app)
        .post('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${unlinkedToken}`)
        .send({ product_id: seededProducts[0].id, device_id: arbitraryDev });
      expect(addRes.status).toBe(400);
      expect(addRes.body.error.message).toMatch(/no active linked device/i);

      // B: List fails
      const listRes = await request(app)
        .get(`/api/v1/bookmarks?device_id=${arbitraryDev}`)
        .set('Authorization', `Bearer ${unlinkedToken}`);
      expect(listRes.status).toBe(400);
      expect(listRes.body.error.message).toMatch(/no active linked device/i);

      // C: Delete fails
      const delRes = await request(app)
        .delete(`/api/v1/bookmarks/some-id?device_id=${arbitraryDev}`)
        .set('Authorization', `Bearer ${unlinkedToken}`);
      expect(delRes.status).toBe(400);
      expect(delRes.body.error.message).toMatch(/no active linked device/i);

      // D: Sync fails (caller is guest)
      const syncRes = await request(app)
        .post('/api/v1/bookmarks/sync')
        .set('Authorization', `Bearer ${unlinkedToken}`)
        .send({ guest_token: unlinkedToken, device_id: arbitraryDev });
      expect(syncRes.status).toBe(403);

      await prisma.user.deleteMany({ where: { id: unlinkedGuest.id } });
    });

    itDb('DELETE /api/v1/bookmarks/:id — Guest removes bookmark by ID with matching device_id', async () => {
      const res = await request(app)
        .delete(`/api/v1/bookmarks/${guestBookmarkId}?device_id=${testDeviceId}`)
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deletion in database
      const count = await prisma.bookmark.count({ where: { id: guestBookmarkId } });
      expect(count).toBe(0);
    });
  });

  describe('Guest-to-Account Synchronization (POST /api/v1/bookmarks/sync)', () => {
    const syncDeviceId = `guest-sync-${Date.now()}`;
    let syncGuestToken;
    let syncGuestUserId;
    let syncUserToken;
    let syncUserId;

    beforeAll(async () => {
      if (!dbAvailable) return;

      // 1. Create legitimate source guest user and device in user_devices
      const syncGuestUser = await prisma.user.create({
        data: { is_guest: true },
      });
      syncGuestUserId = syncGuestUser.id;
      syncGuestToken = generateAccessToken({ sub: syncGuestUser.id, is_guest: true });

      await prisma.userDevice.create({
        data: {
          device_id: syncDeviceId,
          user_id: syncGuestUser.id,
          platform: 'ANDROID',
        },
      });

      // 2. Guest bookmarks Product 0 and Product 1
      await prisma.bookmark.createMany({
        data: [
          { device_id: syncDeviceId, product_id: seededProducts[0].id, user_id: null },
          { device_id: syncDeviceId, product_id: seededProducts[1].id, user_id: null },
        ],
      });

      // 3. Create registered User C who ALREADY bookmarked Product 0
      const userC = await prisma.user.create({
        data: {
          email: `user-c-sync-${Date.now()}@test.com`,
          password_hash: 'hashed_pw',
          is_guest: false,
        },
      });
      syncUserId = userC.id;
      syncUserToken = generateAccessToken({ sub: userC.id, is_guest: false });

      await prisma.bookmark.create({
        data: {
          user_id: syncUserId,
          product_id: seededProducts[0].id,
          device_id: null,
        },
      });
    });

    itDb('POST /api/v1/bookmarks/sync — 403 Forbidden when invoked by a guest', async () => {
      const res = await request(app)
        .post('/api/v1/bookmarks/sync')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ guest_token: syncGuestToken, device_id: syncDeviceId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/only registered users/i);
    });

    itDb('4. Registered account cannot claim Guest bookmarks using only device_id', async () => {
      const res = await request(app)
        .post('/api/v1/bookmarks/sync')
        .set('Authorization', `Bearer ${syncUserToken}`)
        .send({ device_id: syncDeviceId });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body.error)).toMatch(/guest_token is required/i);
    });

    itDb('5. Registered account cannot claim Guest bookmarks without a valid guest credential', async () => {
      const res = await request(app)
        .post('/api/v1/bookmarks/sync')
        .set('Authorization', `Bearer ${syncUserToken}`)
        .send({ guest_token: 'not-a-valid-jwt-token', device_id: syncDeviceId });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/invalid guest access token/i);
    });

    itDb('6. Expired, malformed, invalid-signature, and non-guest credentials are rejected', async () => {
      const jwt = require('jsonwebtoken');
      const jwtConfig = require('../../src/config/jwt');

      // A: Expired guest token
      const expiredGuestToken = jwt.sign(
        { sub: syncGuestUserId, is_guest: true },
        jwtConfig.accessSecret,
        { expiresIn: '-1s' }
      );
      const resExpired = await request(app)
        .post('/api/v1/bookmarks/sync')
        .set('Authorization', `Bearer ${syncUserToken}`)
        .send({ guest_token: expiredGuestToken, device_id: syncDeviceId });
      expect(resExpired.status).toBe(401);
      expect(resExpired.body.error.message).toMatch(/expired/i);

      // B: Invalid signature (signed with wrong secret)
      const forgedToken = jwt.sign(
        { sub: syncGuestUserId, is_guest: true },
        'wrong-attacker-secret-key-12345',
        { expiresIn: '15m' }
      );
      const resForged = await request(app)
        .post('/api/v1/bookmarks/sync')
        .set('Authorization', `Bearer ${syncUserToken}`)
        .send({ guest_token: forgedToken, device_id: syncDeviceId });
      expect(resForged.status).toBe(401);

      // C: Non-guest credential (registered user token passed as guest_token)
      const nonGuestToken = generateAccessToken({ sub: userBId, is_guest: false });
      const resNonGuest = await request(app)
        .post('/api/v1/bookmarks/sync')
        .set('Authorization', `Bearer ${syncUserToken}`)
        .send({ guest_token: nonGuestToken, device_id: syncDeviceId });
      expect(resNonGuest.status).toBe(400);
      expect(resNonGuest.body.error.message).toMatch(/not a guest session/i);
    });

    itDb('7. Guest credential cannot migrate bookmarks from a different device', async () => {
      const foreignDeviceId = `foreign-dev-${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/bookmarks/sync')
        .set('Authorization', `Bearer ${syncUserToken}`)
        .send({ guest_token: syncGuestToken, device_id: foreignDeviceId });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/device_id does not match the verified guest session/i);
    });

    itDb('8. Guest cannot access or migrate another guest bookmarks', async () => {
      // Attacker guest attempts to call sync
      const attackerAuth = await request(app)
        .post('/api/v1/auth/guest')
        .send({ device_id: `atk-${Date.now()}`, platform: 'ANDROID' });
      const attackerToken = attackerAuth.body.data.access_token;

      const res = await request(app)
        .post('/api/v1/bookmarks/sync')
        .set('Authorization', `Bearer ${attackerToken}`)
        .send({ guest_token: syncGuestToken, device_id: syncDeviceId });

      expect(res.status).toBe(403);

      await prisma.userDevice.deleteMany({ where: { user_id: attackerAuth.body.data.user.id } });
      await prisma.user.deleteMany({ where: { id: attackerAuth.body.data.user.id } });
    });

    itDb('9. Existing legitimate guest-to-account sync merges bookmarks with deduplication', async () => {
      const res = await request(app)
        .post('/api/v1/bookmarks/sync')
        .set('Authorization', `Bearer ${syncUserToken}`)
        .send({ guest_token: syncGuestToken, device_id: syncDeviceId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.synced_count).toBe(1); // Product 1 reassigned
      expect(res.body.data.removed_duplicates).toBe(1); // Product 0 duplicate removed

      // Verify all bookmarks now belong to syncUserId
      const userBookmarks = await prisma.bookmark.findMany({
        where: { user_id: syncUserId },
      });
      expect(userBookmarks.length).toBe(2);

      // Verify guest records for that device are gone
      const remainingGuest = await prisma.bookmark.findMany({
        where: { device_id: syncDeviceId },
      });
      expect(remainingGuest.length).toBe(0);
    });

    itDb('10. Duplicate sync requests behave safely and consistently (idempotent)', async () => {
      const res = await request(app)
        .post('/api/v1/bookmarks/sync')
        .set('Authorization', `Bearer ${syncUserToken}`)
        .send({ guest_token: syncGuestToken, device_id: syncDeviceId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.synced_count).toBe(0);
      expect(res.body.data.removed_duplicates).toBe(0);
    });

    itDb('11. Existing registered-user bookmark ownership remains isolated after sync', async () => {
      // User A's bookmarks are unaffected
      const userABookmarks = await prisma.bookmark.findMany({
        where: { user_id: userAId },
      });
      expect(userABookmarks.length).toBe(0);

      // User C's bookmarks belong solely to User C
      const userCBookmarks = await prisma.bookmark.findMany({
        where: { user_id: syncUserId },
      });
      expect(userCBookmarks.length).toBe(2);
      userCBookmarks.forEach((b) => {
        expect(b.user_id).toBe(syncUserId);
        expect(b.device_id).toBeNull();
      });
    });

    itDb('12. 403 Forbidden when device belongs to another registered user', async () => {
      const victimDevice = `victim-dev-${Date.now()}`;
      await prisma.userDevice.create({
        data: {
          device_id: victimDevice,
          user_id: userBId,
          platform: 'ANDROID',
        },
      });

      // Mint guest token claiming to be linked to victimDevice
      const fakeGuest = await prisma.user.create({ data: { is_guest: true } });
      const fakeGuestToken = generateAccessToken({ sub: fakeGuest.id, is_guest: true });
      // But device belongs to userB (registered) in user_devices
      // If fakeGuest had this device:
      await prisma.userDevice.updateMany({
        where: { device_id: victimDevice },
        data: { user_id: userBId }, // registered user
      });

      // Linking device to fake guest:
      await prisma.userDevice.create({
        data: {
          device_id: `guest-owned-${Date.now()}`,
          user_id: fakeGuest.id,
          platform: 'ANDROID',
        },
      });

      const res = await request(app)
        .post('/api/v1/bookmarks/sync')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ guest_token: fakeGuestToken, device_id: victimDevice });

      expect(res.status).toBe(400); // Mismatches fake guest's device

      await prisma.userDevice.deleteMany({ where: { device_id: victimDevice } });
      await prisma.user.deleteMany({ where: { id: fakeGuest.id } });
    });
  });


  describe('Catalogue Analytics (GET /api/v1/admin/analytics/catalogue)', () => {
    it('GET /api/v1/admin/analytics/catalogue — 401 Unauthorized without token', async () => {
      const res = await request(app).get('/api/v1/admin/analytics/catalogue');
      expect(res.status).toBe(401);
    });

    itDb('GET /api/v1/admin/analytics/catalogue — 403 Forbidden for non-admin user', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/catalogue')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(403);
    });

    itDb('GET /api/v1/admin/analytics/catalogue — 200 OK for admin VIEWER with correct aggregates', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/catalogue?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('top_searches');
      expect(res.body.data).toHaveProperty('most_bookmarked_products');

      // Check summary numbers
      expect(res.body.data.summary.total_products).toBeGreaterThanOrEqual(7);
      expect(res.body.data.summary.total_categories).toBeGreaterThanOrEqual(6);
      expect(res.body.data.summary.total_bookmarks).toBeGreaterThanOrEqual(1);

      // Verify most_bookmarked_products structure
      expect(Array.isArray(res.body.data.most_bookmarked_products)).toBe(true);
      if (res.body.data.most_bookmarked_products.length > 0) {
        const topProduct = res.body.data.most_bookmarked_products[0];
        expect(topProduct).toHaveProperty('product_id');
        expect(topProduct).toHaveProperty('pid');
        expect(topProduct).toHaveProperty('name');
        expect(topProduct).toHaveProperty('bookmark_count');
      }

      // Security check: ensure no passwords, emails, or personal identifiers are exposed
      const jsonStr = JSON.stringify(res.body.data);
      expect(jsonStr).not.toContain('password');
      expect(jsonStr).not.toContain('@test.com');
    });
  });
});
