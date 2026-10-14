'use strict';

/**
 * requireRole — Middleware factory restricting access to specified roles.
 *
 * Usage:
 *   router.get('/admin/categories', adminGuard, requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'), handler);
 *   router.post('/admin/categories', adminGuard, requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'), handler);
 */

const ApiError = require('../utils/ApiError');

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(ApiError.unauthorized('Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions for this operation.'));
    }

    next();
  };
}

module.exports = requireRole;
