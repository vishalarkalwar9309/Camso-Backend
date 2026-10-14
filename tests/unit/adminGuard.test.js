'use strict';

/**
 * adminGuard and requireRole unit tests.
 *
 * Verifies that administrative routes enforce valid admin JWT tokens,
 * block standard user/guest tokens, and correctly apply role checks.
 */

const adminGuard = require('../../src/core/middleware/adminGuard');
const requireRole = require('../../src/core/middleware/requireRole');
const { generateAccessToken, generateAdminAccessToken } = require('../../src/core/utils/tokenService');
const ApiError = require('../../src/core/utils/ApiError');

describe('adminGuard middleware', () => {
  it('rejects request with missing Authorization header', () => {
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();

    adminGuard(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('rejects request with non-Bearer token', () => {
    const req = { headers: { authorization: 'Basic some-credentials' } };
    const res = {};
    const next = jest.fn();

    adminGuard(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('rejects regular mobile user token without admin role (security boundary)', () => {
    // Regular mobile user token only has sub and is_guest
    const userToken = generateAccessToken({ sub: 'user-cuid-123', is_guest: false });
    const req = { headers: { authorization: `Bearer ${userToken}` } };
    const res = {};
    const next = jest.fn();

    adminGuard(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Admin role required.');
  });

  it('rejects token with unauthorized role (e.g. DEALER or CUSTOMER)', () => {
    const customToken = generateAdminAccessToken({ sub: 'admin-1', email: 'dealer@test.com', role: 'DEALER' });
    const req = { headers: { authorization: `Bearer ${customToken}` } };
    const res = {};
    const next = jest.fn();

    adminGuard(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Admin role required.');
  });

  it('accepts valid admin token and populates req.user', () => {
    const adminToken = generateAdminAccessToken({ sub: 'admin-cuid-999', email: 'admin@ceat.com', role: 'CONTENT_ADMIN' });
    const req = { headers: { authorization: `Bearer ${adminToken}` } };
    const res = {};
    const next = jest.fn();

    adminGuard(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      id: 'admin-cuid-999',
      email: 'admin@ceat.com',
      role: 'CONTENT_ADMIN',
      is_admin: true,
    });
  });
});

describe('requireRole middleware', () => {
  it('allows access when user role matches allowed roles', () => {
    const middleware = requireRole('CONTENT_ADMIN', 'SUPER_ADMIN');
    const req = { user: { role: 'CONTENT_ADMIN' } };
    const res = {};
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('denies access (403 Forbidden) when user role is not allowed', () => {
    const middleware = requireRole('SUPER_ADMIN');
    const req = { user: { role: 'VIEWER' } };
    const res = {};
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Insufficient permissions for this operation.');
  });

  it('returns 401 Unauthorized if req.user or role is missing', () => {
    const middleware = requireRole('SUPER_ADMIN');
    const req = {};
    const res = {};
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });
});
