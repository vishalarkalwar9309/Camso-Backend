'use strict';

/**
 * businessGuard — Express middleware that verifies dealer or distributor identity via Bearer JWT.
 *
 * Attaches req.businessUser = { id, email, role, organization_id } from verified token.
 * Valid business roles: DEALER, DISTRIBUTOR.
 */

const { verifyAccessToken } = require('../utils/tokenService');
const ApiError = require('../utils/ApiError');

const BUSINESS_ROLES = ['DEALER', 'DISTRIBUTOR', 'OEM_PARTNER'];

function businessGuard(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Business authentication required.'));
  }

  const token = authHeader.slice(7);
  if (!token) {
    return next(ApiError.unauthorized('Business authentication required.'));
  }

  try {
    const decoded = verifyAccessToken(token);

    // Verify token has business context with allowed role and organization_id
    const role = decoded.role;
    if (!role || !BUSINESS_ROLES.includes(role)) {
      return next(ApiError.forbidden('Business role (DEALER, DISTRIBUTOR, or OEM_PARTNER) required.'));
    }

    if (!decoded.org_id) {
      return next(ApiError.forbidden('Organization association required.'));
    }

    req.businessUser = {
      id: decoded.sub,
      email: decoded.email || null,
      role,
      organization_id: decoded.org_id,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Business access token expired.'));
    }
    return next(ApiError.unauthorized('Invalid business access token.'));
  }
}

module.exports = businessGuard;
