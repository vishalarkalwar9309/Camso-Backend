'use strict';

/**
 * 1. What this file does:
 *    Express middleware that optionally inspects Authorization Bearer tokens,
 *    populating `req.user` and `req.principal` when valid tokens are provided without
 *    failing requests when authorization headers are omitted.
 * 2. Overall design:
 *    Supports endpoints accessible to both anonymous visitors and authenticated users
 *    (such as activity event ingestion, document metadata, or catalogue browsing).
 * 3. Elements in the file:
 *    - optionalAuthGuard: Express middleware function.
 * 4. Final output of the file:
 *    Exports middleware function that conditionally populates user session claims.
 */

const { verifyAccessToken } = require('../utils/tokenService');

/**
 * Express middleware for optional bearer authentication.
 *
 * 1. The use of function:
 *    Identifies caller claims when an access token is supplied, allowing anonymous requests to proceed.
 * 2. How does the specific function work:
 *    Checks if Authorization header begins with 'Bearer '. If present, extracts and verifies token via verifyAccessToken.
 *    If valid, assigns claims to req.user and req.principal. If absent or invalid, leaves req.user null and continues.
 * 3. Concepts used in the function:
 *    Optional authentication, graceful token degradation.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/activity/activity.routes.js and public telemetry endpoints.
 * 5. Final output of the function, before and after:
 *    Before: Express request with optional Authorization header.
 *    After: Express request with populated req.user (if valid token) or null req.user, passing control to next middleware.
 *
 * @param {object} req - Express request.
 * @param {object} res - Express response.
 * @param {Function} next - Express next middleware.
 */
function optionalAuthGuard(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    req.principal = null;
    return next();
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    req.user = null;
    req.principal = null;
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    const userRole = decoded.role || (decoded.is_guest ? 'GUEST' : 'END_USER');
    req.user = {
      id: decoded.sub,
      is_guest: decoded.is_guest,
      role: userRole,
      org_id: decoded.org_id || null,
      deviceId: decoded.deviceId || null,
    };
    req.principal = req.user;
  } catch (_) {
    // If optional token is expired or invalid, do not block public telemetry
    req.user = null;
    req.principal = null;
  }

  next();
}

module.exports = optionalAuthGuard;
