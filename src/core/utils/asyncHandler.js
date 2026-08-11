'use strict';

/**
 * src/core/utils/asyncHandler.js
 *
 * WHAT THIS FILE DOES:
 *   Wraps async Express route handlers to catch rejected promises
 *   and pass errors to Express's next() error pipeline.
 *
 * OVERALL DESIGN:
 *   Without this wrapper, an unhandled promise rejection in an async route handler
 *   would crash Node.js (or leave the request hanging in older versions).
 *   asyncHandler ensures all async errors reach errorHandler.js via next(err).
 *
 * ELEMENTS:
 *   asyncHandler(fn) — wraps an async function, catches errors, calls next(err)
 *
 * FINAL OUTPUT:
 *   module.exports = asyncHandler
 *
 * IMPORTED BY:
 *   All *.routes.js and *.admin.routes.js files (wrapping controller methods)
 *   Core route files (health, readiness)
 *
 * EXAMPLE:
 *   router.get('/documents', asyncHandler(documentsController.list));
 *
 * REFERENCE: Common Express async error handling pattern.
 */

/**
 * asyncHandler
 *
 * USE: Wraps an async route handler to forward any thrown/rejected errors to next().
 *
 * HOW IT WORKS:
 *   Returns a new function that calls fn(req, res, next).
 *   If fn returns a rejected promise (throws), .catch(next) forwards the error
 *   to Express's error handling middleware chain (errorHandler.js).
 *
 * CONCEPTS:
 *   Promise.catch delegation. Express error middleware contract (4 arguments).
 *
 * BEFORE: Async error would result in UnhandledPromiseRejection.
 * AFTER:  Error is forwarded to errorHandler.js via next(err).
 *
 * @param {Function} fn — async Express route handler (req, res, next) => Promise
 * @returns {Function}  — wrapped Express handler
 */
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
