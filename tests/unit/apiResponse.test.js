'use strict';

/**
 * tests/unit/apiResponse.test.js
 *
 * WHAT THIS FILE DOES:
 *   Unit tests for src/core/utils/ApiResponse.js.
 *   Verifies success and paginated response shaping.
 *
 * OVERALL DESIGN:
 *   Uses Jest to test static methods on ApiResponse with mock Express response object.
 *
 * ELEMENTS IN THIS FILE:
 *   - ApiResponse success test suite
 *   - ApiResponse paginated test suite
 *
 * FINAL OUTPUT OF THE FILE:
 *   Jest test suite results validating API response envelope compliance.
 */

const ApiResponse = require('../../src/core/utils/ApiResponse');

describe('ApiResponse Unit Tests', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  test('ApiResponse.success returns 200 and standard envelope by default', () => {
    const data = { id: 1, name: 'Test' };
    ApiResponse.success(mockRes, data);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data,
    });
  });

  test('ApiResponse.success supports custom status code and meta', () => {
    const data = { id: 1 };
    const meta = { version: '1.0' };
    ApiResponse.success(mockRes, data, 201, meta);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data,
      meta,
    });
  });

  test('ApiResponse.paginated builds meta envelope correctly', () => {
    const list = [{ id: 1 }, { id: 2 }];
    const pagination = { page: 1, pageSize: 10, total: 25, totalPages: 3 };
    ApiResponse.paginated(mockRes, list, pagination);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: list,
      meta: {
        page: 1,
        pageSize: 10,
        total: 25,
        totalPages: 3,
      },
    });
  });
});
