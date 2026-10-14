'use strict';

/**
 * src/core/repositories/auditLog.repository.js
 *
 * Repository module for database operations on the audit_logs table.
 */

const { prisma } = require('../../config/database');

const auditLogRepository = {
  /**
   * createAuditLog
   * Inserts one audit log record into audit_logs.
   *
   * @param {object} data
   * @param {object} [prismaClient=prisma]
   * @returns {Promise<object>}
   */
  async createAuditLog(data, prismaClient = prisma) {
    return prismaClient.auditLog.create({ data });
  },
};

module.exports = auditLogRepository;
