'use strict';

/**
 * businessGuard.js
 *
 * 1. What this file does:
 *    Express middleware that verifies dealer, distributor, or OEM partner identities via Bearer JWT,
 *    attaching `req.businessUser` containing authenticated user claims and organization association.
 * 2. Overall design:
 *    Inspects the Authorization header, verifies signature and expiration, asserts business persona role
 *    membership (DEALER, DISTRIBUTOR, OEM_PARTNER), validates org affiliation, and returns typed errors.
 * 3. Elements in the file:
 *    - const BUSINESS_ROLES: Array of permitted business role strings.
 *    - function businessGuard: Express middleware function.
 * 4. Final output of the file:
 *    Exports the businessGuard middleware function.
 */

const { verifyAccessToken } = require('../utils/tokenService');
const ApiError = require('../utils/ApiError');

const BUSINESS_ROLES = ['DEALER', 'DISTRIBUTOR', 'OEM_PARTNER'];

/**
 * businessGuard
 *
 * 1. The use of function:
 *    Protects business portal and dealer/distributor endpoints from unauthorized or non-business callers.
 * 2. How does the specific function work:
 *    Extracts bearer token, decodes JWT, verifies role against BUSINESS_ROLES, asserts `decoded.org_id`,
 *    populates `req.businessUser`, and distinguishes token expiration from invalid token format.
 * 3. Concepts used in the function:
 *    Role-based access control, organizational tenancy enforcement, differentiated auth machine error codes.
 * 4. Places where this function is imported and used:
 *    Used in `src/modules/business/business.routes.js` and `src/modules/business-auth/business-auth.routes.js`.
 * 5. Final output of the function, before and after:
 *    Before: Express request with business bearer token.
 *    After: Populated `req.businessUser` on req, or 401/403 ApiError forwarded to next().
 */
function businessGuard(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Business authentication required.', 'UNAUTHORIZED'));
  }

  const token = authHeader.slice(7);
  if (!token) {
    return next(ApiError.unauthorized('Business authentication required.', 'UNAUTHORIZED'));
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
      return next(ApiError.unauthorized('Business access token expired.', 'TOKEN_EXPIRED'));
    }
    return next(ApiError.unauthorized('Invalid business access token.', 'INVALID_TOKEN'));
  }
}

module.exports = businessGuard;
