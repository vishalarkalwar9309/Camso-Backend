'use strict';

/**
 * pagination — shared query parameter parser for list endpoints.
 *
 * Parses page, pageSize, and sort from req.query and returns
 * Prisma-compatible skip/take/orderBy values.
 *
 * API contract (from backend plan Section 8):
 *   page     — 1-indexed, default 1, minimum 1
 *   pageSize — default 20, maximum 100
 *   sort     — field name; prefix with '-' for descending (e.g. '-createdAt')
 */

const PAGE_DEFAULT = 1;
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;
const SORT_DEFAULT = 'createdAt';

/**
 * Parse pagination parameters from Express query string.
 *
 * @param {object} query - req.query
 * @param {string} [defaultSort] - Default sort field (defaults to 'createdAt')
 * @returns {{ skip: number, take: number, orderBy: object, page: number, pageSize: number }}
 */
function parsePagination(query, defaultSort = SORT_DEFAULT) {
  const page = Math.max(PAGE_DEFAULT, parseInt(query.page, 10) || PAGE_DEFAULT);
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, parseInt(query.pageSize, 10) || PAGE_SIZE_DEFAULT)
  );
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const sortParam = query.sort || defaultSort;
  const isDescending = sortParam.startsWith('-');
  const sortField = isDescending ? sortParam.slice(1) : sortParam;
  const orderBy = { [sortField]: isDescending ? 'desc' : 'asc' };

  return { skip, take, orderBy, page, pageSize };
}

/**
 * Build the meta object for a paginated response.
 *
 * @param {number} page
 * @param {number} pageSize
 * @param {number} total - Total record count from database
 * @returns {{ page: number, pageSize: number, total: number, totalPages: number }}
 */
function buildMeta(page, pageSize, total) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

module.exports = { parsePagination, buildMeta };
