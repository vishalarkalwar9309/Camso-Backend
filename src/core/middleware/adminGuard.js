'use strict';

/**
 * src/core/middleware/adminGuard.js
 *
 * WHAT THIS FILE DOES:
 *   Express middleware that verifies an admin JWT and checks is_active status.
 *   Attaches decoded admin principal to req.admin on success.
 *
 * OVERALL DESIGN:
 *   All /admin/* routes use this middleware (after authGuard is excluded).
 *   Verifies the JWT type is 'ADMIN'. Checks that the admin account is still active.
 *   An inactive admin (is_active=false) cannot authenticate even with a valid JWT.
 *
 * ELEMENTS:
 *   adminGuard(req, res, next) — verifies admin JWT + active status
 *
 * FINAL OUTPUT:
 *   module.exports = adminGuard
 *
 * IMPORTED BY:
 *   src/routes/index.js (applied to all /admin/* routes as a group)
 *   All *.admin.routes.js files
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 5 (Admin Roles)
 *            docs/CAMSO_Backend_Plan_Aary.md Section 5 (Admin auth endpoints)
 */

const tokenService = require('../utils/tokenService');
const ApiError = require('../utils/ApiError');
const adminUsersRepository = require('../../modules/admin-users/admin-users.repository');

/**
 * adminGuard
 *
 * USE: Verifies admin JWT for all /admin/* routes.
 *
 * HOW IT WORKS:
 *   1. Reads Authorization Bearer header.
 *   2. Verifies token with tokenService.verifyAccessToken().
 *   3. Checks decoded.type === 'ADMIN'.
 *   4. Fetches admin_user via adminUsersRepository to verify is_active=true.
 *      (Prevents deactivated admin using a still-valid JWT.)
 *   5. Attaches { id, email, role, type: 'ADMIN' } to req.admin.
 *   6. Calls next() on success, next(ApiError) on failure.
 *
 * CONCEPTS:
 *   JWT verification. Admin deactivation enforcement. Repository pattern.
 *   Short-circuit: invalid token returns 401 before DB call.
 *
 * BEFORE: req.admin undefined.
 * AFTER:  req.admin = { id, email, role, type: 'ADMIN' } or 401/403 returned.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function adminGuard(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Authorization header missing or malformed.'));
    }

    const token = authHeader.slice(7);
    const decoded = tokenService.verifyAccessToken(token);

    if (!decoded) {
      return next(ApiError.unauthorized('Invalid or expired access token.'));
    }

    if (decoded.type !== 'ADMIN') {
      return next(ApiError.unauthorized('This endpoint requires an admin access token.'));
    }

    // Verify admin is still active via repository layer
    // (handles the case where admin was deactivated after token issuance)
    const admin = await adminUsersRepository.findAdminById(decoded.id);

    if (!admin) {
      return next(ApiError.unauthorized('Admin account not found.'));
    }

    if (!admin.is_active) {
      return next(ApiError.unauthorized('Admin account has been deactivated.'));
    }

    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'ADMIN',
    };

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = adminGuard;
