'use strict';

/**
 * requireBusinessRole — Middleware factory restricting access to specified business roles (DEALER, DISTRIBUTOR).
 *
 * Usage:
 *   router.get('/dealer/portal', businessGuard, requireBusinessRole('DEALER'), handler);
 *   router.get('/distributor/portal', businessGuard, requireBusinessRole('DISTRIBUTOR'), handler);
 */

const ApiError = require('../utils/ApiError');

function requireBusinessRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.businessUser || !req.businessUser.role) {
      return next(ApiError.unauthorized('Business authentication required.'));
    }

    if (!allowedRoles.includes(req.businessUser.role)) {
      return next(ApiError.forbidden(`Access restricted to ${allowedRoles.join(' or ')}.`));
    }

    next();
  };
}

module.exports = requireBusinessRole;
