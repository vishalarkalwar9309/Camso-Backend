'use strict';

/**
 * src/modules/system-health/system-health.routes.js
 *
 * 1. What this file does:
 *    Defines Express routes for Super Admin platform health and diagnostics.
 * 2. Overall design:
 *    Express Router protected by adminGuard and restricted to SUPER_ADMIN role.
 * 3. Elements in the file:
 *    - GET / : retrieves comprehensive health diagnostics.
 * 4. Final output of the file:
 *    Exports Express Router instance to be mounted at /api/v1/admin/system-health.
 */

const { Router } = require('express');
const controller = require('./system-health.controller');
const adminGuard = require('../../core/middleware/adminGuard');
const requireRole = require('../../core/middleware/requireRole');

const router = Router();

router.use(adminGuard);
router.get('/', requireRole('SUPER_ADMIN'), controller.getSystemHealth);

module.exports = router;
