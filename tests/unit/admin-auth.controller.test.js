'use strict';

/**
 * admin-auth.controller.test.js — Unit tests for Admin authentication controller response envelopes.
 */

const controller = require('../../src/modules/admin-auth/admin-auth.controller');
const service = require('../../src/modules/admin-auth/admin-auth.service');

jest.mock('../../src/modules/admin-auth/admin-auth.service');

describe('Admin Auth Controller (Response Compatibility Tests)', () => {
  let mockReq;
  let mockRes;
  let responseData;
  let statusCode;

  beforeEach(() => {
    responseData = null;
    statusCode = null;
    mockReq = {
      body: {},
      user: { id: 'admin-cuid-123' },
    };
    mockRes = {
      status: jest.fn().mockImplementation((code) => {
        statusCode = code;
        return mockRes;
      }),
      json: jest.fn().mockImplementation((payload) => {
        responseData = payload;
        return mockRes;
      }),
    };
    jest.clearAllMocks();
  });

  describe('POST /admin-auth/login handler', () => {
    it('returns both top-level tokens and nested tokens object with dual aliases', async () => {
      service.login.mockResolvedValue({
        tokens: {
          access_token: 'mock.admin.access.jwt',
          refresh_token: 'mock_admin_refresh_token_hex',
        },
        admin: {
          id: 'admin-cuid-123',
          email: 'demo.admin@camso.local',
          role: 'SUPER_ADMIN',
        },
      });

      mockReq.body = { email: 'demo.admin@camso.local', password: 'ValidPassword123!' };
      await controller.login(mockReq, mockRes);

      expect(statusCode).toBe(200);
      expect(responseData.success).toBe(true);

      // 1. Top-level backward compatibility and camelCase aliases
      expect(responseData.data.access_token).toBe('mock.admin.access.jwt');
      expect(responseData.data.refresh_token).toBe('mock_admin_refresh_token_hex');
      expect(responseData.data.accessToken).toBe('mock.admin.access.jwt');
      expect(responseData.data.refreshToken).toBe('mock_admin_refresh_token_hex');

      // 2. Nested tokens object compatibility
      expect(responseData.data.tokens).toBeDefined();
      expect(responseData.data.tokens.accessToken).toBe('mock.admin.access.jwt');
      expect(responseData.data.tokens.refreshToken).toBe('mock_admin_refresh_token_hex');
      expect(responseData.data.tokens.access_token).toBe('mock.admin.access.jwt');
      expect(responseData.data.tokens.refresh_token).toBe('mock_admin_refresh_token_hex');

      // 3. Admin user metadata
      expect(responseData.data.admin).toEqual({
        id: 'admin-cuid-123',
        email: 'demo.admin@camso.local',
        role: 'SUPER_ADMIN',
      });
    });
  });

  describe('POST /admin-auth/refresh handler', () => {
    it('returns both top-level tokens and nested tokens object with dual aliases', async () => {
      service.refresh.mockResolvedValue({
        tokens: {
          access_token: 'mock.refreshed.access.jwt',
          refresh_token: 'mock_refreshed_refresh_token_hex',
        },
      });

      mockReq.body = { refresh_token: 'valid_refresh_token' };
      await controller.refresh(mockReq, mockRes);

      expect(statusCode).toBe(200);
      expect(responseData.success).toBe(true);

      // 1. Top-level backward compatibility and camelCase aliases
      expect(responseData.data.access_token).toBe('mock.refreshed.access.jwt');
      expect(responseData.data.refresh_token).toBe('mock_refreshed_refresh_token_hex');
      expect(responseData.data.accessToken).toBe('mock.refreshed.access.jwt');
      expect(responseData.data.refreshToken).toBe('mock_refreshed_refresh_token_hex');

      // 2. Nested tokens object compatibility
      expect(responseData.data.tokens).toBeDefined();
      expect(responseData.data.tokens.accessToken).toBe('mock.refreshed.access.jwt');
      expect(responseData.data.tokens.refreshToken).toBe('mock_refreshed_refresh_token_hex');
      expect(responseData.data.tokens.access_token).toBe('mock.refreshed.access.jwt');
      expect(responseData.data.tokens.refresh_token).toBe('mock_refreshed_refresh_token_hex');
    });
  });
});
