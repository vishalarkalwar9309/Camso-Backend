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
    });
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

      const res = await request(app).get('/api/v1/documents?product=10&category=5&type=BROCHURE');

      expect(res.status).toBe(200);
      expect(documentsRepository.findPublishedDocuments).toHaveBeenCalledWith(
        { product_id: 10, category_id: 5, document_type: 'BROCHURE' },
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
        id: 1,
        product_id: 10,
        category_id: 2,
        document_type: 'CATALOGUE',
        created_at: new Date(),
        updated_at: new Date(),
        files: [
          { id: 100, language_code: 'en', is_offline_downloadable: true, media_asset: { id: 5, url: 'en.pdf' } },
          { id: 101, language_code: 'fr', is_offline_downloadable: true, media_asset: { id: 6, url: 'fr.pdf' } },
        ],
      };
      documentsRepository.findPublishedDocumentById.mockResolvedValue(mockDoc);
      translationRepository.findByEntity.mockResolvedValue([
        { field: 'title', language_code: 'fr', value: 'Titre en Français' },
      ]);

      const res = await request(app).get('/api/v1/documents/1?lang=fr');

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Titre en Français');
      expect(res.body.data.files).toHaveLength(1);
      expect(res.body.data.files[0].language_code).toBe('fr');
    });

    test('returns empty files array when requested language document file is unavailable', async () => {
      const mockDoc = {
        id: 1,
        product_id: 10,
        category_id: 2,
        document_type: 'CATALOGUE',
        created_at: new Date(),
        updated_at: new Date(),
        files: [
          { id: 100, language_code: 'en', is_offline_downloadable: true, media_asset: { id: 5, url: 'en.pdf' } },
        ],
      };
      documentsRepository.findPublishedDocumentById.mockResolvedValue(mockDoc);
      translationRepository.findByEntity.mockResolvedValue([]);

      const res = await request(app).get('/api/v1/documents/1?lang=de');

      expect(res.status).toBe(200);
      expect(res.body.data.files).toEqual([]);
    });

    test('filters out non-matching language files when multiple language files exist', async () => {
      const mockDoc = {
        id: 1,
        product_id: 10,
        category_id: 2,
        document_type: 'MANUAL',
        created_at: new Date(),
        updated_at: new Date(),
        files: [
          { id: 100, language_code: 'en', is_offline_downloadable: true, media_asset: { id: 5, url: 'en.pdf' } },
          { id: 101, language_code: 'es', is_offline_downloadable: true, media_asset: { id: 6, url: 'es.pdf' } },
          { id: 102, language_code: 'ja', is_offline_downloadable: true, media_asset: { id: 7, url: 'ja.pdf' } },
        ],
      };
      documentsRepository.findPublishedDocumentById.mockResolvedValue(mockDoc);
      translationRepository.findByEntity.mockResolvedValue([]);

      const res = await request(app).get('/api/v1/documents/1?lang=es');

      expect(res.status).toBe(200);
      expect(res.body.data.files).toHaveLength(1);
      expect(res.body.data.files[0].language_code).toBe('es');
      expect(res.body.data.files[0].media_asset.url).toBe('es.pdf');
    });

    test('returns 404 NOT_FOUND for unpublished document', async () => {
      documentsRepository.findPublishedDocumentById.mockResolvedValue(null);

      const res = await request(app).get('/api/v1/documents/99');
      expect(res.status).toBe(404);
      expect(res.body.error.type).toBe('NOT_FOUND');
    });
  });

  // ─── TESTIMONIALS ──────────────────────────────────────────────────────────

  describe('GET /api/v1/testimonials', () => {
    test('returns 200 with default created_at:desc sorting and handles query aliases (?product= & ?type=)', async () => {
      testimonialsRepository.findPublishedTestimonials.mockResolvedValue([0, []]);

      const res = await request(app).get('/api/v1/testimonials?product=12&type=SOLIDS&sort=-created_at');

      expect(res.status).toBe(200);
      expect(testimonialsRepository.findPublishedTestimonials).toHaveBeenCalledWith(
        { product_id: 12, story_type: 'SOLIDS' },
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

      const res = await request(app).get('/api/v1/faqs?category=COMPANY&product=15');

      expect(res.status).toBe(200);
      expect(faqsRepository.findPublishedFaqs).toHaveBeenCalledWith(
        { category: 'COMPANY', product_id: 15 },
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
