'use strict';

/**
 * search.service — Business logic for product search, ranking, and search aggregation.
 */

const repo = require('./search.repository');
const ApiError = require('../../core/utils/ApiError');

/**
 * Extract spec_* query parameters (e.g. spec_width=300mm -> { key: 'width', value: '300mm' }).
 *
 * @param {object} query
 * @returns {Array<{ key: string, value: string }>}
 */
function extractSpecFilters(query) {
  const specFilters = [];

  Object.keys(query).forEach((paramKey) => {
    if (paramKey.startsWith('spec_') && paramKey.length > 5) {
      const rawKey = paramKey.slice(5).trim();
      const val = query[paramKey];
      if (val !== undefined && val !== null && val !== '') {
        specFilters.push({
          key: rawKey.replace(/_/g, ' '),
          value: String(val).trim(),
        });
      }
    }
  });

  return specFilters;
}

/**
 * Normalize search query string.
 *
 * @param {string} raw
 * @returns {string}
 */
function normalizeQuery(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * Execute product search with 6-tier ranking, query logging, and popular aggregation.
 *
 * @param {object} queryParams
 * @param {{ userId?: string | null, deviceId?: string | null }} [authContext]
 * @returns {Promise<{ items: object[], total: number, query: string }>}
 */
async function search(queryParams, authContext = {}) {
  const { q, category, page = 1, pageSize = 20 } = queryParams;
  const normalizedQ = normalizeQuery(q);
  const specFilters = extractSpecFilters(queryParams);

  const { items, total } = await repo.searchRankedProducts({
    query: normalizedQ,
    categoryId: category || null,
    specFilters,
    page: Number(page),
    pageSize: Number(pageSize),
  });

  // If a search query was executed, record in search_logs and popular_searches
  if (normalizedQ) {
    const filtersMeta = {
      category: category || null,
      specFilters: specFilters.length > 0 ? specFilters : null,
    };

    // Concurrency-safe background writes (non-blocking)
    Promise.all([
      repo.logSearch({
        userId: authContext.userId || null,
        deviceId: authContext.deviceId || null,
        queryText: normalizedQ,
        filters: filtersMeta,
        resultsCount: total,
      }),
      repo.incrementPopularSearch(normalizedQ),
    ]).catch((err) => {
      // Log error internally without failing client response
      console.error('[SEARCH LOGGING ERROR]', err.message);
    });

    try {
      const { prisma } = require('../../config/database');
      if (process.env.NODE_ENV !== 'test' && prisma && prisma.userActivity && typeof prisma.userActivity.create === 'function') {
        prisma.userActivity.create({
          data: {
            user_id: authContext.userId || null,
            device_id: authContext.deviceId || null,
            activity_type: 'SEARCH',
            entity_type: 'SEARCH_QUERY',
            entity_id: normalizedQ,
            metadata: filtersMeta,
          },
        }).catch(() => {});
      }
    } catch (_) {}
  }

  return { items, total, query: normalizedQ };
}

/**
 * Retrieve recent search queries for authenticated user.
 *
 * @param {string} userId
 * @param {number} [limit=10]
 * @returns {Promise<object[]>}
 */
async function getRecentSearches(userId, limit = 10) {
  if (!userId) {
    throw ApiError.unauthorized('Authentication required to access recent searches.');
  }

  return repo.findRecentSearches(userId, limit);
}

/**
 * Retrieve aggregated popular search queries.
 *
 * @param {number} [limit=10]
 * @returns {Promise<object[]>}
 */
async function getPopularSearches(limit = 10) {
  return repo.findPopularSearches(limit);
}

module.exports = {
  extractSpecFilters,
  normalizeQuery,
  search,
  getRecentSearches,
  getPopularSearches,
};
