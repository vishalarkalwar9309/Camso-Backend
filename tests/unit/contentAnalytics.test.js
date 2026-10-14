'use strict';

/**
 * tests/unit/contentAnalytics.test.js
 *
 * WHAT THIS FILE DOES:
 *   Unit tests for analyticsService.getContentAnalytics calculation and error resilience.
 *
 * OVERALL DESIGN:
 *   Mocks analyticsRepository and translate utility to test service business logic in isolation.
 *   Verifies handling of populated data and empty database states (zero division / null safety).
 */

const analyticsService = require('../../src/modules/analytics/analytics.service');
const analyticsRepository = require('../../src/modules/analytics/analytics.repository');
const translateUtil = require('../../src/core/utils/translate');

jest.mock('../../src/modules/analytics/analytics.repository');
jest.mock('../../src/core/utils/translate');

describe('Content Analytics Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return aggregated content metrics when data exists', async () => {
    analyticsRepository.getTotalDocumentDownloads.mockResolvedValue(1250);
    analyticsRepository.getTopDownloadedDocuments.mockResolvedValue([
      {
        id: 'cuid-doc-1',
        document_type: 'MANUAL',
        is_published: true,
        download_count: 800,
        created_at: new Date(),
      },
      {
        id: 'cuid-doc-2',
        document_type: 'CATALOGUE',
        is_published: true,
        download_count: 450,
        created_at: new Date(),
      },
    ]);
    analyticsRepository.getFeedbackMetrics.mockResolvedValue({
      total_feedback: 50,
      average_rating: 4.35,
      rating_breakdown: { '1': 2, '2': 3, '3': 5, '4': 15, '5': 25 },
      bucket_counts: { PRODUCT: 30, SERVICE: 15, PRICING: 5 },
    });

    translateUtil.getTranslations.mockResolvedValue([]);
    translateUtil.attachTranslations.mockImplementation((doc) => ({
      ...doc,
      title: `Localized ${doc.id}`,
    }));

    const result = await analyticsService.getContentAnalytics({ lang: 'en' });

    expect(result).toHaveProperty('total_downloads', 1250);
    expect(result.top_documents).toHaveLength(2);
    expect(result.top_documents[0].id).toBe('cuid-doc-1');
    expect(result.top_documents[0].title).toBe('Localized cuid-doc-1');
    expect(result.top_documents[0].download_count).toBe(800);
    expect(result.feedback_summary.total_feedback).toBe(50);
    expect(result.feedback_summary.avg_rating).toBe(4.35);
    expect(result.feedback_summary.rating_breakdown['5']).toBe(25);
    expect(result.feedback_summary.bucket_counts.PRODUCT).toBe(30);
  });

  test('should return safe zeroed defaults when database tables are empty', async () => {
    analyticsRepository.getTotalDocumentDownloads.mockResolvedValue(0);
    analyticsRepository.getTopDownloadedDocuments.mockResolvedValue([]);
    analyticsRepository.getFeedbackMetrics.mockResolvedValue({
      total_feedback: 0,
      average_rating: 0,
      rating_breakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      bucket_counts: { PRODUCT: 0, SERVICE: 0, PRICING: 0 },
    });

    const result = await analyticsService.getContentAnalytics({ lang: 'en' });

    expect(result.total_downloads).toBe(0);
    expect(result.top_documents).toEqual([]);
    expect(result.feedback_summary.total_feedback).toBe(0);
    expect(result.feedback_summary.avg_rating).toBe(0);
    expect(result.feedback_summary.rating_breakdown).toEqual({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 });
    expect(result.feedback_summary.bucket_counts).toEqual({ PRODUCT: 0, SERVICE: 0, PRICING: 0 });
  });
});
