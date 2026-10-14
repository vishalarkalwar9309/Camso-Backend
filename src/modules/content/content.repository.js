'use strict';

/**
 * content.repository — Data access layer for app_content table.
 *
 * Only layer that interacts directly with Prisma for AppContent model.
 */

const prisma = require('../../config/database');

/**
 * Find active content/configuration by key.
 *
 * @param {string} key
 * @returns {Promise<import('@prisma/client').AppContent | null>}
 */
async function findActiveContentByKey(key) {
  return prisma.appContent.findFirst({
    where: { key: key.toLowerCase(), is_active: true },
  });
}

/**
 * Find all active configuration/content items.
 *
 * @returns {Promise<import('@prisma/client').AppContent[]>}
 */
async function findAllActiveContent() {
  return prisma.appContent.findMany({
    where: { is_active: true },
    orderBy: { key: 'asc' },
  });
}

/**
 * Find content by key for Admin CMS (includes inactive).
 *
 * @param {string} key
 * @returns {Promise<import('@prisma/client').AppContent | null>}
 */
async function findContentByKeyAdmin(key) {
  return prisma.appContent.findUnique({
    where: { key: key.toLowerCase() },
  });
}

/**
 * Upsert content/settings by key.
 *
 * @param {string} key
 * @param {object} data
 * @returns {Promise<import('@prisma/client').AppContent>}
 */
async function upsertContent(key, data) {
  const normalizedKey = key.toLowerCase();
  return prisma.appContent.upsert({
    where: { key: normalizedKey },
    update: data,
    create: {
      key: normalizedKey,
      title: data.title ?? null,
      content: data.content ?? null,
      extra: data.extra ?? null,
      is_active: data.is_active ?? true,
    },
  });
}

module.exports = {
  findActiveContentByKey,
  findAllActiveContent,
  findContentByKeyAdmin,
  upsertContent,
};
