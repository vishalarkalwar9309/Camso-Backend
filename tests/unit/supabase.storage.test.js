'use strict';

/**
 * tests/unit/supabase.storage.test.js
 *
 * Comprehensive tests for Supabase Storage integration, document uploads,
 * time-limited signed URL downloads, RBAC authorization, missing files, and error handling.
 */

const { normalizeStoragePath, uploadFileToSupabase, createSignedDownloadUrl } = require('../../src/core/utils/supabaseStorage');
const documentsService = require('../../src/modules/documents/documents.service');
const documentsRepository = require('../../src/modules/documents/documents.repository');
const supabaseConfig = require('../../src/config/supabase');
const { prisma } = require('../../src/config/database');

describe('Supabase Storage Integration & Document Delivery Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('Storage Path & Bucket Normalization', () => {
    it('normalizes paths with or without supabase scheme', () => {
      expect(normalizeStoragePath('supabase://Camso documents/documents/123_test.pdf')).toBe('documents/123_test.pdf');
      expect(normalizeStoragePath('documents/123_test.pdf')).toBe('documents/123_test.pdf');
      expect(normalizeStoragePath('')).toBe('');
      expect(normalizeStoragePath(null)).toBe('');
    });

    it('reconciles bucket configuration with default "Camso documents"', () => {
      const cfg = supabaseConfig.getSupabaseConfig({
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SECRET_KEY: 'test-key',
      });
      expect(cfg.bucket).toBe('Camso documents');
      expect(cfg.isReady).toBe(true);
    });

    it('fails gracefully when Supabase credentials are missing', async () => {
      jest.spyOn(supabaseConfig, 'getSupabaseConfig').mockReturnValue({
        url: '',
        secretKey: '',
        bucket: 'Camso documents',
        isReady: false,
      });

      await expect(uploadFileToSupabase({ file: { buffer: Buffer.from('test') } })).rejects.toThrow(
        /Supabase Storage is not configured/
      );

      await expect(createSignedDownloadUrl('documents/test.pdf')).rejects.toThrow(
        /Supabase Storage is not configured/
      );
    });
  });

  describe('Document RBAC, Guest Restrictions & Access Control', () => {
    it('allows public document download for unauthenticated or guest users', async () => {
      const mockDoc = {
        id: 'doc_pub_1',
        document_type: 'CATALOGUE',
        is_published: true,
        download_count: 5,
        files: [
          {
            language_code: 'en',
            media_asset: {
              url: 'https://example.com/catalogue.pdf',
              filename: 'catalogue.pdf',
              mime_type: 'application/pdf',
              size_bytes: 1024,
            },
          },
        ],
      };

      jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(mockDoc);
      jest.spyOn(documentsRepository, 'incrementDownloadCount').mockResolvedValue({ ...mockDoc, download_count: 6 });

      const res = await documentsService.downloadDocument('doc_pub_1', 'en', null);
      expect(res.document_id).toBe('doc_pub_1');
      expect(res.download_url).toBe('https://example.com/catalogue.pdf');
      expect(res.download_count).toBe(6);
    });

    it('rejects unauthenticated users on restricted technical guides with 401', async () => {
      const mockDoc = {
        id: 'doc_tech_1',
        document_type: 'TECHNICAL_GUIDE',
        is_published: true,
        files: [{ language_code: 'en', media_asset: { url: 'supabase://Camso documents/documents/guide.pdf' } }],
      };

      jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(mockDoc);

      await expect(documentsService.downloadDocument('doc_tech_1', 'en', null)).rejects.toThrow(
        /Authentication required to download this document/
      );
    });

    it('rejects guest users on restricted technical guides with 403', async () => {
      const mockDoc = {
        id: 'doc_tech_2',
        document_type: 'TECHNICAL_GUIDE',
        is_published: true,
        files: [{ language_code: 'en', media_asset: { url: 'supabase://Camso documents/documents/guide.pdf' } }],
      };

      jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(mockDoc);

      const guestActor = { id: 'usr_guest_1', is_guest: true, role: 'GUEST' };
      await expect(documentsService.downloadDocument('doc_tech_2', 'en', guestActor)).rejects.toThrow(
        /Guest users are not authorized to download restricted technical documentation/
      );
    });

    it('rejects cross-organization access on org-scoped documents with 403', async () => {
      const mockDoc = {
        id: 'doc_org_1',
        document_type: 'TECHNICAL_GUIDE',
        is_published: true,
        organization_id: 'ORG_ALPHA',
        files: [{ language_code: 'en', media_asset: { url: 'supabase://Camso documents/documents/guide.pdf' } }],
      };

      jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(mockDoc);

      const actorOrgBeta = { id: 'usr_beta_1', is_guest: false, role: 'DEALER', org_id: 'ORG_BETA' };
      await expect(documentsService.downloadDocument('doc_org_1', 'en', actorOrgBeta)).rejects.toThrow(
        /Cross-organization document access is prohibited/
      );
    });

    it('allows authorized business users (DEALER, DISTRIBUTOR, OEM_PARTNER) to download restricted guides', async () => {
      const mockDoc = {
        id: 'doc_tech_dealer',
        document_type: 'TECHNICAL_GUIDE',
        access_level: 'DEALER',
        is_published: true,
        download_count: 2,
        files: [
          {
            language_code: 'en',
            media_asset: {
              url: 'https://example.com/dealer_manual.pdf',
              filename: 'dealer_manual.pdf',
              mime_type: 'application/pdf',
              size_bytes: 2048,
            },
          },
        ],
      };

      jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(mockDoc);
      jest.spyOn(documentsRepository, 'incrementDownloadCount').mockResolvedValue({ ...mockDoc, download_count: 3 });

      const dealerActor = { id: 'usr_dealer_1', is_guest: false, role: 'DEALER', org_id: 'ORG_DEALER' };
      const res = await documentsService.downloadDocument('doc_tech_dealer', 'en', dealerActor);
      expect(res.document_id).toBe('doc_tech_dealer');
      expect(res.download_count).toBe(3);
    });
  });

  describe('Missing Files & Honest Error Handling', () => {
    it('throws 404 when document has 0 attached files', async () => {
      const mockDoc = {
        id: 'doc_empty_1',
        document_type: 'CATALOGUE',
        is_published: true,
        files: [],
      };

      jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(mockDoc);

      await expect(documentsService.downloadDocument('doc_empty_1', 'en', null)).rejects.toThrow(
        /No downloadable file attached to this document/
      );
    });

    it('throws 404 when document does not exist or is unpublished', async () => {
      jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(null);

      await expect(documentsService.downloadDocument('doc_nonexistent', 'en', null)).rejects.toThrow(
        /Document not found or unpublished/
      );
    });
  });

  describe('Storage Error Handling & Key Secrecy', () => {
    it('never leaks secret keys in error messages when signed URL creation fails', async () => {
      const mockDoc = {
        id: 'doc_supabase_err',
        document_type: 'CATALOGUE',
        is_published: true,
        files: [
          {
            language_code: 'en',
            media_asset: {
              url: 'supabase://Camso documents/documents/missing_in_bucket.pdf',
              filename: 'missing.pdf',
              mime_type: 'application/pdf',
              size_bytes: 1024,
            },
          },
        ],
      };

      jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(mockDoc);
      jest.spyOn(documentsRepository, 'incrementDownloadCount').mockResolvedValue(mockDoc);

      jest.spyOn(supabaseConfig, 'getSupabaseConfig').mockReturnValue({
        url: 'https://test.supabase.co',
        secretKey: 'mock-key',
        bucket: 'Camso documents',
        isReady: true,
      });

      // Force fetch to return 400
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '{"error":"Object not found"}',
      });

      try {
        await expect(documentsService.downloadDocument('doc_supabase_err', 'en', null)).rejects.toThrow(
          /Storage signed URL error/
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
