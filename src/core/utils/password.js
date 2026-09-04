'use strict';

/**
 * password — bcrypt hash and compare helpers.
 *
 * Centralises all password operations. No business logic.
 * BCRYPT_ROUNDS comes from env — never hardcoded here.
 */

const bcrypt = require('bcrypt');
const env = require('../../config/env');

/**
 * Hash a plaintext password.
 * @param {string} plaintext
 * @returns {Promise<string>} bcrypt hash
 */
async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, env.BCRYPT_ROUNDS);
}

/**
 * Compare a plaintext password against a stored bcrypt hash.
 * @param {string} plaintext
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function comparePassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

module.exports = { hashPassword, comparePassword };
