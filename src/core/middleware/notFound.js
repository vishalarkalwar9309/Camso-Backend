'use strict';

/**
 * notFound — catch-all middleware for unmatched routes.
 *
 * Registered after all routes in app.js.
 * Passes a 404 ApiError to the error handler.
 */

const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
