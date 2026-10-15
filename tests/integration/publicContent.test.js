'use strict';

/**
 * tests/integration/publicContent.test.js
 *
 * WHAT THIS FILE DOES:
 *   Integration test suite for public content read endpoints:
 *   - GET /api/v1/documents
 *   - GET /api/v1/documents/:id
 *   - GET /api/v1/testimonials
 *   - GET /api/v1/faqs
 *   - Health & route auto-mounting verification
 *
 * OVERALL DESIGN:
 *   Uses supertest against the Express app instance returned by createApp().
 *   Validates sorting (default, ascending, descending, prefix minus, colon, invalid fallback),
 *   parameter alias normalization (?product=, ?category=, ?type=),
 *   unpublished exclusion, pagination envelopes, localized document file resolution,
 *   and 404 / 422 error cases.
 *
 * FINAL OUTPUT:
 *   Jest integration test suite execution output.
 */

const request = require('supertest');
const { createApp } = require('../../src/app');
const app = createApp();
const documentsRepository = require('../../src/modules/documents/documents.repository');
const testimonialsRepository = require('../../src/modules/testimonials/testimonials.repository');
const faqsRepository = require('../../src/modules/faqs/faqs.repository');
const translationRepository = require('../../src/core/repositories/translation.repository');

jest.mock('../../src/modules/documents/documents.repository');
jest.mock('../../src/modules/testimonials/testimonials.repository');
jest.mock('../../src/modules/faqs/faqs.repository');
jest.mock('../../src/core/repositories/translation.repository');

describe('Public Content Read APIs Comprehensive Test Suite', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── ROUTING & INFRASTRUCTURE ──────────────────────────────────────────────

  describe('Route Auto-Mounting & Infrastructure', () => {
    test('health endpoint remains functional', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ok');
    });

    test('readiness endpoint remains functional', async () => {
      const res = await request(app).get('/api/v1/ready');
      expect([200, 503]).toContain(res.status);
    }, 10000);
  });

  // ─── DOCUMENTS ────────────────────────────────────────────────────────────

  describe('GET /api/v1/documents', () => {
    test('returns 200 with default created_at:desc sorting', async () => {
      documentsRepository.findPublishedDocuments.mockResolvedValue([0, []]);

      const res = await request(app).get('/api/v1/documents');

      expect(res.status).toBe(200);
      expect(documentsRepository.findPublishedDocuments).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ page: 1, pageSize: 20, sort: 'created_at:desc' }),
      );
    });

    test('supports prefix minus sorting notation (sort=-created_at)', async () => {
      documentsRepository.findPublishedDocuments.mockResolvedValue([0, []]);

      const res = await request(app).get('/api/v1/documents?sort=-created_at');

      expect(res.status).toBe(200);
      expect(documentsRepository.findPublishedDocuments).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ sort: '-created_at' }),
      );
    });

    test('supports ascending sorting notation (sort=created_at:asc)', async () => {
      documentsRepository.findPublishedDocuments.mockResolvedValue([0, []]);

      const res = await request(app).get('/api/v1/documents?sort=created_at:asc');

      expect(res.status).toBe(200);
      expect(documentsRepository.findPublishedDocuments).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ sort: 'created_at:asc' }),
      );
    });

    test('handles parameter aliases (?product=, ?category=, ?type=)', async () => {
      documentsRepository.findPublishedDocuments.mockResolvedValue([0, []]);

      const res = await request(app).get('/api/v1/documents?product=cuid_product_0000000010&category=cuid_category_000000005&type=BROCHURE');

      expect(res.status).toBe(200);
      expect(documentsRepository.findPublishedDocuments).toHaveBeenCalledWith(
        { product_id: 'cuid_product_0000000010', category_id: 'cuid_category_000000005', document_type: 'BROCHURE' },
        expect.anything(),
      );
    });

    test('returns 422 for invalid document type parameter', async () => {
      const res = await request(app).get('/api/v1/documents?type=INVALID_TYPE');
      expect(res.status).toBe(422);
      expect(res.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/documents/:id', () => {
    test('resolves document_files for requested language when present', async () => {
      const mockDoc = {
        id: 'cuid_document_0000000001',
        product_id: 'cuid_product_0000000010',
        category_id: 'cuid_category_000000002',
        document_type: 'CATALOGUE',
        created_at: new Date(),
        updated_at: new Date(),
        files: [
          { id: 'cuid_docfile_0000000001', language_code: 'en', is_offline_downloadable: true, media_asset: { id: 'cuid_media_0000000005', url: 'en.pdf' } },
          { id: 'cuid_docfile_0000000002', language_code: 'fr', is_offline_downloadable: true, media_asset: { id: 'cuid_media_0000000006', url: 'fr.pdf' } },
        ],
      };
      documentsRepository.findPublishedDocumentById.mockResolvedValue(mockDoc);
      translationRepository.findByEntity.mockResolvedValue([
        { field: 'title', language_code: 'fr', value: 'Titre en Français' },
      ]);

      const res = await request(app).get('/api/v1/documents/cuid_document_0000000001?lang=fr');

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Titre en Français');
      expect(res.body.data.files).toHaveLength(1);
      expect(res.body.data.files[0].language_code).toBe('fr');
    });

    test('returns empty files array when requested language document file is unavailable', async () => {
      const mockDoc = {
        id: 'cuid_document_0000000001',
        product_id: 'cuid_product_0000000010',
        category_id: 'cuid_category_000000002',
        document_type: 'CATALOGUE',
        created_at: new Date(),
        updated_at: new Date(),
        files: [
          { id: 'cuid_docfile_0000000001', language_code: 'en', is_offline_downloadable: true, media_asset: { id: 'cuid_media_0000000005', url: 'en.pdf' } },
        ],
      };
      documentsRepository.findPublishedDocumentById.mockResolvedValue(mockDoc);
      translationRepository.findByEntity.mockResolvedValue([]);

      const res = await request(app).get('/api/v1/documents/cuid_document_0000000001?lang=de');

      expect(res.status).toBe(200);
      expect(res.body.data.files).toEqual([]);
    });

    test('filters out non-matching language files when multiple language files exist', async () => {
      const mockDoc = {
        id: 'cuid_document_0000000001',
        product_id: 'cuid_product_0000000010',
        category_id: 'cuid_category_000000002',
        document_type: 'MANUAL',
        created_at: new Date(),
        updated_at: new Date(),
        files: [
          { id: 'cuid_docfile_0000000001', language_code: 'en', is_offline_downloadable: true, media_asset: { id: 'cuid_media_0000000005', url: 'en.pdf' } },
          { id: 'cuid_docfile_0000000002', language_code: 'es', is_offline_downloadable: true, media_asset: { id: 'cuid_media_0000000006', url: 'es.pdf' } },
          { id: 'cuid_docfile_0000000003', language_code: 'ja', is_offline_downloadable: true, media_asset: { id: 'cuid_media_0000000007', url: 'ja.pdf' } },
        ],
      };
      documentsRepository.findPublishedDocumentById.mockResolvedValue(mockDoc);
      translationRepository.findByEntity.mockResolvedValue([]);

      const res = await request(app).get('/api/v1/documents/cuid_document_0000000001?lang=es');

      expect(res.status).toBe(200);
      expect(res.body.data.files).toHaveLength(1);
      expect(res.body.data.files[0].language_code).toBe('es');
      expect(res.body.data.files[0].media_asset.url).toBe('es.pdf');
    });

    test('returns 404 NOT_FOUND for unpublished document', async () => {
      documentsRepository.findPublishedDocumentById.mockResolvedValue(null);

      const res = await request(app).get('/api/v1/documents/cuid_document_0000000099');
      expect(res.status).toBe(404);
      expect(res.body.error.type).toBe('NOT_FOUND');
    });

    test('GET /api/v1/documents/:id/download returns download payload and increments count', async () => {
      const mockDoc = {
        id: 'cuid_document_0000000001',
        document_type: 'MANUAL',
        download_count: 5,
        files: [
          { language_code: 'en', media_asset: { id: 'm1', url: 'https://storage.googleapis.com/test/doc.pdf', file_name: 'doc.pdf', mime_type: 'application/pdf', file_size_bytes: 1024 } },
        ],
      };
      documentsRepository.findPublishedDocumentById.mockResolvedValue(mockDoc);
      documentsRepository.incrementDownloadCount.mockResolvedValue({ ...mockDoc, download_count: 6 });

      const res = await request(app).get('/api/v1/documents/cuid_document_0000000001/download?lang=en');
      expect(res.status).toBe(200);
      expect(res.body.data.download_url).toBe('https://storage.googleapis.com/test/doc.pdf');
      expect(res.body.data.download_count).toBe(6);
      expect(documentsRepository.incrementDownloadCount).toHaveBeenCalledWith('cuid_document_0000000001');
    });

    test('GET /api/v1/documents/:id/download returns 404 for missing document', async () => {
      documentsRepository.findPublishedDocumentById.mockResolvedValue(null);

      const res = await request(app).get('/api/v1/documents/cuid_document_0000000099/download');
      expect(res.status).toBe(404);
      expect(res.body.error.type).toBe('NOT_FOUND');
    });

    test('GET /api/v1/documents/:id/download rejects unauthenticated user for restricted technical guide with 401', async () => {
      const mockRestrictedDoc = {
        id: 'cuid_doc_tech_01',
        document_type: 'TECHNICAL_GUIDE',
        files: [{ language_code: 'en', media_asset: { id: 'm2', url: 'https://storage.googleapis.com/test/tech.pdf' } }],
      };
      documentsRepository.findPublishedDocumentById.mockResolvedValue(mockRestrictedDoc);

      const res = await request(app).get('/api/v1/documents/cuid_doc_tech_01/download');
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/Authentication required/);
    });

    test('GET /api/v1/documents/:id/download rejects guest user for restricted document with 403', async () => {
      const mockRestrictedDoc = {
        id: 'cuid_doc_tech_01',
        document_type: 'TECHNICAL_GUIDE',
        files: [{ language_code: 'en', media_asset: { id: 'm2', url: 'https://storage.googleapis.com/test/tech.pdf' } }],
      };
      documentsRepository.findPublishedDocumentById.mockResolvedValue(mockRestrictedDoc);

      const { generateAccessToken } = require('../../src/core/utils/tokenService');
      const guestToken = generateAccessToken({ sub: 'guest_123', is_guest: true, role: 'GUEST' });

      const res = await request(app)
        .get('/api/v1/documents/cuid_doc_tech_01/download')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Guest users are not authorized/);
    });

    test('GET /api/v1/documents/:id/download rejects customer for technical guide with 403', async () => {
      const mockRestrictedDoc = {
        id: 'cuid_doc_tech_01',
        document_type: 'TECHNICAL_GUIDE',
        files: [{ language_code: 'en', media_asset: { id: 'm2', url: 'https://storage.googleapis.com/test/tech.pdf' } }],
      };
      documentsRepository.findPublishedDocumentById.mockResolvedValue(mockRestrictedDoc);

      const { generateAccessToken } = require('../../src/core/utils/tokenService');
      const customerToken = generateAccessToken({ sub: 'cust_123', is_guest: false, role: 'END_USER' });

      const res = await request(app)
        .get('/api/v1/documents/cuid_doc_tech_01/download')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/not authorized to download technical documentation/);
    });

    test('GET /api/v1/documents/:id/download allows authorized dealer for technical guide with 200', async () => {
      const mockRestrictedDoc = {
        id: 'cuid_doc_tech_01',
        document_type: 'TECHNICAL_GUIDE',
        download_count: 10,
        files: [{ language_code: 'en', media_asset: { id: 'm2', url: 'https://storage.googleapis.com/test/tech.pdf', file_name: 'tech.pdf' } }],
      };
      documentsRepository.findPublishedDocumentById.mockResolvedValue(mockRestrictedDoc);
      documentsRepository.incrementDownloadCount.mockResolvedValue({ ...mockRestrictedDoc, download_count: 11 });

      const { generateBusinessAccessToken } = require('../../src/core/utils/tokenService');
      const dealerToken = generateBusinessAccessToken({ sub: 'dealer_123', email: 'dealer@test.com', role: 'DEALER', org_id: 'org_1' });

      const res = await request(app)
        .get('/api/v1/documents/cuid_doc_tech_01/download')
        .set('Authorization', `Bearer ${dealerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.download_url).toBe('https://storage.googleapis.com/test/tech.pdf');
    });

    test('GET /api/v1/documents/:id/download rejects cross-organization access with 403', async () => {
      const mockRestrictedDoc = {
        id: 'cuid_doc_tech_01',
        document_type: 'TECHNICAL_GUIDE',
        organization_id: 'org_assigned_to_doc',
        files: [{ language_code: 'en', media_asset: { id: 'm2', url: 'https://storage.googleapis.com/test/tech.pdf' } }],
      };
      documentsRepository.findPublishedDocumentById.mockResolvedValue(mockRestrictedDoc);

      const { generateBusinessAccessToken } = require('../../src/core/utils/tokenService');
      const otherOrgToken = generateBusinessAccessToken({ sub: 'dealer_123', email: 'dealer@test.com', role: 'DEALER', org_id: 'different_org' });

      const res = await request(app)
        .get('/api/v1/documents/cuid_doc_tech_01/download')
        .set('Authorization', `Bearer ${otherOrgToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Cross-organization document access is prohibited/);
    });

    test('GET /api/v1/documents/:id/download returns 404 when document has no file attached', async () => {
      const mockEmptyDoc = {
        id: 'cuid_doc_pub_empty',
        document_type: 'CATALOGUE',
        files: [],
      };
      documentsRepository.findPublishedDocumentById.mockResolvedValue(mockEmptyDoc);

      const res = await request(app).get('/api/v1/documents/cuid_doc_pub_empty/download');
      expect(res.status).toBe(404);
      expect(res.body.error.message).toMatch(/No downloadable file attached/);
    });
  });

  // ─── TESTIMONIALS ──────────────────────────────────────────────────────────

  describe('GET /api/v1/testimonials', () => {
    test('returns 200 with default created_at:desc sorting and handles query aliases (?product= & ?type=)', async () => {
      testimonialsRepository.findPublishedTestimonials.mockResolvedValue([0, []]);

      const res = await request(app).get('/api/v1/testimonials?product=cuid_product_0000000012&type=SOLIDS&sort=-created_at');

      expect(res.status).toBe(200);
      expect(testimonialsRepository.findPublishedTestimonials).toHaveBeenCalledWith(
        { product_id: 'cuid_product_0000000012', story_type: 'SOLIDS' },
        expect.objectContaining({ sort: '-created_at' }),
      );
    });

    test('returns 422 for invalid story_type parameter', async () => {
      const res = await request(app).get('/api/v1/testimonials?type=INVALID_TYPE');
      expect(res.status).toBe(422);
      expect(res.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  // ─── FAQS ──────────────────────────────────────────────────────────────────

  describe('GET /api/v1/faqs', () => {
    test('returns 200 with default sort_order:asc sorting and handles aliases (?product= & ?category=)', async () => {
      faqsRepository.findPublishedFaqs.mockResolvedValue([0, []]);

      const res = await request(app).get('/api/v1/faqs?category=COMPANY&product=cuid_product_0000000015');

      expect(res.status).toBe(200);
      expect(faqsRepository.findPublishedFaqs).toHaveBeenCalledWith(
        { category: 'COMPANY', product_id: 'cuid_product_0000000015' },
        expect.objectContaining({ sort: 'sort_order:asc' }),
      );
    });

    test('supports sorting by sort_order descending (sort=-sort_order)', async () => {
      faqsRepository.findPublishedFaqs.mockResolvedValue([0, []]);

      const res = await request(app).get('/api/v1/faqs?sort=-sort_order');

      expect(res.status).toBe(200);
      expect(faqsRepository.findPublishedFaqs).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ sort: '-sort_order' }),
      );
    });

    test('returns 422 for invalid category parameter', async () => {
      const res = await request(app).get('/api/v1/faqs?category=INVALID_CAT');
      expect(res.status).toBe(422);
      expect(res.body.error.type).toBe('VALIDATION_ERROR');
    });
  });
});
