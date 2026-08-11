'use strict';

/**
 * src/core/repositories/translation.repository.js
 *
 * WHAT THIS FILE DOES:
 *   Repository module for database operations on the polymorphic translations table.
 *   Provides data access methods for fetching, upserting, and deleting translations.
 *
 * OVERALL DESIGN:
 *   Follows the 5-tier architecture (Repositories are the ONLY layer that calls Prisma).
 *   Encapsulates all Prisma queries targeting the translations table.
 *   Accepts an optional `prismaClient` parameter for transaction or mock scope support.
 *
 * ELEMENTS IN THIS FILE:
 *   - findByEntity(entityType, entityId, prismaClient)
 *   - upsertFieldTranslations(entityType, entityId, fields, prismaClient)
 *   - deleteByEntity(entityType, entityId, prismaClient)
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing database persistence methods for translations.
 *
 * IMPORTED BY:
 *   src/core/utils/translate.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 7 (translations table)
 */

const { prisma } = require('../../config/database');

/**
 * translationRepository
 *
 * USE: Data access layer for translations database table.
 *
 * KEY DESIGN:
 *   Encapsulates all Prisma queries for polymorphic translations.
 *   Does NOT perform object language merging/fallback mapping.
 */
const translationRepository = {
  /**
   * findByEntity
   *
   * USE: Fetches all translation records for a given entity_type and entity_id.
   *
   * @param {string} entityType — e.g. "DOCUMENT", "FAQ"
   * @param {number} entityId — integer PK of the entity
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<Array<{ field: string, language_code: string, value: string }>>}
   */
  async findByEntity(entityType, entityId, prismaClient = prisma) {
    return prismaClient.translation.findMany({
      where: { entity_type: entityType, entity_id: entityId },
      select: { field: true, language_code: true, value: true },
    });
  },

  /**
   * findManyByEntities
   *
   * USE: Fetches all translation records for a batch of entities.
   *
   * @param {string} entityType — e.g. "NOTIFICATION"
   * @param {Array<number>} entityIds — array of integer PKs
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<Array<{ entity_id: number, field: string, language_code: string, value: string }>>}
   */
  async findManyByEntities(entityType, entityIds, prismaClient = prisma) {
    if (!entityIds || entityIds.length === 0) return [];
    return prismaClient.translation.findMany({
      where: { entity_type: entityType, entity_id: { in: entityIds } },
      select: { entity_id: true, field: true, language_code: true, value: true },
    });
  },

  /**
   * upsertFieldTranslations
   *
   * USE: Upserts translation entries for entity fields across languages.
   *
   * @param {string} entityType — e.g. "DOCUMENT"
   * @param {number} entityId — integer PK of entity
   * @param {object} fields — { fieldName: { languageCode: value } }
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<void>}
   */
  async upsertFieldTranslations(entityType, entityId, fields, prismaClient = prisma) {
    const operations = [];

    for (const [field, langMap] of Object.entries(fields)) {
      if (!langMap || typeof langMap !== 'object') continue;
      for (const [languageCode, value] of Object.entries(langMap)) {
        if (value === undefined || value === null) continue;
        operations.push(
          prismaClient.translation.upsert({
            where: {
              entity_type_entity_id_field_language_code: {
                entity_type: entityType,
                entity_id: entityId,
                field,
                language_code: languageCode,
              },
            },
            create: { entity_type: entityType, entity_id: entityId, field, language_code: languageCode, value: String(value) },
            update: { value: String(value) },
          }),
        );
      }
    }

    if (operations.length > 0) {
      await Promise.all(operations);
    }
  },

  /**
   * deleteByEntity
   *
   * USE: Removes all translation records for a given entity.
   *
   * @param {string} entityType — e.g. "DOCUMENT"
   * @param {number} entityId — integer PK of entity
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<object>}
   */
  async deleteByEntity(entityType, entityId, prismaClient = prisma) {
    return prismaClient.translation.deleteMany({
      where: { entity_type: entityType, entity_id: entityId },
    });
  },
};

module.exports = translationRepository;
