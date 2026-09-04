'use strict';

/**
 * authGuard — Express middleware that authenticates a request via Bearer JWT.
 *
 * Attaches req.user = { id, is_guest } from the verified JWT payload.
 *
 * SECURITY:
 *   Identity is derived EXCLUSIVELY from the verified JWT payload (decoded.sub).
 *   req.body, req.query, and req.params are NEVER consulted for identity.
 *   A client-supplied user_id is never trusted.
 *
 * Usage:
 *   router.get('/protected', authGuard, asyncHandler(controller.handler));
 */

const { verifyAccessToken } = require('../utils/tokenService');
const ApiError = require('../utils/ApiError');

function authGuard(req, res, next) {
  const authHeader = req.headers.authorization;

  // 1. Header must be present and match 'Bearer <token>'
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authentication required.'));
  }

  const token = authHeader.slice(7); // strip 'Bearer '

  if (!token) {
    return next(ApiError.unauthorized('Authentication required.'));
  }

  // 2. Verify the JWT
  try {
    const decoded = verifyAccessToken(token);

    // 3. Attach the principal — only sub and is_guest from the verified payload
    req.user = {
      id: decoded.sub,
      is_guest: decoded.is_guest,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Access token expired.'));
    }
    // JsonWebTokenError, NotBeforeError, or any other jwt failure
    return next(ApiError.unauthorized('Invalid access token.'));
  }
}

module.exports = authGuard;
