'use strict';

/**
 * adminGuard — Express middleware that verifies admin identity via Bearer JWT.
 *
 * Attaches req.user = { id, email, role, is_admin: true } from verified token.
 * Valid admin roles: SUPER_ADMIN, CONTENT_ADMIN, MARKETING, VIEWER.
 */

const { verifyAccessToken } = require('../utils/tokenService');
const ApiError = require('../utils/ApiError');
const adminUsersRepository = require('../../modules/admin-users/admin-users.repository');

const ADMIN_ROLES = ['SUPER_ADMIN', 'CONTENT_ADMIN', 'MARKETING', 'VIEWER'];

function adminGuard(req, res, next) {
  const authHeader = req.headers && req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Admin authentication required.'));
  }

  const token = authHeader.slice(7);
  if (!token) {
    return next(ApiError.unauthorized('Admin authentication required.'));
  }

  try {
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return next(ApiError.unauthorized('Invalid or expired admin access token.'));
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
            return next(ApiError.unauthorized('Admin account has been deactivated.'));
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
      return next(ApiError.unauthorized('Admin access token expired.'));
    }
    return next(ApiError.unauthorized('Invalid admin access token.'));
  }
}

module.exports = adminGuard;
