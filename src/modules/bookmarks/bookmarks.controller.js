'use strict';

const service = require('./bookmarks.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');

/**
 * POST /api/v1/bookmarks
 * Add a product bookmark for caller (user or guest).
 */
async function addBookmark(req, res, next) {
  try {
    const bookmark = await service.addBookmark(req.user, req.body);
    return sendSuccess(res, bookmark, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/bookmarks
 * List paginated bookmarked products for caller.
 */
async function getBookmarks(req, res, next) {
  try {
    const { items, pagination } = await service.getBookmarks(req.user, req.query);
    return sendSuccess(res, items, 200, pagination);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/bookmarks/:id
 * Remove a bookmark by bookmark ID or product ID.
 */
async function removeBookmark(req, res, next) {
  try {
    const result = await service.removeBookmark(req.user, {
      identifier: req.params.id,
      device_id: req.query.device_id,
    });
    return sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/bookmarks/sync
 * Merge guest bookmarks into authenticated account.
 */
async function syncBookmarks(req, res, next) {
  try {
    const guest_token = req.body?.guest_token || req.headers?.['x-guest-token'];
    const result = await service.syncBookmarks(req.user, {
      ...req.body,
      guest_token,
    });
    return sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  addBookmark,
  getBookmarks,
  removeBookmark,
  syncBookmarks,
};
