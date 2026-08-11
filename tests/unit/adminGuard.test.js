'use strict';

/**
 * tests/unit/adminGuard.test.js
 *
 * WHAT THIS FILE DOES:
 *   Unit tests for src/core/middleware/adminGuard.js.
 *   Verifies Bearer token extraction, JWT validation, admin user lookup via repository,
 *   and active status enforcement.
 *
 * OVERALL DESIGN:
 *   Uses Jest to test adminGuard middleware with mock req, res, next, and mock repository.
 *
 * ELEMENTS IN THIS FILE:
 *   - Missing/malformed header test
 *   - Invalid token test
 *   - Non-admin token test
 *   - Inactive admin user test (401 response)
 *   - Active admin user test (attaches req.admin and calls next)
 *
 * FINAL OUTPUT OF THE FILE:
 *   Jest test suite output validating adminGuard security checks.
 */

const adminGuard = require('../../src/core/middleware/adminGuard');
const tokenService = require('../../src/core/utils/tokenService');
const adminUsersRepository = require('../../src/modules/admin-users/admin-users.repository');

jest.mock('../../src/modules/admin-users/admin-users.repository');

describe('adminGuard Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('rejects request with missing Authorization header', async () => {
    await adminGuard(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'Authorization header missing or malformed.',
      }),
    );
  });

  test('rejects request with invalid JWT token', async () => {
    req.headers.authorization = 'Bearer invalid-token';

    await adminGuard(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'Invalid or expired access token.',
      }),
    );
  });

  test('rejects request with non-admin JWT token', async () => {
    const userToken = tokenService.generateTokenPair({ id: 1, type: 'USER' }).accessToken;
    req.headers.authorization = `Bearer ${userToken}`;

    await adminGuard(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'This endpoint requires an admin access token.',
      }),
    );
  });

  test('rejects request if admin is deactivated (is_active = false)', async () => {
    const adminToken = tokenService.generateTokenPair({ id: 2, type: 'ADMIN' }).accessToken;
    req.headers.authorization = `Bearer ${adminToken}`;

    adminUsersRepository.findAdminById.mockResolvedValue({
      id: 2,
      email: 'inactive@camso.com',
      role: 'CONTENT_ADMIN',
      is_active: false,
    });

    await adminGuard(req, res, next);

    expect(adminUsersRepository.findAdminById).toHaveBeenCalledWith(2);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'Admin account has been deactivated.',
      }),
    );
  });

  test('allows request and populates req.admin if admin is active (is_active = true)', async () => {
    const adminToken = tokenService.generateTokenPair({ id: 3, type: 'ADMIN' }).accessToken;
    req.headers.authorization = `Bearer ${adminToken}`;

    adminUsersRepository.findAdminById.mockResolvedValue({
      id: 3,
      email: 'active@camso.com',
      role: 'SUPER_ADMIN',
      is_active: true,
    });

    await adminGuard(req, res, next);

    expect(adminUsersRepository.findAdminById).toHaveBeenCalledWith(3);
    expect(req.admin).toEqual({
      id: 3,
      email: 'active@camso.com',
      role: 'SUPER_ADMIN',
      type: 'ADMIN',
    });
    expect(next).toHaveBeenCalledWith();
  });
});
