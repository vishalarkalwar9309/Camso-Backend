'use strict';

/**
 * users.repository — Prisma operations for the users module.
 *
 * IMPORTANT: Only this file imports Prisma for the users module.
 */

const prisma = require('../../config/database');

/**
 * Find a user by their primary key.
 *
 * @param {string} id
 * @returns {Promise<import('@prisma/client').User | null>}
 */
async function findUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

/**
 * Update permitted user profile fields.
 *
 * @param {string} id
 * @param {{ display_name?: string, preferred_language?: string }} data
 * @returns {Promise<import('@prisma/client').User>}
 */
async function updateUser(id, data) {
  return prisma.user.update({ where: { id }, data });
}

module.exports = { findUserById, updateUser };
