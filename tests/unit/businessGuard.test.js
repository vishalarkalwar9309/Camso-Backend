'use strict';

/**
 * businessGuard.test.js — Unit tests for Dealer & Distributor JWT verification middleware.
 */

const businessGuard = require('../../src/core/middleware/businessGuard');
const requireBusinessRole = require('../../src/core/middleware/requireBusinessRole');
const {
  generateAccessToken,
  generateAdminAccessToken,
  generateBusinessAccessToken,
} = require('../../src/core/utils/tokenService');
const ApiError = require('../../src/core/utils/ApiError');

describe('businessGuard & requireBusinessRole Middleware (Unit Tests)', () => {
  describe('businessGuard', () => {
    it('rejects missing Authorization header with 401', () => {
      const req = { headers: {} };
      const res = {};
      const next = jest.fn();

      businessGuard(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    it('rejects regular customer token lacking business role with 403', () => {
      const customerToken = generateAccessToken({ sub: 'user-123', is_guest: false });
      const req = { headers: { authorization: `Bearer ${customerToken}` } };
      const res = {};
      const next = jest.fn();

      businessGuard(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
      expect(next.mock.calls[0][0].message).toMatch(/business role/i);
    });

    it('rejects admin token with 403', () => {
      const adminToken = generateAdminAccessToken({ sub: 'admin-1', email: 'admin@ceat.com', role: 'SUPER_ADMIN' });
      const req = { headers: { authorization: `Bearer ${adminToken}` } };
      const res = {};
      const next = jest.fn();

      businessGuard(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });

    it('accepts valid DEALER business token and populates req.businessUser', () => {
      const dealerToken = generateBusinessAccessToken({
        sub: 'dealer-user-1',
        email: 'dealer@test.com',
        role: 'DEALER',
        org_id: 'org-dealer-101',
      });
      const req = { headers: { authorization: `Bearer ${dealerToken}` } };
      const res = {};
      const next = jest.fn();

      businessGuard(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.businessUser).toEqual({
        id: 'dealer-user-1',
        email: 'dealer@test.com',
        role: 'DEALER',
        organization_id: 'org-dealer-101',
      });
    });

    it('accepts valid DISTRIBUTOR business token and populates req.businessUser', () => {
      const distToken = generateBusinessAccessToken({
        sub: 'dist-user-1',
        email: 'dist@test.com',
        role: 'DISTRIBUTOR',
        org_id: 'org-dist-202',
      });
      const req = { headers: { authorization: `Bearer ${distToken}` } };
      const res = {};
      const next = jest.fn();

      businessGuard(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.businessUser.role).toBe('DISTRIBUTOR');
      expect(req.businessUser.organization_id).toBe('org-dist-202');
    });
  });

  describe('requireBusinessRole', () => {
    it('allows DEALER to access DEALER-protected endpoint', () => {
      const middleware = requireBusinessRole('DEALER');
      const req = { businessUser: { role: 'DEALER', organization_id: 'org-1' } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('denies DISTRIBUTOR from accessing DEALER-protected endpoint (403 Forbidden)', () => {
      const middleware = requireBusinessRole('DEALER');
      const req = { businessUser: { role: 'DISTRIBUTOR', organization_id: 'org-2' } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
      expect(next.mock.calls[0][0].message).toMatch(/restricted to DEALER/i);
    });

    it('allows DISTRIBUTOR to access DISTRIBUTOR-protected endpoint', () => {
      const middleware = requireBusinessRole('DISTRIBUTOR');
      const req = { businessUser: { role: 'DISTRIBUTOR', organization_id: 'org-2' } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('denies DEALER from accessing DISTRIBUTOR-protected endpoint (403 Forbidden)', () => {
      const middleware = requireBusinessRole('DISTRIBUTOR');
      const req = { businessUser: { role: 'DEALER', organization_id: 'org-1' } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
      expect(next.mock.calls[0][0].message).toMatch(/restricted to DISTRIBUTOR/i);
    });
  });
});
