const request = require('supertest');
const { createApp } = require('../../src/app');
const app = createApp();
const { prisma } = require('../../src/config/database');
const tokenService = require('../../src/core/utils/tokenService');

describe('Admin CMS Integration Tests (Documents, Testimonials, FAQs)', () => {
  let superAdminToken;
  let contentAdminToken;
  let viewerToken;
  let marketingToken;
  let adminUserId = 1;

  beforeAll(async () => {
    // Generate valid JWTs for various admin roles
    const superPair = tokenService.generateTokenPair({ id: adminUserId, type: 'ADMIN', role: 'SUPER_ADMIN' });
    superAdminToken = superPair.accessToken;

    const contentPair = tokenService.generateTokenPair({ id: 2, type: 'ADMIN', role: 'CONTENT_ADMIN' });
    contentAdminToken = contentPair.accessToken;

    const viewerPair = tokenService.generateTokenPair({ id: 3, type: 'ADMIN', role: 'VIEWER' });
    viewerToken = viewerPair.accessToken;

    const marketingPair = tokenService.generateTokenPair({ id: 4, type: 'ADMIN', role: 'MARKETING' });
    marketingToken = marketingPair.accessToken;

    // Seed Language for translations
    await prisma.language.upsert({
      where: { code: 'en' },
      update: {},
      create: { code: 'en', name: 'English', is_active: true }
    });
    await prisma.language.upsert({
      where: { code: 'fr' },
      update: {},
      create: { code: 'fr', name: 'French', is_active: true }
    });
    
    // Seed AdminUsers
    await prisma.adminUser.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: { id: adminUserId, email: 'admin@example.com', password_hash: 'hash', role: 'SUPER_ADMIN' }
    });
    await prisma.adminUser.upsert({
      where: { email: 'content@example.com' },
      update: {},
      create: { id: 2, email: 'content@example.com', password_hash: 'hash', role: 'CONTENT_ADMIN' }
    });
    await prisma.adminUser.upsert({
      where: { email: 'viewer@example.com' },
      update: {},
      create: { id: 3, email: 'viewer@example.com', password_hash: 'hash', role: 'VIEWER' }
    });
    await prisma.adminUser.upsert({
      where: { email: 'marketing@example.com' },
      update: {},
      create: { id: 4, email: 'marketing@example.com', password_hash: 'hash', role: 'MARKETING' }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Documents Admin', () => {
    let createdDocId;

    it('CONTENT_ADMIN should create a document as draft', async () => {
      const res = await request(app)
        .post('/api/v1/admin/documents')
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({
          document_type: 'MANUAL',
          title: 'Admin Created Manual',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_published).toBe(false);
      createdDocId = res.body.data.id;
    });

    it('VIEWER should read documents', async () => {
      const res = await request(app)
        .get('/api/v1/admin/documents')
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('VIEWER cannot mutate documents', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/documents/${createdDocId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ is_published: true });
      
      expect(res.status).toBe(403);
    });

    it('MARKETING cannot mutate documents', async () => {
      const res = await request(app)
        .post('/api/v1/admin/documents')
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ document_type: 'BROCHURE', title: 'Marketing test' });
      
      expect(res.status).toBe(403);
    });

    it('SUPER_ADMIN can publish a document', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/documents/${createdDocId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ is_published: true });
      
      expect(res.status).toBe(200);
      expect(res.body.data.is_published).toBe(true);
    });

    it('Public endpoint should hide drafts but show published', async () => {
      // First, create a draft
      const resDraft = await request(app)
        .post('/api/v1/admin/documents')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ document_type: 'CATALOGUE', title: 'Draft Cat' });
      const draftId = resDraft.body.data.id;

      // Public list
      const resPublicList = await request(app).get('/api/v1/documents');
      expect(resPublicList.body.data.some(d => d.id === draftId)).toBe(false);
      expect(resPublicList.body.data.some(d => d.id === createdDocId)).toBe(true);
      
      // Public detail
      const resPublicDetail = await request(app).get(`/api/v1/documents/${draftId}`);
      expect(resPublicDetail.status).toBe(404);
    });
  });

  describe('Testimonials Admin', () => {
    let createdId;

    it('CONTENT_ADMIN should create a testimonial', async () => {
      const res = await request(app)
        .post('/api/v1/admin/testimonials')
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({
          customer_name: 'John Doe',
          region: 'NA',
          story_type: 'SOLIDS',
          content: 'Great product!',
          is_published: false
        });
      
      expect(res.status).toBe(201);
      expect(res.body.data.is_published).toBe(false);
      createdId = res.body.data.id;
    });

    it('SUPER_ADMIN should update and publish a testimonial', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/testimonials/${createdId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ is_published: true, customer_name: 'Jane Doe' });
      
      expect(res.status).toBe(200);
      expect(res.body.data.is_published).toBe(true);
      expect(res.body.data.customer_name).toBe('Jane Doe');
    });
  });

  describe('FAQs Admin', () => {
    let createdId;

    it('CONTENT_ADMIN should create a FAQ', async () => {
      const res = await request(app)
        .post('/api/v1/admin/faqs')
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({
          category: 'COMPANY',
          question: 'Who are we?',
          answer: 'We are Camso.',
          is_published: false
        });
      
      expect(res.status).toBe(201);
      createdId = res.body.data.id;
    });

    it('SUPER_ADMIN should read admin FAQs and see drafts', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/faqs/${createdId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.is_published).toBe(false);
    });

    it('SUPER_ADMIN should update and publish FAQ', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/faqs/${createdId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          is_published: true,
          translations: [{ language_code: 'fr', field: 'question', value: 'Qui sommes-nous?' }]
        });
      
      expect(res.status).toBe(200);
      expect(res.body.data.is_published).toBe(true);
    });
  });
});
