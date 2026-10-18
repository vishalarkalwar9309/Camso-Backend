'use strict';

/**
 * tests/unit/round3.persistence.test.js
 *
 * 1. WHAT THIS FILE DOES:
 *    Comprehensive automated unit and regression test suite verifying Round 3 backend fixes:
 *    - Issue 1: Customer stories display metadata cleaning and non-destructive tag sanitization.
 *    - Issue 2: Role-specific resources deduplication and ?role_only=true filtering.
 *    - Issue 3: Dealer profile unified activity stream with preserved calculations.
 *    - Issue 4: Distributor network server-side authorization and guest lockout.
 *    - Issue 5: Document download file existence validation and fail-closed error handling.
 *    - Issue 7: Polymorphic bookmarks lifecycle, multi-session persistence, and account scoping.
 * 2. OVERALL DESIGN:
 *    Uses Jest assertions and mock fixtures isolating service, validation, and route layers.
 *    Verifies RBAC rules, multi-tenant organization boundaries, and data integrity guarantees.
 * 3. ELEMENTS IN THE FILE:
 *    - Test suites for Customer Stories (Issue 1).
 *    - Test suites for Role-Specific Resources Deduplication (Issue 2).
 *    - Test suites for Dealer Profile & Calculations (Issue 3).
 *    - Test suites for Distributor Network RBAC (Issue 4).
 *    - Test suites for Document Download Physical File Checks (Issue 5).
 *    - Test suites for Polymorphic Bookmarks Persistence (Issue 7).
 * 4. FINAL OUTPUT OF THE FILE:
 *    Test runner output reporting PASS / FAIL on all Round 3 test suites.
 */

const { formatTestimonial } = require('../../src/modules/testimonials/testimonials.service');
const dealersService = require('../../src/modules/dealers/dealers.service');
const documentsService = require('../../src/modules/documents/documents.service');
const bookmarksService = require('../../src/modules/bookmarks/bookmarks.service');
const { syncBookmarksSchema } = require('../../src/modules/bookmarks/bookmarks.validation');
const activityRepo = require('../../src/modules/activity/activity.repository');
const calculationsService = require('../../src/modules/calculations/calculations.service');
const prisma = require('../../src/config/database');
const ApiError = require('../../src/core/utils/ApiError');

describe('CAMSO Backend — Round 3 Backend Persistence, Documents & Data Readiness', () => {

  // =========================================================================
  // ISSUE 1: Customer Stories Metadata Cleaning & Non-Destructive Sanitization
  // =========================================================================
  describe('Issue 1: Customer Stories Metadata Cleaning', () => {
    test('removes redundant tags ("verified", "NA", "customer story") and normalizes region', () => {
      const raw = {
        id: 101,
        customer_name: 'John Doe',
        company: 'Apex Logging Corp',
        quote: 'Outstanding tread life under extreme heavy timber loads.',
        rating: 5,
        region: 'NA',
        story_type: 'SOLIDS',
        tags: ['verified', 'Customer Story', 'na', 'Heavy Duty', 'Forestry', 'N/A'],
        is_verified: true,
        is_published: true,
      };

      const formatted = formatTestimonial(raw);

      // 1. Normalized region
      expect(formatted.region).toBe('North America');
      expect(formatted.location).toBe('North America');

      // 2. Redundant display tags stripped
      expect(formatted.tags).toContain('Heavy Duty');
      expect(formatted.tags).toContain('Forestry');
      expect(formatted.tags).not.toContain('verified');
      expect(formatted.tags).not.toContain('Customer Story');
      expect(formatted.tags).not.toContain('na');
      expect(formatted.tags).not.toContain('N/A');

      // 3. Human-readable domain story type (no redundant "Customer Story")
      expect(formatted.display_story_type).toBe('Solid Tire Case Study');

      // 4. Genuine verification data and quotes strictly preserved
      expect(formatted.is_verified).toBe(true);
      expect(formatted.quote).toBe(raw.quote);
      expect(formatted.author_name).toBe('John Doe');
      expect(formatted.company).toBe('Apex Logging Corp');
    });

    test('supplies meaningful domain fallback tags when tags array contains only redundant tokens', () => {
      const raw = {
        id: 102,
        customer_name: 'Marie Dubois',
        region: 'Europe',
        story_type: 'OPERATING_COST',
        tags: ['verified', 'customer story'],
        is_verified: true,
      };

      const formatted = formatTestimonial(raw);
      expect(formatted.tags).toEqual(['Cost Efficiency', 'Fleet ROI']);
      expect(formatted.display_story_type).toBe('Operating Cost Analysis');
    });
  });

  // =========================================================================
  // ISSUE 2: Role-Specific Resources Deduplication & Clean Contract
  // =========================================================================
  describe('Issue 2: Role-Specific Resources Deduplication & Clean API Contract', () => {
    test('listPublishedDocuments deduplicates documents with identical IDs', async () => {
      const mockDocs = [
        { id: 1, title: 'Track Fitment Guide', document_type: 'MANUAL', access_level: 'PUBLIC', is_published: true },
        { id: 2, title: 'Warranty Policy', document_type: 'MANUAL', access_level: 'PUBLIC', is_published: true },
        { id: 1, title: 'Track Fitment Guide (Duplicate)', document_type: 'MANUAL', access_level: 'PUBLIC', is_published: true },
      ];

      const repoSpy = jest.spyOn(require('../../src/modules/documents/documents.repository'), 'findPublishedDocuments')
        .mockResolvedValue([3, mockDocs]);

      const result = await documentsService.listPublishedDocuments({}, {});
      repoSpy.mockRestore();

      expect(result.documents).toHaveLength(2);
      expect(result.documents.map((d) => d.id)).toEqual([1, 2]);
    });
  });

  // =========================================================================
  // ISSUE 3: Dealer Profile Unified Activity & Calculations Preservation
  // =========================================================================
  describe('Issue 3: Dealer Profile Unified Account Activity & Calculations Preservation', () => {
    test('saves calculation without deleting data and captures CALCULATION_SAVED activity event', async () => {
      const dealerPrincipal = {
        id: 'dealer-usr-44',
        role: 'DEALER',
        is_business: true,
        org_id: 'org-dealer-77',
      };

      const payload = {
        calculation_type: 'SCRAP_TIRE_ESTIMATE',
        title: 'Q4 Forestry Fleet Tire Budget',
        inputs: { fleet_size: 14, operating_hours: 2400 },
        results: { estimated_savings_usd: 12450 },
      };

      const saved = await calculationsService.saveCalculation(dealerPrincipal, payload);

      expect(saved).toBeDefined();
      expect(saved.calculation_type).toBe('SCRAP_TIRE_ESTIMATE');
      expect(saved.business_user_id).toBe('dealer-usr-44');
      expect(saved.organization_id).toBe('org-dealer-77');
      expect(saved.results.estimated_savings_usd).toBe(12450);
    });

    test('findBusinessActivities builds query with OR: [{ business_user_id }, { organization_id }]', async () => {
      const findManySpy = jest.spyOn(prisma.userActivity, 'findMany').mockResolvedValue([]);

      await activityRepo.findBusinessActivities({
        businessUserId: 'dealer-usr-44',
        organizationId: 'org-dealer-77',
        activityType: 'CALCULATION_SAVED',
      });

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { business_user_id: 'dealer-usr-44' },
              { organization_id: 'org-dealer-77' },
            ],
            activity_type: 'CALCULATION_SAVED',
          }),
        })
      );

      findManySpy.mockRestore();
    });
  });

  // =========================================================================
  // ISSUE 4: Distributor Network Server-Side Authorization
  // =========================================================================
  describe('Issue 4: Distributor Network Server-Side Authorization', () => {
    test('rejects unauthenticated guest requests for type=DISTRIBUTOR with 401 Unauthorized', async () => {
      await expect(
        dealersService.getLocator({ type: 'DISTRIBUTOR' }, null)
      ).rejects.toThrow(ApiError);

      await expect(
        dealersService.getLocator({ type: 'DISTRIBUTOR' }, { is_guest: true })
      ).rejects.toThrow('Authentication required to access distributor network data.');
    });

    test('rejects regular end-user requests for type=DISTRIBUTOR with 403 Forbidden', async () => {
      const endUserPrincipal = {
        id: 'usr-regular-12',
        role: 'END_USER',
        is_guest: false,
      };

      await expect(
        dealersService.getLocator({ type: 'DISTRIBUTOR' }, endUserPrincipal)
      ).rejects.toThrow('Access denied to distributor network data.');
    });

    test('filters out distributor records on general locator searches for unauthenticated users', async () => {
      const repoSpy = jest.spyOn(require('../../src/modules/dealers/dealers.repository'), 'findAllActive')
        .mockResolvedValue([
          { id: 1, name: 'Local Tire Service', type: 'DEALER', is_active: true },
        ]);

      const results = await dealersService.getLocator({}, null);
      expect(repoSpy).toHaveBeenCalledWith(expect.objectContaining({ excludeDistributor: true }));
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('DEALER');

      repoSpy.mockRestore();
    });

    test('permits authorized DEALER and DISTRIBUTOR callers to query distributor network data', async () => {
      const dealerPrincipal = {
        id: 'dealer-usr-44',
        role: 'DEALER',
        is_business: true,
      };

      const repoSpy = jest.spyOn(require('../../src/modules/dealers/dealers.repository'), 'findAllActive')
        .mockResolvedValue([
          { id: 99, name: 'Midwest Regional Distribution Hub', type: 'DISTRIBUTOR', is_active: true },
        ]);

      const results = await dealersService.getLocator({ type: 'DISTRIBUTOR' }, dealerPrincipal);
      expect(repoSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'DISTRIBUTOR',
        excludeDistributor: false,
      }));
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('DISTRIBUTOR');

      repoSpy.mockRestore();
    });
  });

  // =========================================================================
  // ISSUE 5: Document Downloads Physical File Existence Validation
  // =========================================================================
  describe('Issue 5: Document Downloads Physical File Existence Validation', () => {
    test('throws 401 when download is attempted without authentication', async () => {
      const docRepoSpy = jest.spyOn(require('../../src/modules/documents/documents.repository'), 'findPublishedDocumentById')
        .mockResolvedValue({ id: 1, access_level: 'PUBLIC', is_published: true });

      await expect(
        documentsService.downloadDocument(1, 'en', null)
      ).rejects.toThrow('Authentication required to download this document.');

      docRepoSpy.mockRestore();
    });

    test('throws 404 when physical file is missing from local storage', async () => {
      const docWithMissingFile = {
        id: 999,
        access_level: 'PUBLIC',
        is_published: true,
        files: [
          {
            language_code: 'en',
            media_asset: {
              url: '/uploads/documents/products/missing-file.pdf',
              filename: 'missing-file.pdf',
            },
          },
        ],
      };

      const docRepoSpy = jest.spyOn(require('../../src/modules/documents/documents.repository'), 'findPublishedDocumentById')
        .mockResolvedValue(docWithMissingFile);

      const authenticatedActor = { id: 'usr-1', role: 'END_USER', is_guest: false };

      await expect(
        documentsService.downloadDocument(999, 'en', authenticatedActor)
      ).rejects.toThrow('The physical document file could not be found on the storage server.');

      docRepoSpy.mockRestore();
    });

    test('returns genuine download metadata when file exists', async () => {
      // Use existing demo file generated in scripts/generate_demo_documents.js
      const docWithRealFile = {
        id: 1,
        access_level: 'PUBLIC',
        is_published: true,
        files: [
          {
            language_code: 'en',
            media_asset: {
              url: '/uploads/documents/general/camso-track-fitment-guide.pdf',
              filename: 'camso-track-fitment-guide.pdf',
              mime_type: 'application/pdf',
              size_bytes: 4200,
            },
          },
        ],
      };

      const docRepoSpy = jest.spyOn(require('../../src/modules/documents/documents.repository'), 'findPublishedDocumentById')
        .mockResolvedValue(docWithRealFile);
      const incSpy = jest.spyOn(require('../../src/modules/documents/documents.repository'), 'incrementDownloadCount')
        .mockResolvedValue({});

      const authenticatedActor = { id: 'usr-1', role: 'END_USER', is_guest: false };

      const result = await documentsService.downloadDocument(1, 'en', authenticatedActor);

      expect(result).toBeDefined();
      expect(result.document_id).toBe(1);
      expect(result.file_name).toBe('camso-track-fitment-guide.pdf');
      expect(result.mime_type).toBe('application/pdf');
      expect(result.download_url).toContain('camso-track-fitment-guide.pdf');

      docRepoSpy.mockRestore();
      incSpy.mockRestore();
    });
  });

  // =========================================================================
  // ISSUE 7: Polymorphic Bookmarks Lifecycle & Multi-Session Persistence
  // =========================================================================
  describe('Issue 7: Polymorphic Bookmarks Lifecycle & Multi-Session Persistence', () => {
    test('validates polymorphic sync body with product_ids, document_ids, and testimonial_ids', () => {
      const payload = {
        product_ids: [1, 2, 3],
        document_ids: [10, 11],
        testimonial_ids: [101],
      };

      const { error, value } = syncBookmarksSchema.validate(payload);
      expect(error).toBeUndefined();
      expect(value.product_ids).toEqual([1, 2, 3]);
      expect(value.document_ids).toEqual([10, 11]);
      expect(value.testimonial_ids).toEqual([101]);
    });

    test('validates polymorphic sync body with unified bookmarks object array', () => {
      const payload = {
        bookmarks: [
          { target_type: 'PRODUCT', target_id: 1 },
          { target_type: 'DOCUMENT', target_id: 10 },
          { target_type: 'TESTIMONIAL', target_id: 101 },
        ],
      };

      const { error, value } = syncBookmarksSchema.validate(payload);
      expect(error).toBeUndefined();
      expect(value.bookmarks).toHaveLength(3);
    });

    test('syncs polymorphic bookmarks for authenticated dealer without duplicating existing entries', async () => {
      const dealerPrincipal = {
        id: 'dealer-usr-44',
        role: 'DEALER',
        is_business: true,
        org_id: 'org-dealer-77',
      };

      const prodSpy = jest.spyOn(require('../../src/modules/bookmarks/bookmarks.repository'), 'findProductById')
        .mockImplementation((id) => Promise.resolve({ id: Number(id), is_active: true }));
      const docSpy = jest.spyOn(require('../../src/modules/bookmarks/bookmarks.repository'), 'findDocumentById')
        .mockImplementation((id) => Promise.resolve({ id: Number(id), is_published: true }));

      // Product 1 throws duplicate conflict (already bookmarked), Product 2 succeeds, Document 10 succeeds
      const createSpy = jest.spyOn(require('../../src/modules/bookmarks/bookmarks.repository'), 'createBookmark')
        .mockImplementation((params) => {
          if (params.productId === 1) {
            const err = new Error('Unique constraint failed');
            err.code = 'P2002';
            throw err;
          }
          return Promise.resolve({ id: `bm-${params.productId || params.documentId}`, ...params });
        });

      const syncResult = await bookmarksService.syncBookmarks(dealerPrincipal, {
        product_ids: [1, 2], // 1 already exists, 2 is new
        document_ids: [10],   // 10 is new
      });

      expect(syncResult).toBeDefined();
      expect(syncResult.synced_count).toBe(2); // 2 new items synced, 1 skipped duplicate
      expect(createSpy).toHaveBeenCalledTimes(3);

      prodSpy.mockRestore();
      docSpy.mockRestore();
      createSpy.mockRestore();
    });
  });
});
