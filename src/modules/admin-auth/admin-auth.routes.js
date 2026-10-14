'use strict';

/**
 * admin-auth.routes — Routes for Admin authentication and session lifecycle.
 *
 * Endpoints:
 *   POST /api/v1/admin-auth/login    -> Login with email/password
 *   POST /api/v1/admin-auth/refresh  -> Refresh admin token pair
 *   POST /api/v1/admin-auth/logout   -> Revoke refresh token
 *   GET  /api/v1/admin-auth/me       -> Current admin profile (adminGuard)
 */

const { Router } = require('express');
const controller = require('./admin-auth.controller');
const { validate, loginSchema, refreshSchema, logoutSchema } = require('./admin-auth.validation');
const adminGuard = require('../../core/middleware/adminGuard');

const router = Router();

// POST /api/v1/admin-auth/login
router.post('/login', validate(loginSchema), controller.login);

// POST /api/v1/admin-auth/refresh
router.post('/refresh', validate(refreshSchema), controller.refresh);

// POST /api/v1/admin-auth/logout
router.post('/logout', validate(logoutSchema), controller.logout);

// GET /api/v1/admin-auth/me
router.get('/me', adminGuard, controller.getMe);

module.exports = router;
