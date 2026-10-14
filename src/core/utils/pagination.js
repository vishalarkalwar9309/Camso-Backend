'use strict';

/**
 * src/core/utils/pagination.js
 *
 * Shared query parameter parser for list endpoints.
 */

const PAGE_DEFAULT = 1;
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;
const SORT_DEFAULT = 'created_at:desc';

/**
 * Parse pagination parameters from Express query string.
 * Supports string defaultSort or defaults object { page, pageSize, sort }.
 */
function parsePagination(query = {}, defaults = {}) {
  const defaultPage = (typeof defaults === 'object' && defaults.page) || PAGE_DEFAULT;
  const defaultSize = (typeof defaults === 'object' && defaults.pageSize) || PAGE_SIZE_DEFAULT;

  const page = Math.max(1, parseInt(query.page, 10) || defaultPage);
  const rawPageSize = parseInt(query.pageSize, 10) || defaultSize;
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, rawPageSize));
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  let sortParam;
  if (typeof defaults === 'string') {
    sortParam = query.sort || defaults;
  } else if (typeof defaults === 'object' && defaults.sort) {
    sortParam = query.sort || defaults.sort;
  } else {
    sortParam = query.sort || SORT_DEFAULT;
  }

  const isDescending = sortParam.startsWith('-');
  const sortField = isDescending ? sortParam.slice(1) : sortParam;
  const orderBy = { [sortField]: isDescending ? 'desc' : 'asc' };

  return { skip, take, orderBy, page, pageSize, sort: sortParam };
}

/**
 * parseSort
 *
 * @param {string} [sortParam]
 * @param {Array<string>} allowedFields
 * @param {string} defaultField
 * @param {'asc'|'desc'} [defaultDir='desc']
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

  if (allowedFields.length > 0 && !allowedFields.includes(field)) {
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
 * Build the meta object for a paginated response.
 */
function buildMeta(page, pageSize, total) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

const buildPaginationMeta = buildMeta;

module.exports = {
  parsePagination,
  parseSort,
  buildMeta,
  buildPaginationMeta,
};
