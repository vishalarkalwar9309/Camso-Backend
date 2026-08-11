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
 *   - findAdminById(adminId, prismaClient)       — finds admin by ID
 *   - findActiveAdminById(adminId, prismaClient) — finds active admin by ID with role & status
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing database query methods for admin_users.
 *
 * IMPORTED BY:
 *   src/core/middleware/adminGuard.js
 *   src/modules/admin-users/admin-users.service.js (Day 2)
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
};

module.exports = adminUsersRepository;
