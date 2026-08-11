'use strict';

/**
 * tests/unit/apiError.test.js
 *
 * WHAT THIS FILE DOES:
 *   Unit tests for src/core/utils/ApiError.js.
 *   Verifies operational error creation and static factory functions.
 *
 * OVERALL DESIGN:
 *   Jest unit tests covering status codes, error types, details, and isOperational flag.
 *
 * ELEMENTS IN THIS FILE:
 *   - ApiError constructor test suite
 *   - Static factories (notFound, unauthorized, forbidden, validation, internal, conflict)
 *
 * FINAL OUTPUT OF THE FILE:
 *   Jest test suite output validating ApiError factory behaviors.
 */

const ApiError = require('../../src/core/utils/ApiError');

describe('ApiError Unit Tests', () => {
  test('ApiError constructor sets parameters correctly', () => {
    const err = new ApiError(400, 'BAD_REQUEST', 'Bad input', { field: 'name' });
    expect(err.statusCode).toBe(400);
    expect(err.type).toBe('BAD_REQUEST');
    expect(err.message).toBe('Bad input');
    expect(err.details).toEqual({ field: 'name' });
    expect(err.isOperational).toBe(true);
  });

  test('ApiError.notFound creates 404 NOT_FOUND error', () => {
    const err = ApiError.notFound('Item missing');
    expect(err.statusCode).toBe(404);
    expect(err.type).toBe('NOT_FOUND');
    expect(err.message).toBe('Item missing');
  });

  test('ApiError.unauthorized creates 401 UNAUTHORIZED error', () => {
    const err = ApiError.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.type).toBe('UNAUTHORIZED');
  });

  test('ApiError.forbidden creates 403 FORBIDDEN error', () => {
    const err = ApiError.forbidden();
    expect(err.statusCode).toBe(403);
    expect(err.type).toBe('FORBIDDEN');
  });

  test('ApiError.validation creates 422 VALIDATION_ERROR with details', () => {
    const details = [{ field: 'email', message: 'Required' }];
    const err = ApiError.validation('Invalid data', details);
    expect(err.statusCode).toBe(422);
    expect(err.type).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual(details);
  });
});
