'use strict';

/**
 * src/modules/admin-users/admin-users.service.js
 *
 * WHAT THIS FILE DOES:
 *   Business logic for admin-user management. SUPER_ADMIN only.
 *   Handles email uniqueness, password hashing, role validation,
 *   deactivation, and audit logging.
 *
 * OVERALL DESIGN:
 *   Security-critical module. password_hash is NEVER returned to callers.
 *   bcrypt is used for password hashing (same library as admin-auth).
 *   adminUsersRepository.findAdminById() contract is preserved (used by adminGuard).
 *
 * ELEMENTS:
 *   listAdminUsers   — paginated list (no password_hash)
 *   getAdminUserById — single record (no password_hash)
 *   createAdminUser  — email uniqueness, bcrypt hash, audit CREATE
 *   updateAdminUser  — role/is_active update, audit UPDATE
 *
 * FINAL OUTPUT:
 *   module.exports = adminUsersService
 *
 * IMPORTED BY:
 *   admin-users.controller.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 5 (Roles), Section 7 (admin_users table)
 *            docs/CAMSO_Backend_Plan_Aary.md Section 5 (admin-user endpoints)
 */

const adminUsersRepository = require('./admin-users.repository');
const auditService = require('../../core/services/auditService');
const ApiError = require('../../core/utils/ApiError');
const bcrypt = require('bcrypt');
const { parsePagination, buildPaginationMeta } = require('../../core/utils/pagination');

const VALID_ROLES = ['SUPER_ADMIN', 'CONTENT_ADMIN', 'MARKETING', 'VIEWER'];
const BCRYPT_ROUNDS = 12;

/**
 * adminUsersService
 *
 * USE: Service for SUPER_ADMIN-only admin-user management operations.
 *
 * KEY DESIGN:
 *   - password_hash is explicitly excluded from all return values.
 *   - Role validation rejects anything outside the authoritative 4-role enum.
 *   - Deactivation sets is_active=false (soft delete); the admin cannot log in
 *     afterward (adminGuard checks is_active).
 *   - findAdminById() on the repository is unchanged (adminGuard depends on it).
 */
const adminUsersService = {
  /**
   * listAdminUsers
   *
   * USE: Returns paginated list of admin accounts without password_hash.
   *
   * @param {object} query — req.query (page, pageSize, sort, is_active, role)
   * @returns {Promise<{ data: Array, pagination: object }>}
   */
  async listAdminUsers(query) {
    const { page, pageSize, skip, take, sort } = parsePagination(query);
    const filters = {};
    if (query.role) filters.role = query.role;
    if (query.is_active !== undefined) {
      filters.is_active = query.is_active === 'true' || query.is_active === true;
    }

    const { total, data } = await adminUsersRepository.findAllAdminUsers(filters, { skip, take, sort });
    return { data, pagination: buildPaginationMeta(page, pageSize, total) };
  },

  /**
   * getAdminUserById
   *
   * USE: Returns a single admin account by ID without password_hash.
   *
   * @param {number} id — admin_users PK
   * @returns {Promise<object>}
   */
  async getAdminUserById(id) {
    const admin = await adminUsersRepository.findAdminUserDetail(id);
    if (!admin) throw ApiError.notFound(`Admin user with ID ${id} not found.`);
    return admin;
  },

  /**
   * createAdminUser
   *
   * USE: Creates a new admin account with hashed password. Audits CREATE.
   *
   * HOW IT WORKS:
   *   1. Validates required fields (email, password, role).
   *   2. Validates role against authoritative enum.
   *   3. Checks email uniqueness.
   *   4. Hashes password with bcrypt (BCRYPT_ROUNDS).
   *   5. Inserts via repository.
   *   6. Returns created record WITHOUT password_hash.
   *   7. Audits CREATE.
   *
   * CONCEPTS: bcrypt, email uniqueness check, audit logging, password_hash exclusion.
   *
   * @param {object} body         — { email, password, role, is_active? }
   * @param {object} auditContext — req.auditContext
   * @returns {Promise<object>}   — created admin user (no password_hash)
   */
  async createAdminUser(body, auditContext) {
    const { email, password, role, is_active = true } = body;

    if (!email || !email.trim()) throw ApiError.validation('email is required.');
    if (!password || password.length < 8) throw ApiError.validation('password must be at least 8 characters.');
    if (!role) throw ApiError.validation('role is required.');
    if (!VALID_ROLES.includes(role)) {
      throw ApiError.validation(`role must be one of: ${VALID_ROLES.join(', ')}.`);
    }

    // Check email uniqueness
    const existing = await adminUsersRepository.findByEmail(email.toLowerCase().trim());
    if (existing) throw ApiError.conflict('An admin account with this email already exists.');

    // Hash password
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const created = await adminUsersRepository.createAdminUser({
      email: email.toLowerCase().trim(),
      password_hash,
      role,
      is_active,
    });

    await auditService.record({
      actorId: auditContext.actorId,
      action: 'CREATE',
      entityType: 'ADMIN_USER',
      entityId: created.id,
      before: null,
      after: { id: created.id, email: created.email, role: created.role, is_active: created.is_active },
      ip: auditContext.ip,
      userAgent: auditContext.userAgent,
    });

    return created;
  },

  /**
   * updateAdminUser
   *
   * USE: Updates admin account role and/or is_active status. Audits UPDATE.
   *
   * HOW IT WORKS:
   *   1. Fetches current state for before snapshot.
   *   2. Validates role if provided.
   *   3. Applies update (only role and is_active — not email or password).
   *   4. Audits UPDATE.
   *
   * CONCEPTS: Restricted update fields (no email/password changes via this endpoint).
   *   Deactivation (is_active=false) prevents future logins via adminGuard.
   *
   * @param {number} id           — admin_users PK
   * @param {object} body         — { role?, is_active? }
   * @param {object} auditContext — req.auditContext
   * @returns {Promise<object>}   — updated admin user (no password_hash)
   */
  async updateAdminUser(id, body, auditContext) {
    const before = await adminUsersRepository.findAdminUserDetail(id);
    if (!before) throw ApiError.notFound(`Admin user with ID ${id} not found.`);

    const { role, is_active } = body;

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      throw ApiError.validation(`role must be one of: ${VALID_ROLES.join(', ')}.`);
    }

    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    if (Object.keys(updateData).length === 0) {
      throw ApiError.validation('At least one field (role or is_active) is required for update.');
    }

    const after = await adminUsersRepository.updateAdminUser(id, updateData);

    await auditService.record({
      actorId: auditContext.actorId,
      action: 'UPDATE',
      entityType: 'ADMIN_USER',
      entityId: id,
      before,
      after,
      ip: auditContext.ip,
      userAgent: auditContext.userAgent,
    });

    return after;
  },
};

module.exports = adminUsersService;
