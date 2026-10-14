'use strict';

/**
 * users.service — business logic for user profile endpoints.
 *
 * userId always comes from req.user.id (verified JWT payload).
 * Never from req.body, req.query, or req.params.
 */

const repo = require('./users.repository');
const ApiError = require('../../core/utils/ApiError');

/**
 * Build a safe user profile safe to send to clients.
 * Explicitly lists fields — password_hash is NEVER included.
 *
 * @param {import('@prisma/client').User} user
 * @returns {object}
 */
function safeUser(user) {
  return {
    id:                 user.id,
    email:              user.email,
    phone:              user.phone,
    display_name:       user.display_name,
    is_guest:           user.is_guest,
    role:               user.is_guest ? 'GUEST' : 'END_USER',
    user_type:          user.is_guest ? 'Guest' : 'End User',
    preferred_language: user.preferred_language,
    created_at:         user.created_at,
    updated_at:         user.updated_at,
  };
}

/**
 * Get the authenticated user's profile.
 *
 * @param {string} userId - from req.user.id (JWT payload)
 * @returns {Promise<object>} safeUser
 */
async function getMe(userId) {
  const user = await repo.findUserById(userId);
  if (!user) throw ApiError.notFound('User not found.');
  return safeUser(user);
}

/**
 * Update the authenticated user's permitted profile fields.
 *
 * Only display_name and preferred_language are permitted.
 * Any other fields are stripped by validation middleware before reaching here.
 *
 * @param {string} userId - from req.user.id (JWT payload)
 * @param {{ display_name?: string, preferred_language?: string }} data
 * @returns {Promise<object>} updated safeUser
 */
async function updateMe(userId, data) {
  const updated = await repo.updateUser(userId, data);
  return safeUser(updated);
}

module.exports = { getMe, updateMe };
