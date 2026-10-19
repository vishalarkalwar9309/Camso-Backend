'use strict';

/**
 * src/modules/audit-logs/audit-logs.service.js
 *
 * 1. What this file does:
 *    Business logic service for querying immutable audit logs for administrative oversight.
 * 2. Overall design:
 *    Validates query criteria, delegates pagination parsing and repository execution,
 *    and structures the paginated response metadata.
 * 3. Elements in the file:
 *    - listAuditLogs(query): retrieves filtered audit logs with pagination metadata.
 * 4. Final output of the file:
 *    Exports service object containing audit log business logic methods.
 */

const repository = require('./audit-logs.repository');
const { parsePagination, buildPaginationMeta } = require('../../core/utils/pagination');

/**
 * listAuditLogs
 *
 * 1. The use of function:
 *    Retrieves paginated audit log entries matching administrative search filters.
 * 2. How does the specific function work:
 *    Parses query filters and pagination parameters from the incoming query object,
 *    queries the audit logs repository, and packages the result with pagination metadata.
 * 3. Concepts used in the function:
 *    Offset pagination, query filtering, defensive defaults.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/audit-logs/audit-logs.controller.js.
 * 5. Final output of the function, before and after:
 *    Before: Query parameter object containing filters (actor_email, action, entity_type, dates) and page/pageSize.
 *    After: Object containing { items: Array<object>, pagination: { page, pageSize, total, totalPages } }.
 *
 * @param {object} query - Express request query parameters.
 * @returns {Promise<{ items: Array<object>, pagination: object }>}
 */
async function listAuditLogs(query = {}) {
  const pagination = parsePagination(query, {
    page: 1,
    pageSize: 25,
    sort: '-created_at',
  });

  const filters = {
    action: query.action || undefined,
    entity_type: query.entity_type || undefined,
    actor_id: query.actor_id || undefined,
    actor_email: query.actor_email ? String(query.actor_email).trim() : undefined,
    from_date: query.from_date || undefined,
    to_date: query.to_date || undefined,
  };

  const [total, items] = await repository.listAuditLogs(filters, pagination);

  return {
    items,
    pagination: buildPaginationMeta(pagination.page, pagination.pageSize, total),
  };
}

module.exports = {
  listAuditLogs,
};
