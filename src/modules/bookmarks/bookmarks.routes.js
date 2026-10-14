'use strict';

const { Router } = require('express');
const authGuard = require('../../core/middleware/authGuard');
const asyncHandler = require('../../core/utils/asyncHandler');
const controller = require('./bookmarks.controller');
const {
  addBookmarkSchema,
  listBookmarksSchema,
  syncBookmarksSchema,
  bookmarkIdParamSchema,
  validate,
} = require('./bookmarks.validation');

const router = Router();

// All bookmark operations require a valid JWT (USER or GUEST)
router.use(authGuard);

// POST /api/v1/bookmarks/sync — Merge guest bookmarks into authenticated user account
// Must precede /:id to prevent matching 'sync' as an ID
router.post(
  '/sync',
  validate(syncBookmarksSchema, 'body'),
  asyncHandler(controller.syncBookmarks)
);

// GET /api/v1/bookmarks — List bookmarked products
router.get(
  '/',
  validate(listBookmarksSchema, 'query'),
  asyncHandler(controller.getBookmarks)
);

// POST /api/v1/bookmarks — Add a product bookmark
router.post(
  '/',
  validate(addBookmarkSchema, 'body'),
  asyncHandler(controller.addBookmark)
);

// DELETE /api/v1/bookmarks/:id — Remove a bookmark
router.delete(
  '/:id',
  validate(bookmarkIdParamSchema, 'params'),
  asyncHandler(controller.removeBookmark)
);

module.exports = router;
