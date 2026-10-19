'use strict';

/**
 * src/modules/audit-logs/audit-logs.repository.js
 *
 * 1. What this file does:
 *    Database access layer for querying immutable administrative audit logs from the audit_logs table.
 * 2. Overall design:
 *    Uses Prisma ORM to query audit logs with multi-column filtering and pagination. Read-only.
 * 3. Elements in the file:
 *    - listAuditLogs(filters, pagination): queries audit logs with count.
 * 4. Final output of the file:
 *    Exports repository object with database query methods.
 */

const { prisma } = require('../../config/database');
const { parseSort } = require('../../core/utils/pagination');

const ALLOWED_SORT_FIELDS = ['created_at', 'action', 'entity_type', 'actor_email'];

/**
 * listAuditLogs
 *
 * 1. The use of function:
 *    Queries audit log records matching filter parameters with offset pagination.
 * 2. How does the specific function work:
 *    Constructs Prisma where clause matching actor, action, entity type, and date bounds.
 *    Executes count and findMany in a single database round-trip.
 * 3. Concepts used in the function:
 *    Prisma transactions, offset pagination, SQL indexing optimization.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/audit-logs/audit-logs.service.js.
 * 5. Final output of the function, before and after:
 *    Before: Database query criteria.
 *    After: [totalCount, auditLogRecordsArray].
 *
 * @param {object} filters
 * @param {object} pagination
 * @returns {Promise<[number, Array<object>]>}
 */
async function listAuditLogs(filters = {}, pagination = {}) {
  const where = {};

  if (filters.action) {
    where.action = filters.action;
  }
  if (filters.entity_type) {
    where.entity_type = filters.entity_type;
  }
  if (filters.actor_id) {
    where.actor_id = String(filters.actor_id);
  }
  if (filters.actor_email) {
    where.actor_email = { contains: filters.actor_email, mode: 'insensitive' };
  }
  if (filters.from_date || filters.to_date) {
    where.created_at = {};
    if (filters.from_date) where.created_at.gte = new Date(filters.from_date);
    if (filters.to_date) where.created_at.lte = new Date(filters.to_date);
  }

  const { orderBy } = parseSort(pagination.sort, ALLOWED_SORT_FIELDS, 'created_at', 'desc');

  return prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip: pagination.skip || 0,
      take: pagination.take || 25,
      orderBy,
      select: {
        id: true,
        actor_id: true,
        actor_email: true,
        action: true,
        entity_type: true,
        entity_id: true,
        details: true,
        changes: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
      },
    }),
  ]);
}

module.exports = {
  listAuditLogs,
};
