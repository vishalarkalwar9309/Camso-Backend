'use strict';

/**
 * src/core/middleware/requireRole.js
 *
 * WHAT THIS FILE DOES:
 *   Express middleware factory that enforces role-based access control
 *   on admin routes. Requires adminGuard to run first (req.admin must exist).
 *
 * OVERALL DESIGN:
 *   Called as requireRole('SUPER_ADMIN') or requireRole('CONTENT_ADMIN', 'SUPER_ADMIN').
 *   Checks req.admin.role against the list of allowed roles.
 *   Generic — takes role strings, no feature-specific knowledge.
 *
 * ROLES (from master plan Section 5):
 *   SUPER_ADMIN    — everything
 *   CONTENT_ADMIN  — CRUD on documents, testimonials, FAQs, dealers, categories, products
 *   MARKETING      — notifications and campaigns only
 *   VIEWER         — read-only on all /admin/*
 *
 * ELEMENTS:
 *   requireRole(...roles) — returns Express middleware
 *
 * FINAL OUTPUT:
 *   module.exports = requireRole
 *
 * IMPORTED BY:
 *   All *.admin.routes.js files (on write/delete/publish endpoints)
 *
 * EXAMPLE:
 *   router.post('/documents', adminGuard, requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'), handler)
 *   router.get('/audit-logs', adminGuard, requireRole('SUPER_ADMIN'), handler)
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 5 (Roles)
 */

const ApiError = require('../utils/ApiError');

/**
 * requireRole
 *
 * USE: Middleware factory for role-based access control on admin routes.
 *
 * HOW IT WORKS:
 *   Returns a middleware function that reads req.admin.role and checks
 *   it against the list of allowed roles passed to the factory.
 *   Throws ApiError.forbidden() if the role is not permitted.
 *
 * CONCEPTS:
 *   Middleware factory pattern. Role-based access control (RBAC).
 *   Must run AFTER adminGuard (relies on req.admin being set).
 *
 * BEFORE: req.admin is set by adminGuard. Role not yet verified.
 * AFTER:  Request proceeds if role is allowed, 403 returned if not.
 *
 * @param {...string} allowedRoles — role strings that may access this endpoint
 * @returns {Function} — Express middleware (req, res, next)
 */
function requireRole(...allowedRoles) {
  if (allowedRoles.length === 0) {
    throw new Error('[requireRole] At least one role must be specified.');
  }

  return function (req, res, next) {
    if (!req.admin) {
      // Safety check: adminGuard must run before requireRole
      return next(ApiError.unauthorized('Admin authentication required.'));
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return next(
        ApiError.forbidden(
          `This action requires one of the following roles: ${allowedRoles.join(', ')}. ` +
            `Your current role is: ${req.admin.role}.`,
        ),
      );
    }

    return next();
  };
}

module.exports = requireRole;
