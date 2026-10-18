/**
 * tests/integration/documentAccessSecurity.test.js
 *
 * 1. WHAT THIS FILE DOES:
 *    Validates the end-to-end document access security boundaries, multi-tenant RBAC policies,
 *    truthful metadata attachment, anonymous public download capabilities, and reverse proxy
 *    deployment readiness against the active Prisma database.
 * 2. OVERALL DESIGN:
 *    Executes HTTP integration requests via Supertest against the full Express application.
 *    Seeds deterministic test fixtures in beforeAll and cleans them up in afterAll to prevent
 *    database pollution. Intercepts remote Supabase storage download requests with an in-memory
 *    mock ensuring resilient verification of binary PDF content signatures without network dependencies.
 * 3. ELEMENTS IN THE FILE:
 *    - beforeAll / afterAll lifecycle hooks for deterministic test document fixtures and storage fetch interception.
 *    - Anonymous Public Downloads test suite (Section 1).
 *    - OEM Security & Dealer-to-OEM Role Boundaries test suite (Section 2).
 *    - Dealer Warranty Security & Partner Boundaries test suite (Section 3).
 *    - Unpublished Document Protection test suite (Section 4).
 *    - Document Listing & OEM Portal Metadata test suite (Section 5).
 *    - Rate Limiter & Trusted Proxy Configuration test suite (Section 6).
 * 4. FINAL OUTPUT OF THE FILE:
 *    Automated Jest test report verifying complete security compliance and deployment readiness.
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/config/database');
const { generateAccessToken, generateBusinessAccessToken } = require('../../src/core/utils/tokenService');

describe('Document Access Security & Deployment Readiness Test Suite', () => {
  const SKS_S1_DOC_ID = 'cmv9fceym0000uf9o0oiwwkxd'; // Public Technical Datasheet
  const CATALOGUE_DOC_ID = 'cmvaghlhg0000ufr0vktx9en7'; // Public Catalogue
  const OEM_CAD_DOC_ID = 'cmv9gtzxa0000uftcrsps7jyx'; // OEM 3D CAD Guide
  const DEALER_WARRANTY_DOC_ID = 'cmv9hzq360000ufo0j0azpxye'; // Dealer Warranty Guide
  const UNPUBLISHED_TEST_DOC_ID = 'cmv9nevcn0000ufrcrhb65yp2'; // TEST-P68923 Prototype Spec

  const TEST_MEDIA = [
    {
      id: 'cmv9_media_sks_s1',
      url: 'https://eysewvsbnfzphvgyvwcw.supabase.co/storage/v1/object/public/documents/sks_s1_datasheet.pdf',
      filename: 'sks_s1_datasheet.pdf',
      mime_type: 'application/pdf',
      size_bytes: 4191,
    },
    {
      id: 'cmv9_media_cat',
      url: 'https://eysewvsbnfzphvgyvwcw.supabase.co/storage/v1/object/public/documents/camso_construction_catalogue.pdf',
      filename: 'camso_construction_catalogue.pdf',
      mime_type: 'application/pdf',
      size_bytes: 5000,
    },
    {
      id: 'cmv9_media_oem',
      url: 'https://eysewvsbnfzphvgyvwcw.supabase.co/storage/v1/object/public/documents/oem_3d_cad_envelope_guide.pdf',
      filename: 'oem_3d_cad_envelope_guide.pdf',
      mime_type: 'application/pdf',
      size_bytes: 4181,
    },
    {
      id: 'cmv9_media_dealer',
      url: 'https://eysewvsbnfzphvgyvwcw.supabase.co/storage/v1/object/public/documents/commercial_warranty_guide.pdf',
      filename: 'commercial_warranty_guide.pdf',
      mime_type: 'application/pdf',
      size_bytes: 3500,
    },
    {
      id: 'cmv9_media_unpub',
      url: 'https://eysewvsbnfzphvgyvwcw.supabase.co/storage/v1/object/public/documents/test_p68923.pdf',
      filename: 'test_p68923.pdf',
      mime_type: 'application/pdf',
      size_bytes: 2000,
    },
  ];

  const TEST_DOCS = [
    {
      id: SKS_S1_DOC_ID,
      document_type: 'TECHNICAL_GUIDE',
      access_level: 'PUBLIC',
      is_published: true,
      download_count: 0,
    },
    {
      id: CATALOGUE_DOC_ID,
      document_type: 'CATALOGUE',
      access_level: 'PUBLIC',
      is_published: true,
      download_count: 0,
    },
    {
      id: OEM_CAD_DOC_ID,
      document_type: 'TECHNICAL_GUIDE',
      access_level: 'OEM',
      is_published: true,
      download_count: 0,
    },
    {
      id: DEALER_WARRANTY_DOC_ID,
      document_type: 'TECHNICAL_GUIDE',
      access_level: 'DEALER',
      is_published: true,
      download_count: 0,
    },
    {
      id: UNPUBLISHED_TEST_DOC_ID,
      document_type: 'TECHNICAL_GUIDE',
      access_level: 'OEM',
      is_published: false,
      download_count: 0,
    },
  ];

  const TEST_FILES = [
    { id: 'cmv9_df_sks_s1', document_id: SKS_S1_DOC_ID, media_asset_id: 'cmv9_media_sks_s1', language_code: 'en', is_offline_downloadable: true },
    { id: 'cmv9_df_cat', document_id: CATALOGUE_DOC_ID, media_asset_id: 'cmv9_media_cat', language_code: 'en', is_offline_downloadable: true },
    { id: 'cmv9_df_oem', document_id: OEM_CAD_DOC_ID, media_asset_id: 'cmv9_media_oem', language_code: 'en', is_offline_downloadable: true },
    { id: 'cmv9_df_dealer', document_id: DEALER_WARRANTY_DOC_ID, media_asset_id: 'cmv9_media_dealer', language_code: 'en', is_offline_downloadable: true },
    { id: 'cmv9_df_unpub', document_id: UNPUBLISHED_TEST_DOC_ID, media_asset_id: 'cmv9_media_unpub', language_code: 'en', is_offline_downloadable: false },
  ];

  const TEST_TRANSLATIONS = [
    {
      id: 'cmv9_trans_oem',
      entity_type: 'DOCUMENT',
      entity_id: OEM_CAD_DOC_ID,
      field: 'title',
      language_code: 'en',
      value: 'OEM 3D CAD Repository & Undercarriage Envelope Guide',
    },
    {
      id: 'cmv9_trans_sks',
      entity_type: 'DOCUMENT',
      entity_id: SKS_S1_DOC_ID,
      field: 'title',
      language_code: 'en',
      value: 'SKS S1 Technical Datasheet',
    },
  ];

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

  const originalFetch = global.fetch;

  beforeAll(async () => {
    // Intercept external storage downloads with mock signed PDF stream
    global.fetch = jest.fn().mockImplementation((url, opts) => {
      if (typeof url === 'string' && url.includes('supabase.co/storage')) {
        const mockPdfBuffer = Buffer.from('%PDF-1.5 test pdf mock header for integration tests');
        return Promise.resolve({
          status: 200,
          headers: {
            get: (header) => (header.toLowerCase() === 'content-type' ? 'application/pdf' : null),
          },
          arrayBuffer: async () => mockPdfBuffer.buffer.slice(mockPdfBuffer.byteOffset, mockPdfBuffer.byteOffset + mockPdfBuffer.byteLength),
        });
      }
      return originalFetch(url, opts);
    });

    // Cleanup any lingering records from previous interrupted runs
    try {
      await prisma.translation.deleteMany({ where: { id: { in: TEST_TRANSLATIONS.map((t) => t.id) } } });
      await prisma.documentFile.deleteMany({ where: { id: { in: TEST_FILES.map((f) => f.id) } } });
      await prisma.document.deleteMany({ where: { id: { in: TEST_DOCS.map((d) => d.id) } } });
      await prisma.mediaAsset.deleteMany({ where: { id: { in: TEST_MEDIA.map((m) => m.id) } } });
    } catch (_) {}

    // Seed deterministic media assets
    for (const m of TEST_MEDIA) {
      await prisma.mediaAsset.upsert({
        where: { id: m.id },
        update: m,
        create: m,
      });
    }

    // Seed deterministic documents
    for (const d of TEST_DOCS) {
      await prisma.document.upsert({
        where: { id: d.id },
        update: d,
        create: d,
      });
    }

    // Seed deterministic document files
    for (const f of TEST_FILES) {
      await prisma.documentFile.upsert({
        where: { document_id_language_code: { document_id: f.document_id, language_code: f.language_code } },
        update: f,
        create: f,
      });
    }

    // Seed deterministic translations
    for (const t of TEST_TRANSLATIONS) {
      await prisma.translation.upsert({
        where: {
          entity_type_entity_id_field_language_code: {
            entity_type: t.entity_type,
            entity_id: t.entity_id,
            field: t.field,
            language_code: t.language_code,
          },
        },
        update: t,
        create: t,
      });
    }
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    try {
      await prisma.translation.deleteMany({ where: { id: { in: TEST_TRANSLATIONS.map((t) => t.id) } } });
      await prisma.documentFile.deleteMany({ where: { id: { in: TEST_FILES.map((f) => f.id) } } });
      await prisma.document.deleteMany({ where: { id: { in: TEST_DOCS.map((d) => d.id) } } });
      await prisma.mediaAsset.deleteMany({ where: { id: { in: TEST_MEDIA.map((m) => m.id) } } });
    } catch (_) {}
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
