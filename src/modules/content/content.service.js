'use strict';

/**
 * content.service — Business logic for backend-controlled content and system settings.
 */

const repo = require('./content.repository');
const ApiError = require('../../core/utils/ApiError');
const auditService = require('../../core/services/auditService');

/**
 * GET /api/v1/content/:key — public active content / configuration.
 *
 * @param {string} key
 * @returns {Promise<object>}
 */
async function getPublicContentByKey(key) {
  const item = await repo.findActiveContentByKey(key);
  if (!item) {
    throw ApiError.notFound(`Content for key '${key}' not found.`);
  }
  return item;
}

/**
 * GET /api/v1/content — public list of all active configurations / content.
 *
 * @returns {Promise<object[]>}
 */
async function getAllPublicContent() {
  return repo.findAllActiveContent();
}

/**
 * GET /api/v1/admin/content/:key — Admin detail view (includes inactive).
 *
 * @param {string} key
 * @returns {Promise<object>}
 */
async function getAdminContentByKey(key) {
  const item = await repo.findContentByKeyAdmin(key);
  if (!item) {
    throw ApiError.notFound(`Content for key '${key}' not found.`);
  }
  return item;
}

/**
 * PUT /api/v1/admin/content/:key — update content/settings with audit logging.
 *
 * @param {string} adminId
 * @param {string} key
 * @param {object} data
 * @returns {Promise<object>}
 */
async function updateContent(adminId, key, data) {
  const existing = await repo.findContentByKeyAdmin(key);

  const updated = await repo.upsertContent(key, data);

  await auditService.record({
    actorId: adminId,
    action: existing ? 'UPDATE' : 'CREATE',
    entityType: 'APP_CONTENT',
    entityId: updated.key,
    before: existing,
    after: updated,
  });

  return updated;
}

module.exports = {
  getPublicContentByKey,
  getAllPublicContent,
  getAdminContentByKey,
  updateContent,
};
