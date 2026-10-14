'use strict';

/**
 * src/core/repositories/translation.repository.js
 *
 * Repository module for database operations on the polymorphic translations table.
 * Encapsulates all Prisma queries targeting translations.
 */

const { prisma } = require('../../config/database');

const translationRepository = {
  /**
   * findByEntity
   * Fetches all translation records for a given entity_type and entity_id.
   */
  async findByEntity(entityType, entityId, prismaClient = prisma) {
    const stringEntityId = String(entityId);
    return prismaClient.translation.findMany({
      where: { entity_type: entityType, entity_id: stringEntityId },
      select: { field: true, language_code: true, value: true },
    });
  },

  /**
   * findManyByEntities
   * Fetches all translation records for a batch of entities.
   */
  async findManyByEntities(entityType, entityIds, prismaClient = prisma) {
    if (!entityIds || entityIds.length === 0) return [];
    const stringIds = entityIds.map((id) => String(id));
    return prismaClient.translation.findMany({
      where: { entity_type: entityType, entity_id: { in: stringIds } },
      select: { entity_id: true, field: true, language_code: true, value: true },
    });
  },

  /**
   * upsertFieldTranslations
   * Upserts translation entries for entity fields across languages.
   */
  async upsertFieldTranslations(entityType, entityId, fields, prismaClient = prisma) {
    const stringEntityId = String(entityId);
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
                entity_id: stringEntityId,
                field,
                language_code: languageCode,
              },
            },
            create: { entity_type: entityType, entity_id: stringEntityId, field, language_code: languageCode, value: String(value) },
            update: { value: String(value) },
          })
        );
      }
    }

    if (operations.length > 0) {
      await Promise.all(operations);
    }
  },

  /**
   * deleteByEntity
   * Removes all translation records for a given entity.
   */
  async deleteByEntity(entityType, entityId, prismaClient = prisma) {
    const stringEntityId = String(entityId);
    return prismaClient.translation.deleteMany({
      where: { entity_type: entityType, entity_id: stringEntityId },
    });
  },
};

module.exports = translationRepository;
