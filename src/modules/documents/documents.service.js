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
};

module.exports = documentsService;
