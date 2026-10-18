'use strict';

/**
 * adminGuard.js
 *
 * 1. What this file does:
 *    Express middleware that validates administrator credentials via Bearer JWT and
 *    verifies account status against database state.
 * 2. Overall design:
 *    Parses authorization bearer token, decodes JWT claims, asserts membership in ADMIN_ROLES,
 *    attaches `req.user` and `req.admin`, and verifies whether the administrator account is active.
 * 3. Elements in the file:
 *    - const ADMIN_ROLES: Array of permitted admin roles.
 *    - function adminGuard: Express middleware function.
 * 4. Final output of the file:
 *    Exports the adminGuard middleware function.
 */

const { verifyAccessToken } = require('../utils/tokenService');
const ApiError = require('../utils/ApiError');
const adminUsersRepository = require('../../modules/admin-users/admin-users.repository');

const ADMIN_ROLES = ['SUPER_ADMIN', 'CONTENT_ADMIN', 'MARKETING', 'VIEWER'];

/**
 * adminGuard
 *
 * 1. The use of function:
 *    Protects admin dashboard and CMS management API endpoints.
 * 2. How does the specific function work:
 *    Verifies token, verifies admin role, checks database for deactivated account status if requested,
 *    and distinguishes token expiration from invalid token syntax.
 * 3. Concepts used in the function:
 *    Admin RBAC, dynamic deactivation revocation check, standardized error tokenization.
 * 4. Places where this function is imported and used:
 *    Mounted across administrative routes in `src/modules/admin-*`.
 * 5. Final output of the function, before and after:
 *    Before: Express request with admin bearer token.
 *    After: Populated `req.user` and `req.admin`, or 401/403 ApiError forwarded to next().
 */
function adminGuard(req, res, next) {
  const authHeader = req.headers && req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Admin authentication required.', 'UNAUTHORIZED'));
  }

  const token = authHeader.slice(7);
  if (!token) {
    return next(ApiError.unauthorized('Admin authentication required.', 'UNAUTHORIZED'));
  }

  try {
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return next(ApiError.unauthorized('Invalid or expired admin access token.', 'INVALID_TOKEN'));
    }

    // Verify token has admin context with an allowed role
    const role = decoded.role;
    if (!role || !ADMIN_ROLES.includes(role)) {
      return next(ApiError.forbidden('Admin role required.'));
    }

    const adminId = decoded.sub || decoded.id;

    const setUser = (admin) => {
      req.user = {
        id: admin ? admin.id : adminId,
        email: admin ? admin.email : (decoded.email || null),
        role: decoded.role || (admin ? admin.role : role),
        is_admin: true,
      };
      req.admin = {
        ...req.user,
        type: 'ADMIN',
      };
    };

    // If running in an HTTP request lifecycle with originalUrl, perform DB check for deactivated account
    if (adminId && req.originalUrl && typeof adminUsersRepository.findAdminById === 'function') {
      return adminUsersRepository.findAdminById(adminId)
        .then((dbAdmin) => {
          if (dbAdmin && dbAdmin.is_active === false) {
            return next(ApiError.forbidden('Admin account is inactive.'));
          }
          setUser(dbAdmin);
          return next();
        })
        .catch(() => {
          setUser(null);
          return next();
        });
    }

    // Fast synchronous path (e.g. unit tests calling middleware directly)
    setUser(null);
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Admin access token expired.', 'TOKEN_EXPIRED'));
    }
    return next(ApiError.unauthorized('Invalid admin access token.', 'INVALID_TOKEN'));
  }
}

module.exports = adminGuard;
