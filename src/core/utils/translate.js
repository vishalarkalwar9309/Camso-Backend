'use strict';

/**
 * src/core/utils/translate.js
 *
 * Provides utilities for reading and writing translations using the
 * polymorphic Translation table.
 */

const translationRepository = require('../repositories/translation.repository');

async function getTranslations(entityType, entityId, prismaClient) {
  return translationRepository.findByEntity(entityType, entityId, prismaClient);
}

async function getManyTranslations(entityType, entityIds, prismaClient) {
  return translationRepository.findManyByEntities(entityType, entityIds, prismaClient);
}

async function upsertTranslations(entityType, entityId, fields, prismaClient) {
  return translationRepository.upsertFieldTranslations(entityType, entityId, fields, prismaClient);
}

async function deleteTranslations(entityType, entityId, prismaClient) {
  return translationRepository.deleteByEntity(entityType, entityId, prismaClient);
}

function attachTranslations(entity, translations = [], language = 'en') {
  const safeTranslations = Array.isArray(translations) ? translations : [];
  const forLanguage = safeTranslations.filter((t) => t.language_code === language);
  const source = forLanguage.length > 0
    ? forLanguage
    : safeTranslations.filter((t) => t.language_code === 'en');

  const translated = source.reduce((acc, t) => {
    acc[t.field] = t.value;
    return acc;
  }, {});

  return { ...entity, ...translated };
}

function attachManyTranslations(entities = [], allTranslations = [], language = 'en') {
  const safeTranslations = Array.isArray(allTranslations) ? allTranslations : [];
  const translationsByEntity = safeTranslations.reduce((acc, t) => {
    if (!acc[t.entity_id]) acc[t.entity_id] = [];
    acc[t.entity_id].push(t);
    return acc;
  }, {});

  return (entities || []).map((entity) => {
    const entityTranslations = translationsByEntity[entity.id] || [];
    return attachTranslations(entity, entityTranslations, language);
  });
}

module.exports = {
  getTranslations,
  getManyTranslations,
  upsertTranslations,
  deleteTranslations,
  attachTranslations,
  attachManyTranslations,
};
