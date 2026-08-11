'use strict';

/**
 * src/core/utils/pagination.js
 *
 * WHAT THIS FILE DOES:
 *   Provides utilities for parsing pagination and sorting query parameters
 *   and computing pagination metadata envelopes for list API responses.
 *
 * OVERALL DESIGN:
 *   Consistent pagination and sorting across ALL list endpoints.
 *   Every list endpoint uses page/pageSize/sort from query string.
 *   Supports both sort=-field (prefix minus for desc) and sort=field:desc / sort=field:asc notations.
 *   Enforces allow-lists on sortable fields to prevent arbitrary Prisma field injection.
 *
 * PAGINATION & SORT CONTRACT (master plan Section 8):
 *   Query params: page (default 1), pageSize (default 20, max 100), sort (e.g. "created_at:desc" or "-created_at")
 *   Response meta: { page, pageSize, total, totalPages }
 *
 * ELEMENTS:
 *   parsePagination(query, defaults) — parses page, pageSize, skip, take, sort
 *   parseSort(sortParam, allowedFields, defaultField, defaultDir) — parses & validates sort parameter
 *   buildPaginationMeta(page, pageSize, total) — builds the meta envelope
 *
 * FINAL OUTPUT:
 *   module.exports = { parsePagination, parseSort, buildPaginationMeta }
 *
 * IMPORTED BY:
 *   All *.repository.js and *.service.js files handling paginated lists
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8 (Pagination & Sorting)
 */

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE = 1;

/**
 * parseSort
 *
 * USE: Parses and validates a client-supplied sort string against an allow-list of fields.
 *
 * HOW IT WORKS:
 *   1. Checks prefix notation: "-field" -> desc, "+field" or "field" -> asc.
 *   2. Checks colon notation: "field:desc" -> desc, "field:asc" -> asc.
 *   3. Verifies field is in allowedFields list.
 *   4. Falls back to defaultField and defaultDir if invalid or unallowed.
 *
 * CONCEPTS: Allow-list validation, prefix & colon sort syntax parsing.
 *
 * @param {string} [sortParam] — raw query sort parameter (e.g. "-created_at" or "created_at:desc")
 * @param {Array<string>} allowedFields — list of permitted sortable field names
 * @param {string} defaultField — fallback field name (e.g. "created_at")
 * @param {'asc'|'desc'} [defaultDir='desc'] — fallback direction
 * @returns {{ field: string, direction: 'asc'|'desc', orderBy: object }}
 */
function parseSort(sortParam, allowedFields = [], defaultField = 'created_at', defaultDir = 'desc') {
  if (!sortParam || typeof sortParam !== 'string') {
    return {
      field: defaultField,
      direction: defaultDir,
      orderBy: { [defaultField]: defaultDir },
    };
  }

  const trimmed = sortParam.trim();
  let field = trimmed;
  let direction = defaultDir;

  if (trimmed.startsWith('-')) {
    field = trimmed.slice(1);
    direction = 'desc';
  } else if (trimmed.startsWith('+')) {
    field = trimmed.slice(1);
    direction = 'asc';
  } else if (trimmed.includes(':')) {
    const [f, dir] = trimmed.split(':');
    field = f;
    direction = dir && dir.toLowerCase() === 'asc' ? 'asc' : 'desc';
  }

  if (!allowedFields.includes(field)) {
    return {
      field: defaultField,
      direction: defaultDir,
      orderBy: { [defaultField]: defaultDir },
    };
  }

  return {
    field,
    direction,
    orderBy: { [field]: direction },
  };
}

/**
 * parsePagination
 *
 * USE: Parses and validates pagination parameters from Express req.query.
 *
 * @param {object} query — req.query object
 * @param {object} [defaults] — override defaults { page, pageSize, sort }
 * @returns {{ page: number, pageSize: number, skip: number, take: number, sort: string }}
 */
function parsePagination(query = {}, defaults = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || defaults.page || DEFAULT_PAGE);
  const rawPageSize = parseInt(query.pageSize, 10) || defaults.pageSize || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawPageSize));
  const sort = query.sort || defaults.sort || 'created_at:desc';

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    sort,
  };
}

/**
 * buildPaginationMeta
 *
 * USE: Builds the pagination meta object included in list responses.
 *
 * @param {number} page
 * @param {number} pageSize
 * @param {number} total — total record count from database
 * @returns {{ page: number, pageSize: number, total: number, totalPages: number }}
 */
function buildPaginationMeta(page, pageSize, total) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

module.exports = { parsePagination, parseSort, buildPaginationMeta };
