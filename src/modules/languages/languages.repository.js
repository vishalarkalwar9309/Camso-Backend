'use strict';

/**
 * languages.repository — Data access layer for languages table.
 *
 * Only layer that interacts directly with Prisma for Language model.
 */

const prisma = require('../../config/database');

/**
 * Find all active languages ordered by sort_order.
 *
 * @returns {Promise<import('@prisma/client').Language[]>}
 */
async function findActiveLanguages() {
  return prisma.language.findMany({
    where: { is_active: true },
    orderBy: { sort_order: 'asc' },
  });
}

/**
 * Find all languages for Admin CMS (includes inactive).
 *
 * @returns {Promise<import('@prisma/client').Language[]>}
 */
async function findAllLanguagesAdmin() {
  return prisma.language.findMany({
    orderBy: { sort_order: 'asc' },
  });
}

/**
 * Find a language by its primary key code.
 *
 * @param {string} code
 * @returns {Promise<import('@prisma/client').Language | null>}
 */
async function findLanguageByCode(code) {
  return prisma.language.findUnique({
    where: { code: code.toLowerCase() },
  });
}

/**
 * Create a new language.
 *
 * @param {object} data
 * @returns {Promise<import('@prisma/client').Language>}
 */
async function createLanguage(data) {
  return prisma.language.create({
    data: {
      ...data,
      code: data.code.toLowerCase(),
    },
  });
}

/**
 * Update an existing language.
 *
 * @param {string} code
 * @param {object} data
 * @returns {Promise<import('@prisma/client').Language>}
 */
async function updateLanguage(code, data) {
  return prisma.language.update({
    where: { code: code.toLowerCase() },
    data,
  });
}

module.exports = {
  findActiveLanguages,
  findAllLanguagesAdmin,
  findLanguageByCode,
  createLanguage,
  updateLanguage,
};
