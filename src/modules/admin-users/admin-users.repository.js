'use strict';

/**
 * src/modules/admin-users/admin-users.repository.js
 *
 * WHAT THIS FILE DOES:
 *   Repository module for database operations on the admin_users table.
 *   Provides data access for admin user lookup and active status check.
 *
 * OVERALL DESIGN:
 *   Follows the 5-tier architecture (Repositories are the ONLY layer that calls Prisma).
 *   Encapsulates all Prisma queries targeting admin_users.
 *   Accepts an optional `prismaClient` parameter to allow transactional or mock instances.
 *
 * ELEMENTS IN THIS FILE:
 *   - findAdminById(adminId, prismaClient)       — finds admin by ID (USED BY adminGuard — DO NOT MODIFY)
 *   - findAllAdminUsers(filters, pagination)    — paginated admin list (no password_hash)
 *   - findAdminUserDetail(id)                   — single admin detail (no password_hash)
 *   - findByEmail(email)                        — email lookup for uniqueness check
 *   - createAdminUser(data)                     — inserts new admin row
 *   - updateAdminUser(id, data)                 — updates role/is_active
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing database query methods for admin_users.
 *
 * IMPORTED BY:
 *   src/core/middleware/adminGuard.js            (findAdminById only)
 *   src/modules/admin-users/admin-users.service.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 3 & 4
 */

const { prisma } = require('../../config/database');

/**
 * adminUsersRepository
 *
 * USE: Data access layer for admin_users database queries.
 *
 * KEY DESIGN:
 *   Single point of database contact for admin accounts.
 *   Does NOT contain business logic or authorization decisions.
 */
const adminUsersRepository = {
  /**
   * findAdminById
   *
   * USE: Retrieves an admin user record by primary key ID.
   *      CRITICAL: This method is used by adminGuard.js. Its signature and return shape
   *      MUST NOT be changed without also updating adminGuard.js.
   *
   * HOW IT WORKS:
   *   Calls prisma.adminUser.findUnique() for the given admin ID.
   *   Selects ID, email, role, and active status.
   *
   * CONCEPTS:
   *   Prisma findUnique query. Repository encapsulation.
   *
   * PLACES IMPORTED AND USED:
   *   src/core/middleware/adminGuard.js
   *
   * FINAL OUTPUT:
   *   BEFORE: Unchecked admin ID.
   *   AFTER:  Returns admin object { id, email, role, is_active } or null if not found.
   *
   * @param {number} adminId — admin_users integer primary key
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<object|null>}
   */
  async findAdminById(adminId, prismaClient = prisma) {
    return prismaClient.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, role: true, is_active: true },
    });
  },

  /**
   * findAllAdminUsers
   *
   * USE: Returns paginated list of admin accounts (no password_hash).
   *
   * HOW IT WORKS:
   *   Builds where clause from optional role/is_active filters.
   *   password_hash explicitly excluded from select.
   *
   * @param {object} filters    — { role, is_active }
   * @param {object} pagination — { skip, take, sort }
   * @returns {Promise<{ total: number, data: Array }>}
   */
  async findAllAdminUsers(filters, pagination) {
    const { parseSort } = require('../../core/utils/pagination');
    const ALLOWED_SORT = ['id', 'email', 'role', 'is_active', 'created_at'];
    const where = {};
    if (filters.role) where.role = filters.role;
    if (typeof filters.is_active === 'boolean') where.is_active = filters.is_active;

    const { orderBy } = parseSort(pagination.sort, ALLOWED_SORT, 'id', 'asc');
    const [total, data] = await prisma.$transaction([
      prisma.adminUser.count({ where }),
      prisma.adminUser.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        select: { id: true, email: true, role: true, is_active: true },
      }),
    ]);
    return { total, data };
  },

  /**
   * findAdminUserDetail
   *
   * USE: Fetches a single admin account by PK (no password_hash).
   *
   * @param {number} id — admin_users PK
   * @returns {Promise<object|null>}
   */
  async findAdminUserDetail(id) {
    return prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, is_active: true },
    });
  },

  /**
   * findByEmail
   *
   * USE: Looks up an admin account by email address for uniqueness validation.
   *      Returns minimal data — only id and email (no password_hash).
   *
   * @param {string} email — normalized email address
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    return prisma.adminUser.findFirst({
      where: { email },
      select: { id: true, email: true },
    });
  },

  /**
   * createAdminUser
   *
   * USE: Inserts a new admin user row. Returns record without password_hash.
   *
   * @param {object} data — { email, password_hash, role, is_active }
   * @returns {Promise<object>} — { id, email, role, is_active }
   */
  async createAdminUser(data) {
    return prisma.adminUser.create({
      data,
      select: { id: true, email: true, role: true, is_active: true },
    });
  },

  /**
   * updateAdminUser
   *
   * USE: Updates admin account fields (role, is_active). Returns record without password_hash.
   *
   * @param {number} id   — admin_users PK
   * @param {object} data — { role?, is_active? }
   * @returns {Promise<object>} — { id, email, role, is_active }
   */
  async updateAdminUser(id, data) {
    return prisma.adminUser.update({
      where: { id },
      data,
      select: { id: true, email: true, role: true, is_active: true },
    });
  },
};

module.exports = adminUsersRepository;
