'use strict';

jest.mock('../../src/modules/search/search.repository');

const service = require('../../src/modules/search/search.service');
const repo = require('../../src/modules/search/search.repository');
const ApiError = require('../../src/core/utils/ApiError');

const USER_ID = 'test-user-cuid-1';

const MOCK_PRODUCT = {
  id: 'prod-cuid-1',
  pid: 'SKS-S1-10-16.5',
  name: 'SKS S1',
  slug: 'sks-s1',
  is_active: true,
  category: { id: 'cat-1', name: 'Skid Steer', slug: 'skid-steer' },
  images: [],
  specifications: [{ id: 'spec-1', spec_key: 'Width', spec_value: '300mm' }],
  rank_tier: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  repo.logSearch.mockResolvedValue({});
  repo.incrementPopularSearch.mockResolvedValue({});
});

describe('search.service', () => {
  describe('extractSpecFilters', () => {
    it('extracts query keys prefixed with spec_ into key-value pairs', () => {
      const query = {
        q: 'tires',
        spec_width: '300mm',
        spec_ply_rating: '10PR',
        page: '1',
      };
      const filters = service.extractSpecFilters(query);
      expect(filters).toEqual([
        { key: 'width', value: '300mm' },
        { key: 'ply rating', value: '10PR' },
      ]);
    });
  });

  describe('normalizeQuery', () => {
    it('trims and collapses whitespace in query string', () => {
      expect(service.normalizeQuery('  heavy   duty   tires  ')).toBe('heavy duty tires');
      expect(service.normalizeQuery('')).toBe('');
      expect(service.normalizeQuery(null)).toBe('');
    });
  });

  describe('search', () => {
    it('executes ranked search, passes normalized params, and logs non-empty queries', async () => {
      repo.searchRankedProducts.mockResolvedValue({ items: [MOCK_PRODUCT], total: 1 });

      const res = await service.search(
        { q: '  SKS   S1  ', category: 'skid-steer', spec_width: '300mm', page: 1, pageSize: 10 },
        { userId: USER_ID, deviceId: 'dev-1' }
      );

      expect(res.query).toBe('SKS S1');
      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);

      expect(repo.searchRankedProducts).toHaveBeenCalledWith({
        query: 'SKS S1',
        categoryId: 'skid-steer',
        specFilters: [{ key: 'width', value: '300mm' }],
        page: 1,
        pageSize: 10,
      });

      expect(repo.logSearch).toHaveBeenCalledWith({
        userId: USER_ID,
        deviceId: 'dev-1',
        queryText: 'SKS S1',
        filters: {
          category: 'skid-steer',
          specFilters: [{ key: 'width', value: '300mm' }],
        },
        resultsCount: 1,
      });

      expect(repo.incrementPopularSearch).toHaveBeenCalledWith('SKS S1');
    });

    it('does not log query when q is empty', async () => {
      repo.searchRankedProducts.mockResolvedValue({ items: [MOCK_PRODUCT], total: 1 });

      const res = await service.search({ q: '', category: 'skid-steer' });

      expect(res.query).toBe('');
      expect(repo.logSearch).not.toHaveBeenCalled();
      expect(repo.incrementPopularSearch).not.toHaveBeenCalled();
    });
  });

  describe('getRecentSearches', () => {
    it('returns recent searches for user', async () => {
      const mockLogs = [{ query_text: 'sks', last_searched_at: new Date(), results_count: 1 }];
      repo.findRecentSearches.mockResolvedValue(mockLogs);

      const res = await service.getRecentSearches(USER_ID, 5);
      expect(res).toEqual(mockLogs);
      expect(repo.findRecentSearches).toHaveBeenCalledWith(USER_ID, 5);
    });

    it('throws unauthorized if userId is missing', async () => {
      await expect(service.getRecentSearches(null)).rejects.toThrow(ApiError);
    });
  });

  describe('getPopularSearches', () => {
    it('returns aggregated popular searches with limit', async () => {
      const mockPopular = [{ query_text: 'telehandler', hit_count: 10 }];
      repo.findPopularSearches.mockResolvedValue(mockPopular);

      const res = await service.getPopularSearches(10);
      expect(res).toEqual(mockPopular);
      expect(repo.findPopularSearches).toHaveBeenCalledWith(10);
    });
  });
});
