'use strict';

/**
 * src/modules/documents/documents.service.js
 *
 * WHAT THIS FILE DOES:
 *   Service layer for documents business logic.
 *   Coordinates repository queries, pagination meta, and polymorphic translation merging.
 *
 * OVERALL DESIGN:
 *   Handles business rules for public document listing and detail retrieval.
 *   Uses documentsRepository for DB calls and translate.js utilities for localized title retrieval.
 *   Does NOT import Prisma directly.
 *
 * ELEMENTS IN THIS FILE:
 *   - listPublishedDocuments(filters, query) — list published documents with pagination and i18n
 *   - getPublishedDocumentById(id, lang)     — get document detail by ID with files and i18n
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing service methods for documents module.
 *
 * IMPORTED BY:
 *   src/modules/documents/documents.controller.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8
 */

const documentsRepository = require('./documents.repository');
const { parsePagination, buildPaginationMeta } = require('../../core/utils/pagination');
const { getTranslations, getManyTranslations, attachTranslations, attachManyTranslations } = require('../../core/utils/translate');
const ApiError = require('../../core/utils/ApiError');

function resolveDocumentAccessLevel(doc) {
  if (doc.access_level) {
    const explicit = String(doc.access_level).toUpperCase();
    if (['PUBLIC', 'OEM', 'OEM_PARTNER', 'DEALER', 'DISTRIBUTOR', 'RESTRICTED', 'ADMIN'].includes(explicit)) {
      if (explicit === 'OEM_PARTNER') return 'OEM';
      return explicit;
    }
  }

  const title = (doc.title || '').toLowerCase();

  // 1. OEM partner technical documentation & CAD envelope specifications
  if (title.includes('oem') || title.includes('cad')) {
    return 'OEM';
  }

  // 2. Dealer & Distributor commercial warranty & claim processing guides
  if (
    title.includes('warranty') &&
    (title.includes('dealer') || title.includes('distributor') || title.includes('commercial') || title.includes('claim'))
  ) {
    return 'DEALER';
  }

  // 3. Prototypes and internal test specifications
  if (title.includes('prototype') || title.includes('internal') || title.includes('test-p')) {
    return 'RESTRICTED';
  }

  // 4. Product Technical Datasheets and Engineering Application/Maintenance Guides
  if (
    title.includes('datasheet') ||
    title.includes('data sheet') ||
    title.includes('spec sheet') ||
    title.includes('application') ||
    title.includes('maintenance guide') ||
    (doc.product_id && (title.includes('guide') || title.includes('spec') || title.includes('manual')))
  ) {
    return 'PUBLIC';
  }

  // 5. Standard Public Types
  if (['CATALOGUE', 'BROCHURE', 'MANUAL'].includes(doc.document_type)) {
    return 'PUBLIC';
  }

  // 6. Generic technical guides and bulletins (restricted to business partners: Dealer, Distributor, OEM)
  if (['TECHNICAL_GUIDE', 'BULLETIN'].includes(doc.document_type)) {
    return 'RESTRICTED';
  }

  return 'PUBLIC';
}

const documentsService = {
  /**
   * listPublishedDocuments
   *
   * USE: Retrieves a paginated list of published documents with translated titles for the requested language.
   *
   * HOW IT WORKS:
   *   1. Parses pagination options from query.
   *   2. Queries documentsRepository for published documents matching filters.
   *   3. Fetches translations for each document and attaches localized title.
   *   4. Builds and returns { documents, pagination }.
   *
   * CONCEPTS: Business service layer, translation merging, pagination meta.
   *
   * PLACES IMPORTED AND USED: src/modules/documents/documents.controller.js
   *
   * @param {object} filters — { product_id, category_id, document_type }
   * @param {object} query — raw req.query object for pagination
   * @returns {Promise<{ documents: Array<object>, pagination: object }>}
   */
  async listPublishedDocuments(filters, query) {
    const paginationOptions = parsePagination(query);
    const [total, records] = await documentsRepository.findPublishedDocuments(filters, paginationOptions);

    const meta = buildPaginationMeta(paginationOptions.page, paginationOptions.pageSize, total);

    if (!records || records.length === 0) {
      return { documents: [], pagination: meta };
    }

    const docIds = records.map((doc) => doc.id);
    const translations = await getManyTranslations('DOCUMENT', docIds);
    const rawDocuments = attachManyTranslations(records, translations, query.lang || 'en');
    const reqLang = query.lang || 'en';

    const documents = rawDocuments.map((doc) => {
      const files = doc.files || [];
      const primaryFile = files.find((f) => f.language_code === reqLang) || files[0] || null;
      const media = primaryFile?.media_asset || null;
      const accessLevel = resolveDocumentAccessLevel(doc);

      return {
        ...doc,
        access_level: accessLevel,
        has_file: Boolean(media && (media.url || media.storage_path)),
        file_size_bytes: media?.size_bytes || null,
        mime_type: media?.mime_type || null,
        filename: media?.filename || null,
        is_offline_downloadable: primaryFile?.is_offline_downloadable ?? false,
        files: files.map((f) => ({
          id: f.id,
          language_code: f.language_code,
          is_offline_downloadable: f.is_offline_downloadable,
          size_bytes: f.media_asset?.size_bytes || null,
          mime_type: f.media_asset?.mime_type || null,
          filename: f.media_asset?.filename || null,
          media_asset: f.media_asset || undefined,
        })),
      };
    });

    return { documents, pagination: meta };
  },

  /**
   * getPublishedDocumentById
   *
   * USE: Retrieves details of a single published document including per-language file attachments and localized title.
   *
   * HOW IT WORKS:
   *   1. Queries documentsRepository for published document by ID.
   *   2. Throws ApiError.notFound if document is missing or unpublished (is_published: false).
   *   3. Fetches translations and merges localized title for requested language.
   *   4. Filters document_files for requested language (or returns all attached files if specific lang matches).
   *
   * CONCEPTS: Resource lookup, 404 handling, file language semantics.
   *
   * PLACES IMPORTED AND USED: src/modules/documents/documents.controller.js
   *
   * @param {number} id — document primary key ID
   * @param {string} lang — requested language code (e.g. 'en', 'fr')
   * @returns {Promise<object>}
   */
  async getPublishedDocumentById(id, lang = 'en') {
    const doc = await documentsRepository.findPublishedDocumentById(id);

    if (!doc) {
      throw ApiError.notFound('Document not found.');
    }

    const translations = await getTranslations('DOCUMENT', doc.id);
    const localizedDoc = attachTranslations(doc, translations, lang);

    // Resolve document_files for requested language per contract
    const files = doc.files || [];
    const resolvedFiles = lang ? files.filter((f) => f.language_code === lang) : files;
    const primaryFile = resolvedFiles[0] || files[0] || null;
    const media = primaryFile?.media_asset || null;
    const accessLevel = resolveDocumentAccessLevel(localizedDoc);

    return {
      ...localizedDoc,
      access_level: accessLevel,
      has_file: Boolean(media && (media.url || media.storage_path)),
      file_size_bytes: media?.size_bytes || null,
      mime_type: media?.mime_type || null,
      filename: media?.filename || null,
      is_offline_downloadable: primaryFile?.is_offline_downloadable ?? false,
      files: resolvedFiles.map((f) => ({
        id: f.id,
        language_code: f.language_code,
        is_offline_downloadable: f.is_offline_downloadable,
        size_bytes: f.media_asset?.size_bytes || null,
        mime_type: f.media_asset?.mime_type || null,
        filename: f.media_asset?.filename || null,
        media_asset: f.media_asset || undefined,
      })),
    };
  },
  async listAdminDocuments(filters, query) {
    const paginationOptions = parsePagination(query);
    const [total, records] = await documentsRepository.findAdminDocuments(filters, paginationOptions);

    const meta = buildPaginationMeta(paginationOptions.page, paginationOptions.pageSize, total);

    if (!records || records.length === 0) {
      return { documents: [], pagination: meta };
    }

    const docIds = records.map((doc) => doc.id);
    const translations = await getManyTranslations('DOCUMENT', docIds);
    const rawDocuments = attachManyTranslations(records, translations, query.lang || 'en');

    const documents = rawDocuments.map((doc) => ({
      ...doc,
      has_file: (doc.files || []).length > 0,
      file_count: (doc.files || []).length,
      files: doc.files || [],
    }));

    return { documents, pagination: meta };
  },

  async getAdminDocumentById(id, lang = 'en') {
    const doc = await documentsRepository.findAdminDocumentById(id);
    if (!doc) {
      throw ApiError.notFound('Document not found.');
    }

    const translations = await getTranslations('DOCUMENT', doc.id);
    const localizedDoc = attachTranslations(doc, translations, lang);

    // Admin should likely see all files, but we resolve for the specific lang if provided
    return { ...localizedDoc, files: doc.files || [] };
  },

  async createDocument(data, reqAuditContext) {
    const doc = await documentsRepository.createDocument(data);
    
    // Save english fallback title
    await require('../../core/repositories/translation.repository').upsertFieldTranslations('DOCUMENT', doc.id, {
      title: { en: data.title }
    });

    await require('../../core/services/auditService').record({
      ...reqAuditContext,
      action: 'CREATE',
      entityType: 'DOCUMENT',
      entityId: doc.id,
      after: data,
    });

    return doc;
  },

  async updateDocument(id, data, reqAuditContext) {
    const existing = await documentsRepository.findAdminDocumentById(id);
    if (!existing) throw ApiError.notFound('Document not found.');

    const updateData = {};
    if (data.product_id !== undefined) updateData.product_id = data.product_id;
    if (data.category_id !== undefined) updateData.category_id = data.category_id;
    if (data.document_type !== undefined) updateData.document_type = data.document_type;
    if (data.is_published !== undefined) updateData.is_published = data.is_published;

    const doc = await documentsRepository.updateDocument(id, updateData);

    // Handle translations
    if (data.translations && data.translations.length > 0) {
      const fields = {};
      for (const t of data.translations) {
        if (!fields[t.field]) fields[t.field] = {};
        fields[t.field][t.language_code] = t.value;
      }
      await require('../../core/repositories/translation.repository').upsertFieldTranslations('DOCUMENT', id, fields);
    } else if (data.title) {
      await require('../../core/repositories/translation.repository').upsertFieldTranslations('DOCUMENT', id, {
        title: { en: data.title }
      });
    }

    if (data.is_published !== undefined && existing.is_published !== data.is_published) {
      await require('../../core/services/auditService').record({
        ...reqAuditContext,
        action: data.is_published ? 'PUBLISH' : 'UNPUBLISH',
        entityType: 'DOCUMENT',
        entityId: id,
        before: { is_published: existing.is_published },
        after: { is_published: data.is_published },
      });
    }

    await require('../../core/services/auditService').record({
      ...reqAuditContext,
      action: 'UPDATE',
      entityType: 'DOCUMENT',
      entityId: id,
      before: existing,
      after: updateData,
    });

    return doc;
  },

  async uploadDocumentFile(id, file, languageCode, adminUserId, reqAuditContext) {
    const existing = await documentsRepository.findAdminDocumentById(id);
    if (!existing) throw ApiError.notFound('Document not found.');

    const supabaseConfig = require('../../config/supabase');
    let mediaAsset;

    if (supabaseConfig.isSupabaseReady) {
      const { uploadFileToSupabase } = require('../../core/utils/supabaseStorage');
      const mediaAssetRepository = require('../../core/repositories/mediaAsset.repository');
      const storageResult = await uploadFileToSupabase({ file, folder: 'documents' });
      mediaAsset = await mediaAssetRepository.createMediaAsset({
        url: storageResult.url,
        filename: file.originalname || storageResult.filename,
        mime_type: file.mimetype || 'application/pdf',
        size_bytes: file.size,
        uploaded_by_admin_id: adminUserId ? String(adminUserId) : null,
      });
    } else {
      const { uploadToFirebase } = require('../../core/utils/mediaUpload');
      mediaAsset = await uploadToFirebase(file, adminUserId, undefined, 'documents');
    }

    const docFile = await documentsRepository.addDocumentFile(id, languageCode, mediaAsset.id);

    await require('../../core/services/auditService').record({
      ...reqAuditContext,
      action: 'UPDATE',
      entityType: 'DOCUMENT_FILE',
      entityId: docFile.id,
      after: { language_code: languageCode, media_asset_id: mediaAsset.id },
    });

    return docFile;
  },

  async downloadDocument(id, lang = 'en', actor = null, req = null) {
    const doc = await documentsRepository.findPublishedDocumentById(id);
    if (!doc) {
      throw ApiError.notFound('Document not found or unpublished.');
    }

    const translations = await getTranslations('DOCUMENT', doc.id);
    const localizedDoc = attachTranslations(doc, translations, lang);

    const accessLevel = resolveDocumentAccessLevel(localizedDoc);
    const isPublic = accessLevel === 'PUBLIC';

    if (!isPublic) {
      // 1. Must be authenticated
      if (!actor || !actor.id) {
        throw ApiError.unauthorized('Authentication required to download this document.');
      }
      // 2. Guests cannot download restricted technical files
      if (actor.is_guest) {
        throw ApiError.forbidden('Guest users are not authorized to download restricted technical documentation.');
      }

      const role = actor.role || 'END_USER';
      const isSuperOrContentAdmin = ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(role);

      if (!isSuperOrContentAdmin) {
        // Enforce role-based access
        if (accessLevel === 'DEALER' && !['DEALER', 'DISTRIBUTOR'].includes(role)) {
          throw ApiError.forbidden('This document is restricted to authorized Dealers and Distributors.');
        }
        if (accessLevel === 'DISTRIBUTOR' && role !== 'DISTRIBUTOR') {
          throw ApiError.forbidden('This document is restricted to regional Distributors.');
        }
        if ((accessLevel === 'OEM' || accessLevel === 'OEM_PARTNER') && role !== 'OEM_PARTNER') {
          throw ApiError.forbidden('This document is restricted to OEM Integration Partners.');
        }
        if (accessLevel === 'ADMIN') {
          throw ApiError.forbidden('This document is restricted to platform Administrators.');
        }
        if (['TECHNICAL_GUIDE', 'BULLETIN'].includes(doc.document_type)) {
          const allowedRoles = ['DEALER', 'DISTRIBUTOR', 'OEM_PARTNER'];
          if (!allowedRoles.includes(role)) {
            throw ApiError.forbidden('Your account role is not authorized to download technical documentation.');
          }
        }

        // Enforce organization scoping if document is tied to a specific organization
        if (doc.organization_id && actor.org_id && doc.organization_id !== actor.org_id) {
          throw ApiError.forbidden('Cross-organization document access is prohibited.');
        }
      }
    }

    const files = doc.files || [];
    const targetFile = files.find((f) => f.language_code === lang) || files[0];
    const media = targetFile?.media_asset;

    if (!media || !media.url) {
      throw ApiError.notFound('No downloadable file attached to this document.');
    }

    // Increment download count only when authorized file actually exists
    await documentsRepository.incrementDownloadCount(id);

    // Record user activity
    const actorId = actor?.id || req?.headers?.['x-device-id'] || null;
    if (actorId) {
      try {
        const { prisma } = require('../../config/database');
        await prisma.userActivity.create({
          data: {
            user_id: actor?.is_guest ? null : (actor?.id || null),
            device_id: typeof actorId === 'string' && !actor?.id ? actorId : null,
            activity_type: 'DOCUMENT_DOWNLOAD',
            entity_type: 'DOCUMENT',
            entity_id: id,
            metadata: { document_type: doc.document_type, lang, access_level: isPublic ? 'PUBLIC' : (explicitLevel || 'RESTRICTED') },
          },
        });
      } catch (_) {
        // Non-blocking activity recording
      }
    }

    let downloadUrl = media.url;
    if (media.url && (media.url.startsWith('supabase://') || media.url.startsWith('documents/'))) {
      const { createSignedDownloadUrl } = require('../../core/utils/supabaseStorage');
      downloadUrl = await createSignedDownloadUrl(media.url, 3600);
    }

    return {
      document_id: doc.id,
      download_url: downloadUrl,
      file_name: media.filename || media.file_name || `camso-document-${doc.id}.pdf`,
      mime_type: media.mime_type || 'application/pdf',
      file_size_bytes: media.size_bytes || media.file_size_bytes || null,
      download_count: (doc.download_count || 0) + 1,
    };
  },
};

module.exports = documentsService;
