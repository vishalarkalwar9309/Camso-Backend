'use strict';

/**
 * tests/unit/idValidation.test.js
 *
 * WHAT THIS FILE DOES:
 *   Unit tests for CUID validation schemas and validateCuid helper.
 */

const { cuidSchema, cuidRequired, cuidOptional, validateCuid } = require('../../src/core/utils/idValidation');
const ApiError = require('../../src/core/utils/ApiError');

describe('CUID ID Validation Utility Tests', () => {
  test('should accept valid CUID strings', () => {
    const validCuid = 'clh9200000000000000000000';
    const { error, value } = cuidRequired.validate(validCuid);
    expect(error).toBeUndefined();
    expect(value).toBe(validCuid);
  });

  test('should accept standard alphanumeric IDs between 10 and 36 characters', () => {
    const customId = 'mock_doc_id_12345';
    expect(validateCuid(customId)).toBe(customId);
  });

  test('should reject IDs shorter than 10 characters or non-strings', () => {
    expect(() => validateCuid('short')).toThrow(ApiError);
    expect(() => validateCuid(12345)).toThrow(ApiError);
  });

  test('should handle optional CUID schema with null or undefined', () => {
    const { error: errNull, value: valNull } = cuidOptional.validate(null);
    expect(errNull).toBeUndefined();
    expect(valNull).toBeNull();

    const { error: errUndef, value: valUndef } = cuidOptional.validate(undefined);
    expect(errUndef).toBeUndefined();
    expect(valUndef).toBeUndefined();
  });
});
