'use strict';

/**
 * asyncHandler — wraps an async route handler.
 *
 * Express 5 natively propagates async rejections to the next() error handler,
 * so this wrapper is technically redundant on Express 5. It is retained because:
 *   1. It makes the async pattern explicit and readable.
 *   2. It insulates the codebase against any future Express version change.
 *   3. It is referenced in the backend architecture plan.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 *
 * @param {Function} fn - async route handler (req, res, next)
 * @returns {Function} Express route handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
