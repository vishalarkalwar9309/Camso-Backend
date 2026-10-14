'use strict';

const service = require('./analytics.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');

/**
 * GET /api/v1/admin/analytics/catalogue
 * Aggregated top search terms, most bookmarked products, and catalogue summary.
 */
async function getCatalogueAnalytics(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const data = await service.getCatalogueAnalytics(limit);
    return sendSuccess(res, data, 200);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCatalogueAnalytics,
};
