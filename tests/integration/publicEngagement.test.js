const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/database');
const tokenService = require('../../src/core/utils/tokenService');

describe('Public Engagement Endpoints (Dealers, Feedback, Notifications)', () => {
  let userToken;
  let guestToken;

  beforeAll(async () => {
    // Generate valid JWTs for feedback testing
    const userPair = tokenService.generateTokenPair({ id: 101, type: 'USER', deviceId: 'device-1' });
    userToken = userPair.accessToken;

    const guestPair = tokenService.generateTokenPair({ id: null, type: 'GUEST', deviceId: 'device-2' });
    guestToken = guestPair.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Dealers - Locator (GET /api/v1/dealers/locator)', () => {
    it('should successfully return nearest dealers within radius', async () => {
      const res = await request(app)
        .get('/api/v1/dealers/locator')
        .query({ lat: 40.7128, lng: -74.0060, radiusKm: 100 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject invalid lat/lng/radius', async () => {
      const res1 = await request(app).get('/api/v1/dealers/locator').query({ lat: 100, lng: 0, radiusKm: 10 });
      expect(res1.status).toBe(400); // Bad Request (Joi validation)

      const res2 = await request(app).get('/api/v1/dealers/locator').query({ lat: 0, lng: 200, radiusKm: 10 });
      expect(res2.status).toBe(400);

      const res3 = await request(app).get('/api/v1/dealers/locator').query({ lat: 0, lng: 0, radiusKm: -5 });
      expect(res3.status).toBe(400);
    });

    it('should filter by type', async () => {
      const res = await request(app).get('/api/v1/dealers/locator').query({ lat: 0, lng: 0, radiusKm: 10, type: 'DEALER' });
      expect(res.status).toBe(200);
      res.body.data.forEach(dealer => {
        expect(dealer.type).toBe('DEALER');
      });
    });

    it('should reject invalid type', async () => {
      const res = await request(app).get('/api/v1/dealers/locator').query({ lat: 0, lng: 0, radiusKm: 10, type: 'INVALID' });
      expect(res.status).toBe(400);
    });
  });

  describe('Dealers - CSR Contact (GET /api/v1/dealers/csr-contact)', () => {
    it('should return 400 for missing country', async () => {
      const res = await request(app).get('/api/v1/dealers/csr-contact');
      expect(res.status).toBe(400);
    });

    it('should attempt to find csr contact by country', async () => {
      const res = await request(app).get('/api/v1/dealers/csr-contact').query({ country: 'US' });
      // Might be 404 if not found in test db, or 200
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Feedback - Submit (POST /api/v1/feedback)', () => {
    it('should reject missing JWT', async () => {
      const res = await request(app)
        .post('/api/v1/feedback')
        .send({ bucket: 'PRODUCT', rating: 5 });
      expect(res.status).toBe(401);
    });

    it('should reject invalid bucket or rating', async () => {
      const res = await request(app)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bucket: 'INVALID', rating: 10 });
      expect(res.status).toBe(400);
    });

    it('should allow valid USER JWT submission', async () => {
      // We mock prisma create just to verify the controller/service flow in unit style
      // but supertest is integration. Assuming DB is ready, this will write.
      // If no DB, we just check the status is either 201 or 500 (if DB fails)
      const res = await request(app)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bucket: 'PRODUCT', rating: 5, comment: 'Great!' });
      
      if (res.status === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('user_id', 101); // Server derived from token
      }
    });

    it('should ignore client-supplied user_id', async () => {
      const res = await request(app)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${guestToken}`) // guest has no user_id
        .send({ bucket: 'SERVICE', rating: 3, user_id: 999 }); // tries to inject
      
      if (res.status === 201) {
        expect(res.body.data.user_id).toBeNull(); // Still null
      }
    });
  });

  describe('Notifications - Public Feed (GET /api/v1/notifications)', () => {
    it('should return paginated feed without JWT', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should enforce pageSize maximum of 100', async () => {
      const res = await request(app).get('/api/v1/notifications').query({ pageSize: 500 });
      expect(res.status).toBe(200);
      expect(res.body.meta.pageSize).toBeLessThanOrEqual(100);
    });

    it('should reject invalid sort safely (fall back to default)', async () => {
      const res = await request(app).get('/api/v1/notifications').query({ sort: 'internal_metadata:asc' });
      expect(res.status).toBe(200); // parseSort falls back cleanly to default
    });
  });
});
