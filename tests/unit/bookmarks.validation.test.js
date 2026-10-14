'use strict';

const {
  addBookmarkSchema,
  listBookmarksSchema,
  syncBookmarksSchema,
  bookmarkIdParamSchema,
} = require('../../src/modules/bookmarks/bookmarks.validation');

describe('Bookmarks Validation Schemas', () => {
  describe('addBookmarkSchema', () => {
    it('accepts valid payload with product_id only', () => {
      const { error, value } = addBookmarkSchema.validate({
        product_id: 'prod-uuid-123',
      });
      expect(error).toBeUndefined();
      expect(value.product_id).toBe('prod-uuid-123');
    });

    it('accepts valid payload with product_id and device_id', () => {
      const { error, value } = addBookmarkSchema.validate({
        product_id: 'prod-uuid-123',
        device_id: 'device-xyz-999',
      });
      expect(error).toBeUndefined();
      expect(value.product_id).toBe('prod-uuid-123');
      expect(value.device_id).toBe('device-xyz-999');
    });

    it('rejects missing product_id', () => {
      const { error } = addBookmarkSchema.validate({});
      expect(error).toBeDefined();
      expect(error.details[0].message).toMatch(/product_id is required/i);
    });

    it('rejects empty product_id', () => {
      const { error } = addBookmarkSchema.validate({ product_id: '   ' });
      expect(error).toBeDefined();
    });

    it('rejects device_id exceeding 100 characters', () => {
      const { error } = addBookmarkSchema.validate({
        product_id: 'prod-123',
        device_id: 'a'.repeat(101),
      });
      expect(error).toBeDefined();
    });
  });

  describe('listBookmarksSchema', () => {
    it('applies defaults for page, pageSize, and sort', () => {
      const { error, value } = listBookmarksSchema.validate({});
      expect(error).toBeUndefined();
      expect(value.page).toBe(1);
      expect(value.pageSize).toBe(20);
      expect(value.sort).toBe('desc');
    });

    it('accepts custom valid page, pageSize, and sort', () => {
      const { error, value } = listBookmarksSchema.validate({
        page: 2,
        pageSize: 50,
        sort: 'asc',
        device_id: 'dev-1',
      });
      expect(error).toBeUndefined();
      expect(value.page).toBe(2);
      expect(value.pageSize).toBe(50);
      expect(value.sort).toBe('asc');
      expect(value.device_id).toBe('dev-1');
    });

    it('rejects page less than 1', () => {
      const { error } = listBookmarksSchema.validate({ page: 0 });
      expect(error).toBeDefined();
    });

    it('rejects pageSize greater than 100', () => {
      const { error } = listBookmarksSchema.validate({ pageSize: 101 });
      expect(error).toBeDefined();
    });
  });

  describe('syncBookmarksSchema', () => {
    it('accepts valid guest_token without device_id', () => {
      const { error, value } = syncBookmarksSchema.validate({
        guest_token: 'valid.jwt.token',
      });
      expect(error).toBeUndefined();
      expect(value.guest_token).toBe('valid.jwt.token');
    });

    it('accepts valid guest_token with optional device_id', () => {
      const { error, value } = syncBookmarksSchema.validate({
        guest_token: 'valid.jwt.token',
        device_id: 'guest-device-123',
      });
      expect(error).toBeUndefined();
      expect(value.guest_token).toBe('valid.jwt.token');
      expect(value.device_id).toBe('guest-device-123');
    });

    it('rejects missing guest_token', () => {
      const { error } = syncBookmarksSchema.validate({});
      expect(error).toBeDefined();
      expect(error.details[0].message).toMatch(/guest_token is required/i);
    });

    it('rejects empty guest_token', () => {
      const { error } = syncBookmarksSchema.validate({ guest_token: '   ' });
      expect(error).toBeDefined();
    });

    it('rejects device_id exceeding 100 characters', () => {
      const { error } = syncBookmarksSchema.validate({
        guest_token: 'valid.jwt.token',
        device_id: 'a'.repeat(101),
      });
      expect(error).toBeDefined();
    });
  });

  describe('bookmarkIdParamSchema', () => {
    it('accepts valid ID', () => {
      const { error, value } = bookmarkIdParamSchema.validate({
        id: 'bm-uuid-1',
      });
      expect(error).toBeUndefined();
      expect(value.id).toBe('bm-uuid-1');
    });

    it('rejects missing ID', () => {
      const { error } = bookmarkIdParamSchema.validate({});
      expect(error).toBeDefined();
    });
  });
});
