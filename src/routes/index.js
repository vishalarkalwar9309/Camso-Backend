'use strict';

/**
 * Central route aggregator.
 *
 * app.js mounts this router at /api/v1.
 * All module routes are registered here and only here.
 *
 * Phase 1: health endpoint only.
 * Future phases uncomment and mount their module routes here.
 */

const { Router } = require('express');
const { sendSuccess } = require('../core/utils/ApiResponse');

const router = Router();

// --- Health & Readiness checks ---
// GET /api/v1/health — Liveness probe (process alive)
router.get('/health', (req, res) => {
  sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/v1/ready — Readiness probe (database connection & dependencies verified)
const { checkReadiness } = require('../core/services/readinessService');
router.get('/ready', async (req, res) => {
  const { isReady, statusCode, result } = await checkReadiness();
  if (isReady) {
    return sendSuccess(res, result, 200);
  }
  return res.status(statusCode).json({
    success: false,
    error: {
      type: 'SERVICE_UNAVAILABLE',
      message: 'Service is not ready to serve traffic.',
      details: [result],
    },
  });
});

// --- Module routes ---
// Phase 3: Auth & Users
const authRoutes = require('../modules/auth/auth.routes');
router.use('/auth', authRoutes);

const usersRoutes = require('../modules/users/users.routes');
router.use('/users', usersRoutes);

// Phase 5: Devices
const devicesRoutes = require('../modules/devices/devices.routes');
router.use('/devices', devicesRoutes);

// Phase 6: Categories
const categoriesRoutes = require('../modules/categories/categories.routes');
const adminCategoriesRoutes = require('../modules/categories/categories.admin.routes');
router.use('/categories', categoriesRoutes);
router.use('/admin/categories', adminCategoriesRoutes);

// Phase 7: Products
const productsRoutes = require('../modules/products/products.routes');
const adminProductsRoutes = require('../modules/products/products.admin.routes');
router.use('/products', productsRoutes);
router.use('/admin/products', adminProductsRoutes);

// Configuration Groundwork: Languages
const languagesRoutes = require('../modules/languages/languages.routes');
const adminLanguagesRoutes = require('../modules/languages/languages.admin.routes');
router.use('/languages', languagesRoutes);
router.use('/admin/languages', adminLanguagesRoutes);

// Configuration Groundwork: Content & App Settings
const contentRoutes = require('../modules/content/content.routes');
const adminContentRoutes = require('../modules/content/content.admin.routes');
router.use('/content', contentRoutes);
router.use('/admin/content', adminContentRoutes);

// Task 1.4: Search & Discovery
const searchRoutes = require('../modules/search/search.routes');
router.use('/search', searchRoutes);

// Task 1.5: Bookmarks & Guest-to-Account Synchronization
const bookmarksRoutes = require('../modules/bookmarks/bookmarks.routes');
router.use('/bookmarks', bookmarksRoutes);

// Task 1.6: Catalogue Analytics
const adminAnalyticsRoutes = require('../modules/analytics/analytics.admin.routes');
router.use('/admin/analytics', adminAnalyticsRoutes);

// Admin Authentication & Administration
const adminAuthRoutes = require('../modules/admin-auth/admin-auth.routes');
const { adminUsersRouter, adminOrgsRouter } = require('../modules/admin-users/admin-users.routes');
router.use('/admin-auth', adminAuthRoutes);
router.use('/admin/admin-users', adminUsersRouter);
router.use('/admin/organizations', adminOrgsRouter);

// Business Authentication & Portal (Dealer & Distributor)
const businessAuthRoutes = require('../modules/business-auth/business-auth.routes');
const businessPortalRoutes = require('../modules/business/business.routes');
router.use('/business-auth', businessAuthRoutes);
router.use('/business', businessPortalRoutes);

// Media Assets & File Uploads
const adminMediaRoutes = require('../modules/media/media.admin.routes');
router.use('/admin/media', adminMediaRoutes);

// Push Notifications & Campaign Delivery
const adminNotificationsRoutes = require('../modules/notifications/notifications.admin.routes');
router.use('/admin/notifications', adminNotificationsRoutes);

module.exports = router;




