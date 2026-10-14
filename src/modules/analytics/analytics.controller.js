'use strict';

const service = require('./analytics.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

const getCatalogueAnalytics = asyncHandler(async (req, res) => {
  const result = await service.getCatalogueAnalytics(req.query.limit);
  sendSuccess(res, result, 200);
});

const getContentAnalytics = asyncHandler(async (req, res) => {
  const result = await service.getContentAnalytics(req.query);
  sendSuccess(res, result, 200);
});

module.exports = {
  getCatalogueAnalytics,
  getContentAnalytics,
};
