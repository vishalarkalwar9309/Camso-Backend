'use strict';

/**
 * adminGuard — Express middleware that verifies admin identity via Bearer JWT.
 *
 * Attaches req.user = { id, email, role, is_admin: true } from verified token.
 * Valid admin roles: SUPER_ADMIN, CONTENT_ADMIN, MARKETING, VIEWER.
 */

const { verifyAccessToken } = require('../utils/tokenService');
const ApiError = require('../utils/ApiError');

const ADMIN_ROLES = ['SUPER_ADMIN', 'CONTENT_ADMIN', 'MARKETING', 'VIEWER'];

function adminGuard(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Admin authentication required.'));
  }

  const token = authHeader.slice(7);
  if (!token) {
    return next(ApiError.unauthorized('Admin authentication required.'));
  }

  try {
    const decoded = verifyAccessToken(token);

    // Verify token has admin context with an allowed role
    const role = decoded.role;
    if (!role || !ADMIN_ROLES.includes(role)) {
      return next(ApiError.forbidden('Admin role required.'));
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email || null,
      role,
      is_admin: true,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Admin access token expired.'));
    }
    return next(ApiError.unauthorized('Invalid admin access token.'));
  }
}

module.exports = adminGuard;
