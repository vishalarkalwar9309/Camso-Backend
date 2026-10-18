'use strict';

/**
 * authGuard.js
 *
 * 1. What this file does:
 *    Express middleware that authenticates incoming HTTP requests via Bearer JWT tokens,
 *    populating `req.user` and `req.principal` with authenticated actor claims.
 * 2. Overall design:
 *    Inspects the HTTP Authorization header, verifies signature and expiration via tokenService,
 *    and produces differentiated, machine-readable ApiError responses (TOKEN_EXPIRED, INVALID_TOKEN, UNAUTHORIZED).
 * 3. Elements in the file:
 *    - function authGuard: Express middleware function.
 * 4. Final output of the file:
 *    Exports the authGuard middleware function.
 */

const { verifyAccessToken } = require('../utils/tokenService');
const ApiError = require('../utils/ApiError');

/**
 * authGuard
 *
 * 1. The use of function:
 *    Authenticates end users and guest devices accessing protected routes.
 * 2. How does the specific function work:
 *    Validates the presence of `Bearer <token>`, decodes claims via `verifyAccessToken()`,
 *    attaches sanitized context to `req.user` and `req.principal`, and catches `TokenExpiredError`
 *    to return explicit `TOKEN_EXPIRED` machine codes.
 * 3. Concepts used in the function:
 *    Bearer token parsing, cryptographically verified claims attachment, differentiated auth error codes.
 * 4. Places where this function is imported and used:
 *    Mounted across protected user routes, bookmark routes, activity routes, and calculation routes.
 * 5. Final output of the function, before and after:
 *    Before: Unauthenticated Express request with Authorization header.
 *    After: Authenticated Express request with req.user and req.principal populated, or 401 error forwarded to next().
 */
function authGuard(req, res, next) {
  const authHeader = req.headers.authorization;

  // 1. Header must be present and match 'Bearer <token>'
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authentication required.', 'UNAUTHORIZED'));
  }

  const token = authHeader.slice(7); // strip 'Bearer '

  if (!token) {
    return next(ApiError.unauthorized('Authentication required.', 'UNAUTHORIZED'));
  }

  // 2. Verify the JWT
  try {
    const decoded = verifyAccessToken(token);

    const userRole = decoded.role || (decoded.is_guest ? 'GUEST' : 'END_USER');
    req.user = {
      id: decoded.sub,
      is_guest: decoded.is_guest,
      role: userRole,
    };
    req.principal = {
      id: decoded.id !== undefined ? decoded.id : decoded.sub,
      type: decoded.type || (decoded.is_guest ? 'GUEST' : (decoded.role === 'CUSTOMER' ? 'END_USER' : 'END_USER')),
      role: userRole,
      is_guest: decoded.is_guest,
      deviceId: decoded.deviceId || req.headers['x-device-id'] || 'unknown_device',
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Access token expired.', 'TOKEN_EXPIRED'));
    }
    // JsonWebTokenError, NotBeforeError, or any other jwt failure
    return next(ApiError.unauthorized('Invalid access token.', 'INVALID_TOKEN'));
  }
}

module.exports = authGuard;
