'use strict';

/**
 * src/modules/documents/documents.repository.js
 *
 * WHAT THIS FILE DOES:
 *   Repository module for database access on documents and document_files tables.
 *   Contains Prisma queries for reading published documents and document details.
 *
 * OVERALL DESIGN:
 *   Follows the 5-tier architecture (Repositories are the ONLY layer that calls Prisma).
 *   Encapsulates all database reads for documents and document_files.
 *
 * ELEMENTS IN THIS FILE:
 *   - findPublishedDocuments(filters, pagination, prismaClient) — lists published documents with count
 *   - findPublishedDocumentById(id, prismaClient)              — fetches single published document with files & media
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing database query methods for documents.
 *
 * IMPORTED BY:
 *   src/modules/documents/documents.service.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 4 & 7
 */

const { parseSort } = require('../../core/utils/pagination');
const { prisma } = require('../../config/database');

const ALLOWED_SORT_FIELDS = ['created_at', 'updated_at', 'id', 'document_type'];

const documentsRepository = {
  /**
   * findPublishedDocuments
   *
   * USE: Queries PostgreSQL for published documents matching filter criteria with pagination.
   *
   * HOW IT WORKS:
   *   Builds Prisma where clause enforcing `is_published: true`.
   *   Applies optional product_id, category_id, document_type filters.
   *   Uses parseSort against an allow-list of fields.
   *   Executes count and findMany in a transaction.
   *
   * CONCEPTS: Offset pagination, Prisma transaction query, allow-list sort safety.
   *
   * PLACES IMPORTED AND USED: src/modules/documents/documents.service.js
   *
   * @param {object} filters — { product_id, category_id, document_type }
   * @param {object} pagination — { skip, take, sort }
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<[number, Array<object>]>} — count and records array
   */
  async findPublishedDocuments(filters, pagination, prismaClient = prisma) {
    const where = {
      is_published: true,
      access_level: { not: 'ADMIN' },
    };

    if (filters.product_id) where.product_id = filters.product_id;
    if (filters.category_id) where.category_id = filters.category_id;
    if (filters.document_type) where.document_type = filters.document_type;
    if (filters.access_level) where.access_level = filters.access_level;

    const { orderBy } = parseSort(pagination.sort, ALLOWED_SORT_FIELDS, 'created_at', 'desc');

    try {
      return await prismaClient.$transaction([
        prismaClient.document.count({ where }),
        prismaClient.document.findMany({
          where,
          skip: pagination.skip,
          take: pagination.take,
          orderBy,
          select: {
            id: true,
            product_id: true,
            category_id: true,
            document_type: true,
            access_level: true,
            is_published: true,
            download_count: true,
            created_at: true,
            updated_at: true,
            files: {
              select: {
                id: true,
                language_code: true,
                is_offline_downloadable: true,
                media_asset: {
                  select: {
                    id: true,
                    url: true,
                    filename: true,
                    mime_type: true,
                    size_bytes: true,
                  },
                },
              },
            },
          },
        }),
      ]);
    } catch (err) {
      if (err.code === 'P2022') {
        // FAIL-CLOSED SECURITY STRATEGY ON UNMIGRATED SCHEMA:
        // 1. If restricted access_level was explicitly requested, the unmigrated database
        //    cannot safely enforce access boundaries. Fail closed and return empty.
        if (filters.access_level && filters.access_level !== 'PUBLIC') {
          return [0, []];
        }
        // 2. If restricted document types (technical guides, bulletins) were requested,
        //    fail closed to prevent exposing sensitive technical specs.
        if (filters.document_type && ['TECHNICAL_GUIDE', 'BULLETIN'].includes(filters.document_type)) {
          return [0, []];
        }

        // 3. For public browse, restrict document types strictly to public types.
        const fallbackWhere = {
          is_published: true,
          document_type: filters.document_type ? filters.document_type : { in: ['CATALOGUE', 'BROCHURE', 'MANUAL'] },
        };
        if (filters.product_id) fallbackWhere.product_id = filters.product_id;
        if (filters.category_id) fallbackWhere.category_id = filters.category_id;
        return await prismaClient.$transaction([
          prismaClient.document.count({ where: fallbackWhere }),
          prismaClient.document.findMany({
            where: fallbackWhere,
            skip: pagination.skip,
            take: pagination.take,
            orderBy,
            select: {
              id: true,
              product_id: true,
              category_id: true,
              document_type: true,
              is_published: true,
              download_count: true,
              created_at: true,
              updated_at: true,
              files: {
                select: {
                  id: true,
                  language_code: true,
                  is_offline_downloadable: true,
                  media_asset: {
                    select: {
                      id: true,
                      url: true,
                      filename: true,
                      mime_type: true,
                      size_bytes: true,
                    },
                  },
                },
              },
            },
          }),
        ]);
      }
      throw err;
    }
  },

  /**
   * findPublishedDocumentById
   *
   * USE: Fetches a single published document by primary key ID along with attached document_files and media_assets.
   *
   * HOW IT WORKS:
   *   Queries document where id matches and `is_published: true`.
   *   Includes `files` relation joined with `media_asset`.
   *
   * CONCEPTS: Relational include query.
   *
   * PLACES IMPORTED AND USED: src/modules/documents/documents.service.js
   *
   * @param {number} id — document integer primary key
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<object|null>}
   */
  async findPublishedDocumentById(id, prismaClient = prisma) {
    try {
      return await prismaClient.document.findFirst({
        where: {
          id,
          is_published: true,
        },
        select: {
          id: true,
          product_id: true,
          category_id: true,
          document_type: true,
          access_level: true,
          download_count: true,
          created_at: true,
          updated_at: true,
          files: {
            select: {
              id: true,
              language_code: true,
              is_offline_downloadable: true,
              media_asset: {
                select: {
                  id: true,
                  url: true,
                  filename: true,
                  mime_type: true,
                  size_bytes: true,
                },
              },
            },
          },
        },
      });
    } catch (err) {
      if (err.code === 'P2022') {
        return await prismaClient.document.findFirst({
          where: {
            id,
            is_published: true,
          },
          select: {
            id: true,
            product_id: true,
            category_id: true,
            document_type: true,
            download_count: true,
            created_at: true,
            updated_at: true,
            files: {
              select: {
                id: true,
                language_code: true,
                is_offline_downloadable: true,
                media_asset: {
                  select: {
                    id: true,
                    url: true,
                    filename: true,
                    mime_type: true,
                    size_bytes: true,
                  },
                },
              },
            },
          },
        });
      }
      throw err;
    }
  },
  async findAdminDocuments(filters, pagination, prismaClient = prisma) {
    const where = {};
    if (filters.product_id) where.product_id = filters.product_id;
    if (filters.category_id) where.category_id = filters.category_id;
    if (filters.document_type) where.document_type = filters.document_type;
    if (typeof filters.is_published === 'boolean') where.is_published = filters.is_published;

    const { orderBy } = parseSort(pagination.sort, ALLOWED_SORT_FIELDS, 'created_at', 'desc');

    return prismaClient.$transaction([
      prismaClient.document.count({ where }),
      prismaClient.document.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        select: {
          id: true,
          product_id: true,
          category_id: true,
          document_type: true,
          access_level: true,
          is_published: true,
          download_count: true,
          created_at: true,
          updated_at: true,
          files: {
            select: {
              id: true,
              language_code: true,
              is_offline_downloadable: true,
              media_asset: {
                select: {
                  id: true,
                  url: true,
                  filename: true,
                  mime_type: true,
                  size_bytes: true,
                },
              },
            },
          },
        },
      }),
    ]);
  },

  async findAdminDocumentById(id, prismaClient = prisma) {
    return prismaClient.document.findFirst({
      where: { id },
      select: {
        id: true,
        product_id: true,
        category_id: true,
        document_type: true,
        access_level: true,
        is_published: true,
        created_at: true,
        updated_at: true,
        files: {
          select: {
            id: true,
            language_code: true,
            is_offline_downloadable: true,
            media_asset: {
              select: {
                id: true,
                url: true,
                filename: true,
                mime_type: true,
                size_bytes: true,
              },
            },
          },
        },
      },
    });
  },

  async createDocument(data, prismaClient = prisma) {
    const createData = {
      product_id: data.product_id,
      category_id: data.category_id,
      document_type: data.document_type,
      is_published: data.is_published,
    };
    if (data.access_level !== undefined) {
      createData.access_level = data.access_level;
    }
    return prismaClient.document.create({
      data: createData,
    });
  },

  async updateDocument(id, data, prismaClient = prisma) {
    return prismaClient.document.update({
      where: { id },
      data,
    });
  },

  async addDocumentFile(documentId, languageCode, mediaAssetId, isOfflineDownloadable = false, prismaClient = prisma) {
    return prismaClient.documentFile.upsert({
      where: {
        document_id_language_code: {
          document_id: documentId,
          language_code: languageCode,
        },
      },
      update: {
        media_asset_id: mediaAssetId,
        is_offline_downloadable: isOfflineDownloadable,
      },
      create: {
        document_id: documentId,
        language_code: languageCode,
        media_asset_id: mediaAssetId,
        is_offline_downloadable: isOfflineDownloadable,
      },
    });
  },

  async incrementDownloadCount(id, prismaClient = prisma) {
    return prismaClient.document.update({
      where: { id },
      data: {
        download_count: {
          increment: 1,
        },
      },
    });
  },
};

module.exports = documentsRepository;
