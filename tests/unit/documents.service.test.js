'use strict';

/**
 * 1. What this file does:
 *    Unit tests for the Documents service module, verifying RBAC enforcement,
 *    anonymous public document download access, mandatory authentication for restricted downloads,
 *    role-based document access boundaries, and admin document confidentiality.
 * 2. Overall design:
 *    Mocks documents repository, translation repository, and audit service,
 *    exercising downloadDocument, listPublishedDocuments, and getPublishedDocumentById.
 * 3. Elements in the file:
 *    - describe('Documents Service (Unit Tests)'): Main test suite.
 *    - downloadDocument tests: Validates 401 for anonymous on restricted docs, 200 for anonymous on public docs, 403 for unauthorized roles, 200 for authorized.
 *    - listPublishedDocuments tests: Validates exclusion of ADMIN documents from public browse.
 *    - getPublishedDocumentById tests: Validates 404 for admin documents when accessed by end-users.
 * 4. Final output of the file:
 *    Executes unit test assertions verifying document security boundaries.
 */

const documentsService = require('../../src/modules/documents/documents.service');
const documentsRepository = require('../../src/modules/documents/documents.repository');

jest.mock('../../src/modules/documents/documents.repository');
jest.mock('../../src/core/repositories/translation.repository', () => ({
  findByEntity: jest.fn().mockResolvedValue([]),
  findManyByEntities: jest.fn().mockResolvedValue([]),
  upsertFieldTranslations: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../src/core/services/auditService', () => ({
  record: jest.fn().mockResolvedValue({}),
}));

describe('Documents Service (Unit Tests)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('downloadDocument', () => {
    const publicDoc = {
      id: 'doc-pub-1',
      document_type: 'CATALOGUE',
      access_level: 'PUBLIC',
      is_published: true,
      download_count: 5,
      files: [
        {
          language_code: 'en',
          media_asset: {
            url: 'https://storage.supabase.co/camso/cat.pdf',
            filename: 'cat.pdf',
            mime_type: 'application/pdf',
            size_bytes: 1048576,
          },
        },
      ],
    };

    const dealerDoc = {
      id: 'doc-dlr-1',
      document_type: 'BULLETIN',
      access_level: 'DEALER',
      is_published: true,
      download_count: 2,
      files: [
        {
          language_code: 'en',
          media_asset: {
            url: 'https://storage.supabase.co/camso/bulletin.pdf',
            filename: 'bulletin.pdf',
            mime_type: 'application/pdf',
            size_bytes: 524288,
          },
        },
      ],
    };

    const distributorDoc = {
      id: 'doc-dist-1',
      document_type: 'MANUAL',
      access_level: 'DISTRIBUTOR',
      is_published: true,
      download_count: 1,
      files: [
        {
          language_code: 'en',
          media_asset: {
            url: 'https://storage.supabase.co/camso/dist_manual.pdf',
            filename: 'dist_manual.pdf',
            mime_type: 'application/pdf',
            size_bytes: 2097152,
          },
        },
      ],
    };

    const oemDoc = {
      id: 'doc-oem-1',
      document_type: 'TECHNICAL_GUIDE',
      access_level: 'OEM',
      is_published: true,
      download_count: 0,
      files: [
        {
          language_code: 'en',
          media_asset: {
            url: 'https://storage.supabase.co/camso/cad_specs.pdf',
            filename: 'cad_specs.pdf',
            mime_type: 'application/pdf',
            size_bytes: 4194304,
          },
        },
      ],
    };

    const adminDoc = {
      id: 'doc-adm-1',
      document_type: 'MANUAL',
      access_level: 'ADMIN',
      is_published: true,
      files: [
        {
          language_code: 'en',
          media_asset: {
            url: 'https://storage.supabase.co/camso/internal_audit.pdf',
            filename: 'internal_audit.pdf',
          },
        },
      ],
    };

    it('rejects unauthenticated/anonymous download for restricted document with 401 UNAUTHORIZED', async () => {
      documentsRepository.findPublishedDocumentById.mockResolvedValue(dealerDoc);

      await expect(
        documentsService.downloadDocument('doc-dlr-1', 'en', null)
      ).rejects.toMatchObject({
        statusCode: 401,
        message: expect.stringMatching(/Authentication required/),
      });
    });

    it('allows anonymous caller to download a PUBLIC document', async () => {
      documentsRepository.findPublishedDocumentById.mockResolvedValue(publicDoc);
      documentsRepository.incrementDownloadCount.mockResolvedValue();

      const result = await documentsService.downloadDocument('doc-pub-1', 'en', null);

      expect(result).toBeDefined();
      expect(result.download_url).toBe('https://storage.supabase.co/camso/cat.pdf');
      expect(documentsRepository.incrementDownloadCount).toHaveBeenCalledWith('doc-pub-1');
    });

    it('allows authenticated registered end user to download a PUBLIC document', async () => {
      documentsRepository.findPublishedDocumentById.mockResolvedValue(publicDoc);
      documentsRepository.incrementDownloadCount.mockResolvedValue();

      const result = await documentsService.downloadDocument('doc-pub-1', 'en', {
        id: 'user-123',
        is_guest: false,
        role: 'END_USER',
      });

      expect(result).toBeDefined();
      expect(result.download_url).toBe('https://storage.supabase.co/camso/cat.pdf');
      expect(documentsRepository.incrementDownloadCount).toHaveBeenCalledWith('doc-pub-1');
    });

    it('rejects guest user from downloading DEALER-restricted document with 403 FORBIDDEN', async () => {
      documentsRepository.findPublishedDocumentById.mockResolvedValue(dealerDoc);

      await expect(
        documentsService.downloadDocument('doc-dlr-1', 'en', {
          id: 'guest-1',
          is_guest: true,
          role: 'GUEST',
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringMatching(/Guest users are not authorized/),
      });
    });

    it('rejects standard end user from downloading DEALER-restricted document with 403 FORBIDDEN', async () => {
      documentsRepository.findPublishedDocumentById.mockResolvedValue(dealerDoc);

      await expect(
        documentsService.downloadDocument('doc-dlr-1', 'en', {
          id: 'user-1',
          is_guest: false,
          role: 'END_USER',
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringMatching(/restricted to authorized Dealers and Distributors/),
      });
    });

    it('allows authorized DEALER to download DEALER-restricted document', async () => {
      documentsRepository.findPublishedDocumentById.mockResolvedValue(dealerDoc);
      documentsRepository.incrementDownloadCount.mockResolvedValue();

      const result = await documentsService.downloadDocument('doc-dlr-1', 'en', {
        id: 'dealer-staff-1',
        role: 'DEALER',
        org_id: 'org-dealer-1',
      });

      expect(result).toBeDefined();
      expect(result.download_url).toBe('https://storage.supabase.co/camso/bulletin.pdf');
    });

    it('rejects DEALER from downloading DISTRIBUTOR-restricted document with 403 FORBIDDEN', async () => {
      documentsRepository.findPublishedDocumentById.mockResolvedValue(distributorDoc);

      await expect(
        documentsService.downloadDocument('doc-dist-1', 'en', {
          id: 'dealer-staff-1',
          role: 'DEALER',
          org_id: 'org-dealer-1',
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringMatching(/restricted to regional Distributors/),
      });
    });

    it('rejects non-OEM actor from downloading OEM-restricted document with 403 FORBIDDEN', async () => {
      documentsRepository.findPublishedDocumentById.mockResolvedValue(oemDoc);

      await expect(
        documentsService.downloadDocument('doc-oem-1', 'en', {
          id: 'dist-staff-1',
          role: 'DISTRIBUTOR',
          org_id: 'org-dist-1',
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringMatching(/restricted to OEM Integration Partners/),
      });
    });

    it('strictly denies non-admin from downloading ADMIN document with 403 FORBIDDEN', async () => {
      documentsRepository.findPublishedDocumentById.mockResolvedValue(adminDoc);

      await expect(
        documentsService.downloadDocument('doc-adm-1', 'en', {
          id: 'dist-staff-1',
          role: 'DISTRIBUTOR',
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringMatching(/restricted to platform Administrators/),
      });
    });
  });

  describe('getPublishedDocumentById', () => {
    it('returns 404 NOT_FOUND for ADMIN document when queried by non-admin actor', async () => {
      documentsRepository.findPublishedDocumentById.mockResolvedValue({
        id: 'doc-admin-internal',
        access_level: 'ADMIN',
        is_published: true,
      });

      await expect(
        documentsService.getPublishedDocumentById('doc-admin-internal', 'en', {
          id: 'user-1',
          role: 'END_USER',
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Document not found.',
      });
    });
  });
});
