'use strict';

/**
 * 1. What this file does:
 *    Validates the fail-closed security boundary for the Documents module when operating
 *    against an unmigrated database schema where the `documents.access_level` column does not exist (Prisma error P2022).
 * 2. Overall design:
 *    Directly exercises both the real documents.repository.js with an unmigrated PrismaClient simulator
 *    and documents.service.js with unmigrated record structures lacking access_level properties,
 *    proving that restricted, role-specific, and admin documents fail closed and are never leaked.
 * 3. Elements in the file:
 *    - describe('Documents Unmigrated Schema & Fail-Closed Security'):
 *      - Repository P2022 fallback tests: verifies fail-closed returns [0, []] on restricted access_level or document_type,
 *        and restricts public fallback queries strictly to public document types.
 *      - Service-level fail-closed resolution tests: verifies unmigrated admin and restricted documents are excluded
 *        from public listings, throw 404 on unauthenticated/public inspection, and throw 403 on download attempts.
 *      - Fail-Closed Enforcement for Documents with Ordinary Titles (No Obvious Keywords):
 *        * getPublishedDocumentById Fail-Closed Proof: verifies non-admin roles (anonymous, END_USER, GUEST, DEALER,
 *          DISTRIBUTOR, OEM_PARTNER) receive 404, while platform admins (SUPER_ADMIN, CONTENT_ADMIN) can inspect.
 *        * downloadDocument Fail-Closed Proof: verifies 401 on unauthenticated access, 403 on non-admin roles,
 *          and permits authorized downloads only for platform admins.
 * 4. Final output of the file:
 *    Automated Jest test execution demonstrating full fail-closed security guarantees on unmigrated schemas.
 */

const documentsRepository = require('../../src/modules/documents/documents.repository');
const documentsService = require('../../src/modules/documents/documents.service');

jest.mock('../../src/core/repositories/translation.repository', () => ({
  findByEntity: jest.fn().mockResolvedValue([]),
  findManyByEntities: jest.fn().mockResolvedValue([]),
  upsertFieldTranslations: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../src/core/services/auditService', () => ({
  record: jest.fn().mockResolvedValue({}),
}));

describe('Documents Unmigrated Schema & Fail-Closed Security', () => {
  describe('Repository P2022 Fail-Closed Boundary (Real Repository Logic)', () => {
    function createUnmigratedPrismaMock() {
      const p2022Error = new Error('Column documents.access_level does not exist');
      p2022Error.code = 'P2022';

      return {
        document: {
          count: jest.fn().mockImplementation(() => Promise.reject(p2022Error)),
          findMany: jest.fn().mockImplementation(() => Promise.reject(p2022Error)),
        },
        $transaction: jest.fn().mockImplementation(async (promises) => Promise.all(promises)),
      };
    }

    it('fails closed and returns empty [0, []] when restricted access_level (DEALER) is requested on unmigrated schema', async () => {
      const mockPrismaClient = createUnmigratedPrismaMock();
      const filters = { access_level: 'DEALER' };
      const pagination = { skip: 0, take: 20, sort: 'created_at:desc' };

      const [total, records] = await documentsRepository.findPublishedDocuments(filters, pagination, mockPrismaClient);

      expect(total).toBe(0);
      expect(records).toEqual([]);
      expect(mockPrismaClient.$transaction).toHaveBeenCalledTimes(1);
    });

    it('fails closed and returns empty [0, []] when restricted access_level (ADMIN) is requested on unmigrated schema', async () => {
      const mockPrismaClient = createUnmigratedPrismaMock();
      const filters = { access_level: 'ADMIN' };
      const pagination = { skip: 0, take: 20 };

      const [total, records] = await documentsRepository.findPublishedDocuments(filters, pagination, mockPrismaClient);

      expect(total).toBe(0);
      expect(records).toEqual([]);
    });

    it('fails closed and returns empty [0, []] when restricted document_type (TECHNICAL_GUIDE) is requested on unmigrated schema', async () => {
      const mockPrismaClient = createUnmigratedPrismaMock();
      const filters = { document_type: 'TECHNICAL_GUIDE' };
      const pagination = { skip: 0, take: 20 };

      const [total, records] = await documentsRepository.findPublishedDocuments(filters, pagination, mockPrismaClient);

      expect(total).toBe(0);
      expect(records).toEqual([]);
    });

    it('restricts fallback database where condition strictly to public document types on unmigrated public browse', async () => {
      const p2022Error = new Error('Column documents.access_level does not exist');
      p2022Error.code = 'P2022';

      let fallbackQueryWhere = null;
      let transactionCallCount = 0;

      const mockPrismaClient = {
        document: {
          count: jest.fn().mockImplementation(() => {
            if (transactionCallCount === 0) {
              return Promise.reject(p2022Error);
            }
            return Promise.resolve(1);
          }),
          findMany: jest.fn().mockImplementation((args) => {
            if (transactionCallCount === 0) {
              return Promise.reject(p2022Error);
            }
            fallbackQueryWhere = args.where;
            return Promise.resolve([
              {
                id: 'doc-cat-1',
                document_type: 'CATALOGUE',
                is_published: true,
                download_count: 0,
                files: [],
              },
            ]);
          }),
        },
        $transaction: jest.fn().mockImplementation(async (promises) => {
          transactionCallCount++;
          return Promise.all(promises);
        }),
      };

      const filters = {};
      const pagination = { skip: 0, take: 20 };

      const [total, records] = await documentsRepository.findPublishedDocuments(filters, pagination, mockPrismaClient);

      expect(total).toBe(1);
      expect(records.length).toBe(1);
      expect(mockPrismaClient.$transaction).toHaveBeenCalledTimes(2);
      expect(fallbackQueryWhere).toBeDefined();
      expect(fallbackQueryWhere.is_published).toBe(true);
      expect(fallbackQueryWhere.document_type).toEqual({ in: ['CATALOGUE', 'BROCHURE', 'MANUAL'] });
    });
  });

  describe('Service-Level Fail-Closed Filtering for Unmigrated Rows', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('strictly filters out unmigrated documents with admin or restricted titles from public listing', async () => {
      const unmigratedRows = [
        {
          id: 'doc-pub-cat',
          document_type: 'CATALOGUE',
          title: 'Camso 2026 Commercial Tire Catalogue',
          is_published: true,
          files: [],
        },
        {
          id: 'doc-adm-secret',
          document_type: 'MANUAL',
          title: 'Internal Confidential Admin Audit Checklist',
          is_published: true,
          files: [],
        },
        {
          id: 'doc-dlr-restricted',
          document_type: 'MANUAL',
          title: 'Dealer Warranty Commercial Claim Processing Guide',
          is_published: true,
          files: [],
        },
      ];

      jest.spyOn(documentsRepository, 'findPublishedDocuments').mockResolvedValue([3, unmigratedRows]);

      const result = await documentsService.listPublishedDocuments({}, { page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.documents.length).toBe(1);
      expect(result.documents[0].id).toBe('doc-pub-cat');
      expect(result.documents[0].access_level).toBe('PUBLIC');

      const adminFound = result.documents.find((d) => d.id === 'doc-adm-secret');
      const dealerFound = result.documents.find((d) => d.id === 'doc-dlr-restricted');
      expect(adminFound).toBeUndefined();
      expect(dealerFound).toBeUndefined();
    });

    it('returns 404 NOT_FOUND when non-admin accesses an unmigrated document with an admin title', async () => {
      const unmigratedAdminDoc = {
        id: 'doc-unmigrated-admin',
        document_type: 'MANUAL',
        title: 'Platform Internal Admin Pricing Matrix',
        is_published: true,
        files: [],
      };

      jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(unmigratedAdminDoc);

      await expect(
        documentsService.getPublishedDocumentById('doc-unmigrated-admin', 'en', {
          id: 'usr-regular',
          role: 'END_USER',
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Document not found or access permissions cannot be safely established.',
      });
    });

    it('returns 403 FORBIDDEN when user attempts to download an unmigrated document with an admin title', async () => {
      const unmigratedAdminDoc = {
        id: 'doc-unmigrated-admin-dl',
        document_type: 'MANUAL',
        title: 'Platform Admin Security Keys Procedure',
        is_published: true,
        files: [
          {
            language_code: 'en',
            media_asset: { url: 'https://storage.supabase.co/camso/sec.pdf', filename: 'sec.pdf' },
          },
        ],
      };

      jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(unmigratedAdminDoc);

      await expect(
        documentsService.downloadDocument('doc-unmigrated-admin-dl', 'en', {
          id: 'dealer-usr',
          role: 'DEALER',
          org_id: 'org-1',
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Document access permissions cannot be safely established on an unmigrated schema. Access is denied.',
      });
    });

    describe('Fail-Closed Enforcement for Documents with Ordinary Titles (No Obvious Keywords)', () => {
      const ordinaryTitleDoc = {
        id: 'doc-ord-partner-77',
        document_type: 'TECHNICAL_GUIDE',
        title: '2026 Transmission Maintenance Manual',
        is_published: true,
        files: [
          {
            id: 'file-ord-1',
            language_code: 'en',
            media_asset: { url: 'https://storage.supabase.co/camso/trans_manual.pdf', filename: 'trans_manual.pdf', size_bytes: 54321 },
          },
        ],
      };

      describe('getPublishedDocumentById Fail-Closed Proof', () => {
        it('rejects anonymous callers with 404 when access_level is absent', async () => {
          jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(ordinaryTitleDoc);

          await expect(documentsService.getPublishedDocumentById('doc-ord-partner-77', 'en', null)).rejects.toMatchObject({
            statusCode: 404,
            message: 'Document not found or access permissions cannot be safely established.',
          });
        });

        it('rejects regular end users with 404 when access_level is absent', async () => {
          jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(ordinaryTitleDoc);

          await expect(
            documentsService.getPublishedDocumentById('doc-ord-partner-77', 'en', { id: 'usr-1', role: 'END_USER' })
          ).rejects.toMatchObject({
            statusCode: 404,
            message: 'Document not found or access permissions cannot be safely established.',
          });
        });

        it('rejects guest users with 404 when access_level is absent', async () => {
          jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(ordinaryTitleDoc);

          await expect(
            documentsService.getPublishedDocumentById('doc-ord-partner-77', 'en', { id: 'guest-1', is_guest: true, role: 'GUEST' })
          ).rejects.toMatchObject({
            statusCode: 404,
            message: 'Document not found or access permissions cannot be safely established.',
          });
        });

        it('rejects dealers and distributors with 404 when access_level is absent', async () => {
          jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(ordinaryTitleDoc);

          await expect(
            documentsService.getPublishedDocumentById('doc-ord-partner-77', 'en', { id: 'dlr-1', role: 'DEALER', org_id: 'org-1' })
          ).rejects.toMatchObject({
            statusCode: 404,
            message: 'Document not found or access permissions cannot be safely established.',
          });

          await expect(
            documentsService.getPublishedDocumentById('doc-ord-partner-77', 'en', { id: 'dist-1', role: 'DISTRIBUTOR', org_id: 'org-2' })
          ).rejects.toMatchObject({
            statusCode: 404,
            message: 'Document not found or access permissions cannot be safely established.',
          });
        });

        it('rejects OEM partners with 404 when access_level is absent', async () => {
          jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(ordinaryTitleDoc);

          await expect(
            documentsService.getPublishedDocumentById('doc-ord-partner-77', 'en', { id: 'oem-1', role: 'OEM_PARTNER' })
          ).rejects.toMatchObject({
            statusCode: 404,
            message: 'Document not found or access permissions cannot be safely established.',
          });
        });

        it('allows SUPER_ADMIN and CONTENT_ADMIN to view document details even when unmigrated', async () => {
          jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(ordinaryTitleDoc);

          const superAdminResult = await documentsService.getPublishedDocumentById('doc-ord-partner-77', 'en', {
            id: 'admin-1',
            role: 'SUPER_ADMIN',
          });
          expect(superAdminResult).toBeDefined();
          expect(superAdminResult.id).toBe('doc-ord-partner-77');

          const contentAdminResult = await documentsService.getPublishedDocumentById('doc-ord-partner-77', 'en', {
            id: 'admin-2',
            role: 'CONTENT_ADMIN',
          });
          expect(contentAdminResult).toBeDefined();
          expect(contentAdminResult.id).toBe('doc-ord-partner-77');
        });
      });

      describe('downloadDocument Fail-Closed Proof', () => {
        it('rejects unauthenticated requests with 401 UNAUTHORIZED before evaluating unmigrated schema', async () => {
          jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(ordinaryTitleDoc);

          await expect(documentsService.downloadDocument('doc-ord-partner-77', 'en', null)).rejects.toMatchObject({
            statusCode: 401,
            type: 'UNAUTHORIZED',
          });
        });

        it('rejects regular end users with 403 FORBIDDEN when access_level is absent', async () => {
          jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(ordinaryTitleDoc);

          await expect(
            documentsService.downloadDocument('doc-ord-partner-77', 'en', { id: 'usr-1', role: 'END_USER' })
          ).rejects.toMatchObject({
            statusCode: 403,
            message: 'Document access permissions cannot be safely established on an unmigrated schema. Access is denied.',
          });
        });

        it('rejects guest users with 403 FORBIDDEN when access_level is absent', async () => {
          jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(ordinaryTitleDoc);

          await expect(
            documentsService.downloadDocument('doc-ord-partner-77', 'en', { id: 'guest-1', is_guest: true, role: 'GUEST' })
          ).rejects.toMatchObject({
            statusCode: 403,
            message: 'Document access permissions cannot be safely established on an unmigrated schema. Access is denied.',
          });
        });

        it('rejects dealers and distributors with 403 FORBIDDEN when access_level is absent', async () => {
          jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(ordinaryTitleDoc);

          await expect(
            documentsService.downloadDocument('doc-ord-partner-77', 'en', { id: 'dlr-1', role: 'DEALER', org_id: 'org-1' })
          ).rejects.toMatchObject({
            statusCode: 403,
            message: 'Document access permissions cannot be safely established on an unmigrated schema. Access is denied.',
          });

          await expect(
            documentsService.downloadDocument('doc-ord-partner-77', 'en', { id: 'dist-1', role: 'DISTRIBUTOR', org_id: 'org-2' })
          ).rejects.toMatchObject({
            statusCode: 403,
            message: 'Document access permissions cannot be safely established on an unmigrated schema. Access is denied.',
          });
        });

        it('rejects OEM partners with 403 FORBIDDEN when access_level is absent', async () => {
          jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(ordinaryTitleDoc);

          await expect(
            documentsService.downloadDocument('doc-ord-partner-77', 'en', { id: 'oem-1', role: 'OEM_PARTNER' })
          ).rejects.toMatchObject({
            statusCode: 403,
            message: 'Document access permissions cannot be safely established on an unmigrated schema. Access is denied.',
          });
        });

        it('allows SUPER_ADMIN and CONTENT_ADMIN to download document even on unmigrated schema', async () => {
          jest.spyOn(documentsRepository, 'findPublishedDocumentById').mockResolvedValue(ordinaryTitleDoc);
          jest.spyOn(documentsRepository, 'incrementDownloadCount').mockResolvedValue({ ...ordinaryTitleDoc, download_count: 1 });

          const superAdminDl = await documentsService.downloadDocument('doc-ord-partner-77', 'en', {
            id: 'admin-1',
            role: 'SUPER_ADMIN',
          });
          expect(superAdminDl).toBeDefined();
          expect(superAdminDl.download_url).toBe('https://storage.supabase.co/camso/trans_manual.pdf');

          const contentAdminDl = await documentsService.downloadDocument('doc-ord-partner-77', 'en', {
            id: 'admin-2',
            role: 'CONTENT_ADMIN',
          });
          expect(contentAdminDl).toBeDefined();
          expect(contentAdminDl.download_url).toBe('https://storage.supabase.co/camso/trans_manual.pdf');
        });
      });
    });
  });
});
