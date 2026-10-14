'use strict';

const service = require('../../src/modules/analytics/analytics.service');
const repo = require('../../src/modules/analytics/analytics.repository');

jest.mock('../../src/modules/analytics/analytics.repository');

describe('Analytics Service (Unit Tests)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates summary, top searches, and most bookmarked products with safe limit', async () => {
    repo.getCatalogueSummary.mockResolvedValue({
      total_products: 7,
      total_categories: 6,
      total_bookmarks: 10,
      total_searches_logged: 25,
    });
    repo.getTopSearches.mockResolvedValue([
      { query_text: 'telehandler', hit_count: 12, last_updated: new Date() },
    ]);
    repo.getMostBookmarkedProducts.mockResolvedValue([
      { product_id: 'p-1', pid: 'CAM-1', name: 'Tire 1', bookmark_count: 5 },
    ]);

    const result = await service.getCatalogueAnalytics(10);

    expect(repo.getCatalogueSummary).toHaveBeenCalled();
    expect(repo.getTopSearches).toHaveBeenCalledWith(10);
    expect(repo.getMostBookmarkedProducts).toHaveBeenCalledWith(10);

    expect(result.summary.total_products).toBe(7);
    expect(result.top_searches).toHaveLength(1);
    expect(result.most_bookmarked_products).toHaveLength(1);
  });

  it('bounds excessive limit to 50', async () => {
    repo.getCatalogueSummary.mockResolvedValue({
      total_products: 7,
      total_categories: 6,
      total_bookmarks: 0,
      total_searches_logged: 0,
    });
    repo.getTopSearches.mockResolvedValue([]);
    repo.getMostBookmarkedProducts.mockResolvedValue([]);

    await service.getCatalogueAnalytics(500);

    expect(repo.getTopSearches).toHaveBeenCalledWith(50);
    expect(repo.getMostBookmarkedProducts).toHaveBeenCalledWith(50);
  });
});
