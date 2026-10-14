'use strict';

const { Router } = require('express');
const adminGuard = require('../../core/middleware/adminGuard');
const requireRole = require('../../core/middleware/requireRole');
const asyncHandler = require('../../core/utils/asyncHandler');
const controller = require('./analytics.controller');

const router = Router();

// GET /api/v1/admin/analytics/catalogue — Protected by admin roles
router.get(
  '/catalogue',
  adminGuard,
  requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'),
  asyncHandler(controller.getCatalogueAnalytics)
);

module.exports = router;
