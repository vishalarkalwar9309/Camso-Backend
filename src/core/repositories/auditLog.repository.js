'use strict';

/**
 * src/core/repositories/auditLog.repository.js
 *
 * WHAT THIS FILE DOES:
 *   Repository module for database operations on the audit_logs table.
 *   Provides data access methods for appending audit log records.
 *
 * OVERALL DESIGN:
 *   Follows the 5-tier architecture (Repositories are the ONLY layer that calls Prisma).
 *   Encapsulates all Prisma queries targeting audit_logs.
 *   Accepts an optional `prismaClient` parameter to allow mock or transaction scopes.
 *
 * ELEMENTS IN THIS FILE:
 *   - createAuditLog(data, prismaClient) — inserts an audit log row into PostgreSQL
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing database persistence methods for audit_logs.
 *
 * IMPORTED BY:
 *   src/core/services/auditService.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 11 (Audit architecture)
 */

const { prisma } = require('../../config/database');

/**
 * auditLogRepository
 *
 * USE: Data access layer for audit_logs database table.
 *
 * KEY DESIGN:
 *   Encapsulates Prisma write operations for audit records.
 *   Does NOT construct audit metadata or catch service-level exceptions.
 */
const auditLogRepository = {
  /**
   * createAuditLog
   *
   * USE: Inserts one audit log record into audit_logs.
   *
   * @param {object} data — audit log row data { actor_type, actor_id, action, entity_type, entity_id, changes, ip_address, user_agent }
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<object>}
   */
  async createAuditLog(data, prismaClient = prisma) {
    return prismaClient.auditLog.create({ data });
  },
};

module.exports = auditLogRepository;
