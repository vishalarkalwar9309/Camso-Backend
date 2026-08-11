'use strict';

/**
 * src/routes/index.js
 *
 * WHAT THIS FILE DOES:
 *   Central route mounting file. Auto-discovers and mounts all module routes
 *   by convention from src/modules/<name>/.
 *   Also mounts /health and /ready endpoints.
 *
 * OVERALL DESIGN:
 *   All API routes are mounted under /api/v1.
 *   Module route files follow the convention:
 *     src/modules/<name>/<name>.routes.js        — public routes (mounted at /api/v1/<name>)
 *     src/modules/<name>/<name>.admin.routes.js  — admin routes (mounted at /api/v1/admin/<name>)
 *
 *   Admin routes are mounted under /admin and protected by adminGuard + auditContext.
 *   Public routes are mounted directly on apiRouter.
 *
 * AUTO-MOUNT MECHANISM (master plan Section 4):
 *   Scans src/modules/ directory at boot time.
 *   For every module folder:
 *     - If <name>.routes.js exists -> mounts on apiRouter (/api/v1/<name>)
 *     - If <name>.admin.routes.js exists -> mounts on adminRouter (/api/v1/admin/<name>)
 *   Adding a new module folder auto-mounts its routes automatically.
 *
 * ELEMENTS:
 *   createRouter(app) — mounts all routes on the Express app
 *   GET /health       — liveness check (process alive)
 *   GET /ready        — readiness check (process alive + DB reachable + Firebase initialized)
 *
 * FINAL OUTPUT:
 *   module.exports = { createRouter }
 *
 * IMPORTED BY:
 *   src/app.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 4 (routes/index.js)
 *            docs/CAMSO_Backend_Plan_Aary.md Section 4 (Auto-mounting by convention)
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const adminGuard = require('../core/middleware/adminGuard');
const auditContext = require('../core/middleware/auditContext');
const asyncHandler = require('../core/utils/asyncHandler');
const { connectDB } = require('../config/database');
const logger = require('../core/logger/winston');

/**
 * autoMountModules
 *
 * USE: Scans src/modules/ directory and mounts module routers automatically.
 *
 * HOW IT WORKS:
 *   Reads subdirectories of src/modules/.
 *   For each directory <moduleName>:
 *     - Requires <moduleName>.routes.js (if present) -> apiRouter.use('/<moduleName>', router)
 *     - Requires <moduleName>.admin.routes.js (if present) -> adminRouter.use('/<moduleName>', router)
 *
 * CONCEPTS: Convention over configuration, automatic module discovery.
 *
 * @param {import('express').Router} apiRouter — public API v1 router
 * @param {import('express').Router} adminRouter — protected admin router
 */
function autoMountModules(apiRouter, adminRouter) {
  const modulesDir = path.join(__dirname, '..', 'modules');

  if (!fs.existsSync(modulesDir)) {
    return;
  }

  const moduleFolders = fs.readdirSync(modulesDir).filter((file) => {
    const fullPath = path.join(modulesDir, file);
    return fs.statSync(fullPath).isDirectory();
  });

  for (const folder of moduleFolders) {
    const folderPath = path.join(modulesDir, folder);

    // Public routes convention: <folder>.routes.js
    const publicRouteFile = path.join(folderPath, `${folder}.routes.js`);
    if (fs.existsSync(publicRouteFile)) {
      const publicRouter = require(publicRouteFile);
      apiRouter.use(`/${folder}`, publicRouter);
      logger.info(`[Router] Auto-mounted public routes: /api/v1/${folder}`);
    }

    // Admin routes convention: <folder>.admin.routes.js
    const adminRouteFile = path.join(folderPath, `${folder}.admin.routes.js`);
    if (fs.existsSync(adminRouteFile)) {
      const adminModuleRouter = require(adminRouteFile);
      adminRouter.use(`/${folder}`, adminModuleRouter);
      logger.info(`[Router] Auto-mounted admin routes: /api/v1/admin/${folder}`);
    }
  }
}

/**
 * createRouter
 *
 * USE: Mounts all application routes onto the Express app.
 *
 * @param {import('express').Application} app
 */
function createRouter(app) {
  const apiRouter = express.Router();
  const adminRouter = express.Router();

  // ── Admin router: adminGuard + auditContext applied to all /admin/* routes ──
  adminRouter.use(adminGuard);
  adminRouter.use(auditContext);

  // ── Health & Readiness ─────────────────────────────────────────────────────

  apiRouter.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  });

  apiRouter.get('/ready', asyncHandler(async (req, res) => {
    const checks = { db: false, firebase: false };
    const errors = [];

    try {
      await connectDB();
      checks.db = true;
    } catch (err) {
      errors.push(`DB: ${err.message}`);
      logger.warn('[Ready] Database not reachable', { error: err.message });
    }

    try {
      const { isFirebaseReady } = require('../config/firebase');
      checks.firebase = isFirebaseReady;
      if (!isFirebaseReady) {
        errors.push('Firebase: not configured');
      }
    } catch {
      errors.push('Firebase: initialization error');
    }

    const isReady = checks.db;
    const status = isReady ? 200 : 503;

    res.status(status).json({
      success: isReady,
      data: {
        status: isReady ? 'ready' : 'not_ready',
        checks,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString(),
      },
    });
  }));

  // ── Auto-mount module folders by convention ───────────────────────────────
  autoMountModules(apiRouter, adminRouter);

  // Mount admin sub-router under /admin
  apiRouter.use('/admin', adminRouter);

  // Mount API router under /api/v1
  app.use('/api/v1', apiRouter);

  logger.info('[Router] All routes mounted on /api/v1');
}

module.exports = { createRouter };
