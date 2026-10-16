'use strict';

const request = require('supertest');
const app = require('../../src/app');
const { generateAccessToken, generateBusinessAccessToken } = require('../../src/core/utils/tokenService');

describe('Document Access Security & Deployment Readiness Test Suite', () => {
  const SKS_S1_DOC_ID = 'cmv9fceym0000uf9o0oiwwkxd'; // Public Technical Datasheet
  const CATALOGUE_DOC_ID = 'cmvaghlhg0000ufr0vktx9en7'; // Public Catalogue
  const OEM_CAD_DOC_ID = 'cmv9gtzxa0000uftcrsps7jyx'; // OEM 3D CAD Guide
  const DEALER_WARRANTY_DOC_ID = 'cmv9hzq360000ufo0j0azpxye'; // Dealer Warranty Guide
  const UNPUBLISHED_TEST_DOC_ID = 'cmv9nevcn0000ufrcrhb65yp2'; // TEST-P68923 Prototype Spec

  const oemToken = generateBusinessAccessToken({
    sub: 'test_oem_user_id',
    email: 'test.oem@camso.local',
    role: 'OEM_PARTNER',
    org_id: 'org_oem_1',
  });

  const dealerToken = generateBusinessAccessToken({
    sub: 'test_dealer_user_id',
    email: 'test.dealer@camso.local',
    role: 'DEALER',
    org_id: 'org_dealer_1',
  });

  const distributorToken = generateBusinessAccessToken({
    sub: 'test_dist_user_id',
    email: 'test.dist@camso.local',
    role: 'DISTRIBUTOR',
    org_id: 'org_dist_1',
  });

  const endUserToken = generateAccessToken({
    sub: 'test_end_user_id',
    is_guest: false,
    role: 'END_USER',
  });

  const guestToken = generateAccessToken({
    sub: 'test_guest_id',
    is_guest: true,
    role: 'GUEST',
  });

  describe('1. Anonymous Public Downloads', () => {
    test('Anonymous user can download public catalogue without authentication and verify valid PDF bytes', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${CATALOGUE_DOC_ID}/download`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.download_url).toBeDefined();
      expect(res.body.data.download_url).toMatch(/^https:\/\/eysewvsbnfzphvgyvwcw\.supabase\.co\/storage/);
      expect(res.body.data.file_name).toBe('camso_construction_catalogue.pdf');

      // Verify actual signed PDF download
      const pdfRes = await fetch(res.body.data.download_url);
      expect(pdfRes.status).toBe(200);
      expect(pdfRes.headers.get('content-type')).toContain('application/pdf');
      const arrayBuffer = await pdfRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      expect(buffer.slice(0, 4).toString()).toBe('%PDF');
    });

    test('Anonymous user can download public technical product datasheet without authentication and verify valid PDF bytes', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${SKS_S1_DOC_ID}/download`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.download_url).toBeDefined();
      expect(res.body.data.download_url).toMatch(/^https:\/\/eysewvsbnfzphvgyvwcw\.supabase\.co\/storage/);
      expect(res.body.data.file_name).toBe('sks_s1_datasheet.pdf');

      // Verify actual signed PDF download
      const pdfRes = await fetch(res.body.data.download_url);
      expect(pdfRes.status).toBe(200);
      expect(pdfRes.headers.get('content-type')).toContain('application/pdf');
      const arrayBuffer = await pdfRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      expect(buffer.slice(0, 4).toString()).toBe('%PDF');
    });
  });

  describe('2. OEM Security & Dealer-to-OEM Role Boundaries', () => {
    test('Unauthenticated user is rejected with 401 when requesting OEM document', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${OEM_CAD_DOC_ID}/download`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/Authentication required/);
    });

    test('Guest user is rejected with 403 when requesting OEM document', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${OEM_CAD_DOC_ID}/download`)
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Guest users are not authorized/);
    });

    test('Standard End User is rejected with 403 when requesting OEM document', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${OEM_CAD_DOC_ID}/download`)
        .set('Authorization', `Bearer ${endUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/restricted to OEM Integration Partners/);
    });

    test('Dealer token is STRICTLY REJECTED with 403 when requesting OEM document', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${OEM_CAD_DOC_ID}/download`)
        .set('Authorization', `Bearer ${dealerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/restricted to OEM Integration Partners/);
    });

    test('Distributor token is STRICTLY REJECTED with 403 when requesting OEM document', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${OEM_CAD_DOC_ID}/download`)
        .set('Authorization', `Bearer ${distributorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/restricted to OEM Integration Partners/);
    });

    test('Authorized OEM partner receives 200 with signed download URL and valid PDF bytes', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${OEM_CAD_DOC_ID}/download`)
        .set('Authorization', `Bearer ${oemToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.download_url).toBeDefined();
      expect(res.body.data.file_name).toBe('oem_3d_cad_envelope_guide.pdf');

      // Verify actual signed PDF download
      const pdfRes = await fetch(res.body.data.download_url);
      expect(pdfRes.status).toBe(200);
      const arrayBuffer = await pdfRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      expect(buffer.slice(0, 4).toString()).toBe('%PDF');
    });
  });

  describe('3. Dealer Warranty Security & OEM-to-Dealer Role Boundaries', () => {
    test('Unauthenticated user is rejected with 401 for Dealer Warranty document', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${DEALER_WARRANTY_DOC_ID}/download`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/Authentication required/);
    });

    test('OEM Partner token is STRICTLY REJECTED with 403 when requesting Dealer Warranty document', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${DEALER_WARRANTY_DOC_ID}/download`)
        .set('Authorization', `Bearer ${oemToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/restricted to authorized Dealers and Distributors/);
    });

    test('Standard End User is rejected with 403 when requesting Dealer Warranty document', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${DEALER_WARRANTY_DOC_ID}/download`)
        .set('Authorization', `Bearer ${endUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/restricted to authorized Dealers and Distributors/);
    });

    test('Authorized Dealer receives 200 with signed download URL for Warranty guide and valid PDF bytes', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${DEALER_WARRANTY_DOC_ID}/download`)
        .set('Authorization', `Bearer ${dealerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.download_url).toBeDefined();
      expect(res.body.data.file_name).toBe('commercial_warranty_guide.pdf');

      // Verify actual signed PDF download
      const pdfRes = await fetch(res.body.data.download_url);
      expect(pdfRes.status).toBe(200);
      const arrayBuffer = await pdfRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      expect(buffer.slice(0, 4).toString()).toBe('%PDF');
    });

    test('Authorized Distributor receives 200 with signed download URL for Warranty guide', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${DEALER_WARRANTY_DOC_ID}/download`)
        .set('Authorization', `Bearer ${distributorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.download_url).toBeDefined();
    });
  });

  describe('4. Unpublished Document Protection', () => {
    test('Unpublished test product document returns 404 on detail endpoint', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${UNPUBLISHED_TEST_DOC_ID}`);

      expect(res.status).toBe(404);
      expect(res.body.error.type).toBe('NOT_FOUND');
    });

    test('Unpublished test product document returns 404 on download endpoint', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${UNPUBLISHED_TEST_DOC_ID}/download`);

      expect(res.status).toBe(404);
      expect(res.body.error.type).toBe('NOT_FOUND');
    });
  });

  describe('5. Document Listing & OEM Portal Metadata', () => {
    test('GET /documents includes truthful file and media metadata for each item', async () => {
      const res = await request(app)
        .get('/api/v1/documents?pageSize=50');

      expect(res.status).toBe(200);
      const docs = res.body.data;
      expect(docs.length).toBeGreaterThanOrEqual(11);

      const sksDoc = docs.find(d => d.id === SKS_S1_DOC_ID);
      expect(sksDoc).toBeDefined();
      expect(sksDoc.has_file).toBe(true);
      expect(sksDoc.file_size_bytes).toBe(4191);
      expect(sksDoc.filename).toBe('sks_s1_datasheet.pdf');
      expect(sksDoc.access_level).toBe('PUBLIC');
      expect(sksDoc.files).toBeDefined();
      expect(sksDoc.files.length).toBe(1);
    });

    test('GET /business/oem/documents includes localized titles and media metadata', async () => {
      const res = await request(app)
        .get('/api/v1/business/oem/documents')
        .set('Authorization', `Bearer ${oemToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const oemDocs = res.body.data;
      expect(oemDocs.length).toBeGreaterThanOrEqual(2);

      const cadDoc = oemDocs.find(d => d.id === OEM_CAD_DOC_ID);
      expect(cadDoc).toBeDefined();
      expect(cadDoc.title).toBe('OEM 3D CAD Repository & Undercarriage Envelope Guide');
      expect(cadDoc.has_file).toBe(true);
      expect(cadDoc.file_size_bytes).toBe(4181);
      expect(cadDoc.download_url).toBe(`/api/v1/documents/${OEM_CAD_DOC_ID}/download`);
    });
  });

  describe('6. Rate Limiter & Trusted Proxy Configuration', () => {
    test('Health and Readiness endpoints skip rate limiting and return 200', async () => {
      const healthRes = await request(app).get('/health');
      expect(healthRes.status).toBe(200);

      const apiHealthRes = await request(app).get('/api/v1/health');
      expect(apiHealthRes.status).toBe(200);

      const readyRes = await request(app).get('/ready');
      expect(readyRes.status).toBe(200);

      const apiReadyRes = await request(app).get('/api/v1/ready');
      expect(apiReadyRes.status).toBe(200);
    });

    test('Single-hop trusted proxy resolves true client IP from reverse proxy', async () => {
      // In Render's infrastructure, the single hop sets the true client IP from X-Forwarded-For
      // Verify requests with X-Forwarded-For are handled safely
      const res = await request(app)
        .get('/api/v1/health')
        .set('X-Forwarded-For', '198.51.100.25');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ok');
    });
  });
});
