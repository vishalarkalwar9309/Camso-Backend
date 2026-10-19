'use strict';

/**
 * src/modules/audit-logs/audit-logs.routes.js
 *
 * 1. What this file does:
 *    Defines Express routes for viewing system-wide administrative audit logs.
 * 2. Overall design:
 *    Creates an Express Router secured by adminGuard and restricted strictly
 *    to SUPER_ADMIN role via requireRole('SUPER_ADMIN').
 * 3. Elements in the file:
 *    - GET / : queries audit log entries.
 * 4. Final output of the file:
 *    Exports Express Router instance to be mounted at /api/v1/admin/audit-logs.
 */

const { Router } = require('express');
const controller = require('./audit-logs.controller');
const adminGuard = require('../../core/middleware/adminGuard');
const requireRole = require('../../core/middleware/requireRole');

const router = Router();

router.use(adminGuard);
router.get('/', requireRole('SUPER_ADMIN'), controller.listAuditLogs);

module.exports = router;
