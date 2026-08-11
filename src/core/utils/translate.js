'use strict';

/**
 * src/core/utils/translate.js
 *
 * WHAT THIS FILE DOES:
 *   Provides utilities for reading and writing translations using the
 *   polymorphic Translation table defined in core.prisma.
 *
 * OVERALL DESIGN:
 *   Translations are stored as (entity_type, entity_id, field, language_code, value) rows.
 *   This utility provides generic helpers that every module with translatable fields uses.
 *   The actual Prisma calls happen here via the passed prismaClient — keeping
 *   this utility framework-agnostic and testable.
 *
 * ELEMENTS:
 *   getTranslations(entityType, entityId, prismaClient)      — fetches all translations for an entity
 *   upsertTranslations(entityType, entityId, fields, prismaClient) — creates or updates translations
 *   deleteTranslations(entityType, entityId, prismaClient)   — removes all translations for an entity
 *   attachTranslations(entity, translations, language)       — merges translations into entity object
 *
 * FINAL OUTPUT:
 *   module.exports = { getTranslations, upsertTranslations, deleteTranslations, attachTranslations }
 *
 * IMPORTED BY:
 *   *.repository.js files for entities with translatable fields
 *   (documents, faqs, notifications, app-content, categories, products)
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 7 (translations table)
 */

const translationRepository = require('../repositories/translation.repository');

/**
 * getTranslations
 *
 * USE: Fetches all translation rows for a specific entity via translationRepository.
 *
 * HOW IT WORKS:
 *   Delegates to translationRepository.findByEntity().
 *
 * @param {string} entityType   — e.g. "DOCUMENT", "FAQ"
 * @param {number} entityId     — the entity's integer primary key
 * @param {object} [prismaClient] — optional Prisma client instance
 * @returns {Promise<Array<{ field: string, language_code: string, value: string }>>}
 */
async function getTranslations(entityType, entityId, prismaClient) {
  return translationRepository.findByEntity(entityType, entityId, prismaClient);
}

/**
 * getManyTranslations
 *
 * USE: Fetches translation rows for multiple entities at once.
 */
async function getManyTranslations(entityType, entityIds, prismaClient) {
  return translationRepository.findManyByEntities(entityType, entityIds, prismaClient);
}

/**
 * upsertTranslations
 *
 * USE: Creates or updates translations for an entity's fields across languages via translationRepository.
 *
 * HOW IT WORKS:
 *   Delegates to translationRepository.upsertFieldTranslations().
 *
 * @param {string} entityType   — e.g. "DOCUMENT"
 * @param {number} entityId     — the entity's integer PK
 * @param {object} fields       — { fieldName: { languageCode: value } }
 * @param {object} [prismaClient] — optional Prisma client instance
 * @returns {Promise<void>}
 */
async function upsertTranslations(entityType, entityId, fields, prismaClient) {
  return translationRepository.upsertFieldTranslations(entityType, entityId, fields, prismaClient);
}

/**
 * deleteTranslations
 *
 * USE: Deletes all translation rows for a given entity via translationRepository.
 *
 * @param {string} entityType   — e.g. "DOCUMENT"
 * @param {number} entityId     — the entity's integer PK
 * @param {object} [prismaClient] — optional Prisma client instance
 * @returns {Promise<void>}
 */
async function deleteTranslations(entityType, entityId, prismaClient) {
  return translationRepository.deleteByEntity(entityType, entityId, prismaClient);
}

/**
 * attachTranslations
 *
 * USE: Merges translation rows into an entity object for a specific language.
 *      Falls back to 'en' if the requested language has no translations.
 *
 * HOW IT WORKS:
 *   1. Filters translations for the requested language_code.
 *   2. If none found, falls back to 'en'.
 *   3. Reduces field→value pairs into the entity object.
 *
 * CONCEPTS: Language fallback pattern.
 *
 * BEFORE: entity has no localized field values.
 * AFTER:  entity has { title, question, ... } populated from translations.
 *
 * @param {object} entity       — the base entity object
 * @param {Array}  translations — array from getTranslations()
 * @param {string} language     — requested language code (e.g. 'fr')
 * @returns {object}            — entity with translated fields merged in
 */
function attachTranslations(entity, translations, language = 'en') {
  const forLanguage = translations.filter((t) => t.language_code === language);
  const source = forLanguage.length > 0
    ? forLanguage
    : translations.filter((t) => t.language_code === 'en');

  const translated = source.reduce((acc, t) => {
    acc[t.field] = t.value;
    return acc;
  }, {});

  return { ...entity, ...translated };
}

/**
 * attachManyTranslations
 *
 * USE: Attaches translations to a list of entities efficiently.
 */
function attachManyTranslations(entities, allTranslations, language = 'en') {
  // Group translations by entity_id
  const translationsByEntity = allTranslations.reduce((acc, t) => {
    if (!acc[t.entity_id]) acc[t.entity_id] = [];
    acc[t.entity_id].push(t);
    return acc;
  }, {});

  return entities.map((entity) => {
    const entityTranslations = translationsByEntity[entity.id] || [];
    return attachTranslations(entity, entityTranslations, language);
  });
}

module.exports = { getTranslations, getManyTranslations, upsertTranslations, deleteTranslations, attachTranslations, attachManyTranslations };
