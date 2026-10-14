'use strict';

/**
 * search.controller — HTTP request handlers for search endpoints.
 */

const service = require('./search.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');

async function search(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

    const authContext = {
      userId: req.user?.id || null,
      deviceId: req.headers['x-device-id'] || null,
    };

    const { items, total, query } = await service.search(req.query, authContext);

    const totalPages = Math.ceil(total / pageSize);

    return sendSuccess(
      res,
      {
        query,
        items,
      },
      200,
      {
        page,
        pageSize,
        total,
        totalPages,
      }
    );
  } catch (err) {
    next(err);
  }
}

async function getRecentSearches(req, res, next) {
  try {
    const userId = req.user?.id;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const data = await service.getRecentSearches(userId, limit);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

async function getPopularSearches(req, res, next) {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const data = await service.getPopularSearches(limit);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  search,
  getRecentSearches,
  getPopularSearches,
};
