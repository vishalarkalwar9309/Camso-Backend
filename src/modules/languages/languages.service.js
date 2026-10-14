'use strict';

/**
 * languages.service — Business logic for supported languages.
 */

const repo = require('./languages.repository');
const ApiError = require('../../core/utils/ApiError');
const auditService = require('../../core/services/auditService');

/**
 * GET /api/v1/languages — public list of active languages.
 *
 * @returns {Promise<object[]>}
 */
async function getActiveLanguages() {
  return repo.findActiveLanguages();
}

/**
 * GET /api/v1/admin/languages — admin list of all languages.
 *
 * @returns {Promise<object[]>}
 */
async function getAdminLanguages() {
  return repo.findAllLanguagesAdmin();
}

/**
 * POST /api/v1/admin/languages — create a new language with audit logging.
 *
 * @param {string} adminId
 * @param {object} data
 * @returns {Promise<object>}
 */
async function createLanguage(adminId, data) {
  const existing = await repo.findLanguageByCode(data.code);
  if (existing) {
    throw ApiError.badRequest(`Language with code '${data.code.toLowerCase()}' already exists.`);
  }

  const created = await repo.createLanguage(data);

  await auditService.record({
    actorId: adminId,
    action: 'CREATE',
    entityType: 'LANGUAGE',
    entityId: created.code,
    before: null,
    after: created,
  });

  return created;
}

/**
 * PATCH /api/v1/admin/languages/:code — update language with audit logging.
 *
 * @param {string} adminId
 * @param {string} code
 * @param {object} data
 * @returns {Promise<object>}
 */
async function updateLanguage(adminId, code, data) {
  const existing = await repo.findLanguageByCode(code);
  if (!existing) {
    throw ApiError.notFound('Language not found.');
  }

  const updated = await repo.updateLanguage(code, data);

  await auditService.record({
    actorId: adminId,
    action: 'UPDATE',
    entityType: 'LANGUAGE',
    entityId: updated.code,
    before: existing,
    after: updated,
  });

  return updated;
}

module.exports = {
  getActiveLanguages,
  getAdminLanguages,
  createLanguage,
  updateLanguage,
};
