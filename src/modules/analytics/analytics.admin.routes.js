'use strict';

const { Router } = require('express');
const adminGuard = require('../../core/middleware/adminGuard');
const auditContext = require('../../core/middleware/auditContext');
const requireRole = require('../../core/middleware/requireRole');
const asyncHandler = require('../../core/utils/asyncHandler');
const controller = require('./analytics.controller');

const router = Router();

router.use(adminGuard);
router.use(auditContext);

// GET /api/v1/admin/analytics/catalogue
router.get(
  '/catalogue',
  requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'),
  asyncHandler(controller.getCatalogueAnalytics)
);

// GET /api/v1/admin/analytics/content
router.get(
  '/content',
  requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'),
  asyncHandler(controller.getContentAnalytics)
);

module.exports = router;
