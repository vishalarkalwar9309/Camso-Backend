'use strict';

/**
 * tests/unit/requireRole.test.js
 *
 * WHAT THIS FILE DOES:
 *   Unit tests for src/core/middleware/requireRole.js.
 *   Verifies role-based access control checking against req.admin.role.
 *
 * OVERALL DESIGN:
 *   Uses Jest to test requireRole middleware with allowed and forbidden role configurations.
 *
 * ELEMENTS IN THIS FILE:
 *   - Empty allowed roles configuration test
 *   - Unauthenticated req.admin missing test (401 response)
 *   - Forbidden role test (403 response)
 *   - Allowed role test (calls next)
 *
 * FINAL OUTPUT OF THE FILE:
 *   Jest test suite output validating requireRole middleware.
 */

const requireRole = require('../../src/core/middleware/requireRole');

describe('requireRole Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('throws Error at initialization if no roles are passed to factory', () => {
    expect(() => requireRole()).toThrow('[requireRole] At least one role must be specified.');
  });

  test('returns 401 unauthorized if req.admin is missing', () => {
    const middleware = requireRole('SUPER_ADMIN');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'Admin authentication required.',
      }),
    );
  });

  test('returns 403 forbidden if admin role is not in allowed roles list', () => {
    req.admin = { id: 1, role: 'VIEWER' };
    const middleware = requireRole('CONTENT_ADMIN', 'SUPER_ADMIN');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        type: 'FORBIDDEN',
      }),
    );
  });

  test('calls next() if admin role is included in allowed roles list', () => {
    req.admin = { id: 1, role: 'SUPER_ADMIN' };
    const middleware = requireRole('CONTENT_ADMIN', 'SUPER_ADMIN');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
