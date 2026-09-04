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

// --- Health check ---
// GET /api/v1/health
// Liveness probe — no auth required.
// Returns the current server time so the caller can confirm the response is live.
router.get('/health', (req, res) => {
  sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
});

// --- Module routes ---
// Phase 3:
const authRoutes = require('../modules/auth/auth.routes');
router.use('/auth', authRoutes);

// Phase 3 (continued):
const usersRoutes = require('../modules/users/users.routes');
router.use('/users', usersRoutes);



// Phase 5:
// const devicesRoutes = require('../modules/devices/devices.routes');
// router.use('/devices', devicesRoutes);

// Phase 6+: categories, products, search, bookmarks — added per phase

module.exports = router;
