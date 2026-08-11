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
const { getTranslations, attachTranslations } = require('../../core/utils/translate');
const ApiError = require('../../core/utils/ApiError');

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

    const documents = await Promise.all(
      records.map(async (doc) => {
        const translations = await getTranslations('DOCUMENT', doc.id);
        return attachTranslations(doc, translations, query.lang || 'en');
      }),
    );

    const meta = buildPaginationMeta(paginationOptions.page, paginationOptions.pageSize, total);

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
    const resolvedFiles = files.filter((f) => f.language_code === lang);

    return {
      ...localizedDoc,
      files: resolvedFiles,
    };
  },
  async listAdminDocuments(filters, query) {
    const paginationOptions = parsePagination(query);
    const [total, records] = await documentsRepository.findAdminDocuments(filters, paginationOptions);

    const documents = await Promise.all(
      records.map(async (doc) => {
        const translations = await getTranslations('DOCUMENT', doc.id);
        return attachTranslations(doc, translations, query.lang || 'en');
      }),
    );

    const meta = buildPaginationMeta(paginationOptions.page, paginationOptions.pageSize, total);
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

    const { uploadToFirebase } = require('../../core/utils/mediaUpload');
    const mediaAsset = await uploadToFirebase(file, adminUserId, undefined, 'documents');

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
};

module.exports = documentsService;
