'use strict';

/**
 * src/core/middleware/authGuard.js
 *
 * WHAT THIS FILE DOES:
 *   Express middleware that verifies a user JWT (principal type: USER or GUEST).
 *   Attaches decoded principal to req.principal on success.
 *
 * OVERALL DESIGN:
 *   Used on routes requiring end-user authentication (e.g. POST /feedback, bookmarks).
 *   Does NOT handle admin authentication — that is adminGuard.js.
 *   Rejects with 401 if token is missing, invalid, or expired.
 *
 * ELEMENTS:
 *   authGuard(req, res, next) — verifies user JWT, attaches req.principal
 *
 * FINAL OUTPUT:
 *   module.exports = authGuard
 *
 * IMPORTED BY:
 *   src/modules/auth/*.routes.js (Vishal's modules)
 *   src/modules/feedback/feedback.routes.js (POST /feedback requires USER JWT)
 *   src/modules/bookmarks/*.routes.js (Vishal's module)
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 2 (Auth: JWT only)
 *            docs/CAMSO_Backend_Plan.md Section 8 (Identity: JWT only)
 */

const tokenService = require('../utils/tokenService');
const ApiError = require('../utils/ApiError');

/**
 * authGuard
 *
 * USE: Verifies the Authorization Bearer JWT for end-user routes.
 *
 * HOW IT WORKS:
 *   1. Reads the Authorization header (format: "Bearer <token>").
 *   2. Verifies the token using tokenService.verifyAccessToken().
 *   3. On success → attaches decoded payload to req.principal.
 *   4. On failure → throws ApiError.unauthorized().
 *
 * CONCEPTS:
 *   Bearer token authentication. JWT verification.
 *   req.principal is the standard place for authenticated principal data.
 *
 * BEFORE: req.principal undefined. Request may or may not have auth.
 * AFTER:  req.principal = { id, type: 'USER'|'GUEST', ... } or 401 returned.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authGuard(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authorization header missing or malformed.'));
  }

  const token = authHeader.slice(7);
  const decoded = tokenService.verifyAccessToken(token);

  if (!decoded) {
    return next(ApiError.unauthorized('Invalid or expired access token.'));
  }

  // Ensure this is a user token (not an admin token)
  if (decoded.type === 'ADMIN') {
    return next(ApiError.unauthorized('Admin tokens cannot be used on user endpoints.'));
  }

  req.principal = decoded;
  return next();
}

module.exports = authGuard;
