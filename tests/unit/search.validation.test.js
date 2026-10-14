'use strict';

const {
  searchQuerySchema,
  recentQuerySchema,
  popularQuerySchema,
} = require('../../src/modules/search/search.validation');

describe('search.validation schemas', () => {
  describe('searchQuerySchema', () => {
    it('validates a standard search query', () => {
      const { error, value } = searchQuerySchema.validate({
        q: 'tires',
        category: 'skid-steer',
        page: '1',
        pageSize: '10',
      });
      expect(error).toBeUndefined();
      expect(value.q).toBe('tires');
      expect(value.page).toBe(1);
      expect(value.pageSize).toBe(10);
    });

    it('allows empty query for filter-only browsing', () => {
      const { error, value } = searchQuerySchema.validate({ q: '' });
      expect(error).toBeUndefined();
      expect(value.q).toBe('');
    });

    it('rejects pageSize exceeding 100', () => {
      const { error } = searchQuerySchema.validate({ pageSize: 150 });
      expect(error).toBeDefined();
    });

    it('rejects page less than 1', () => {
      const { error } = searchQuerySchema.validate({ page: 0 });
      expect(error).toBeDefined();
    });
  });

  describe('recentQuerySchema', () => {
    it('validates recent search query limit', () => {
      const { error, value } = recentQuerySchema.validate({ limit: '15' });
      expect(error).toBeUndefined();
      expect(value.limit).toBe(15);
    });

    it('rejects limit exceeding 50', () => {
      const { error } = recentQuerySchema.validate({ limit: 100 });
      expect(error).toBeDefined();
    });
  });

  describe('popularQuerySchema', () => {
    it('validates popular search query limit', () => {
      const { error, value } = popularQuerySchema.validate({ limit: '5' });
      expect(error).toBeUndefined();
      expect(value.limit).toBe(5);
    });

    it('rejects limit exceeding 20', () => {
      const { error } = popularQuerySchema.validate({ limit: 50 });
      expect(error).toBeDefined();
    });
  });
});
