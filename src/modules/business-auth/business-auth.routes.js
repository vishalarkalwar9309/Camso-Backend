'use strict';

/**
 * business-auth.routes — Routes for Dealer and Distributor authentication.
 *
 * Endpoints:
 *   POST /api/v1/business-auth/register  -> Register business organization + initial staff (PENDING)
 *   POST /api/v1/business-auth/login     -> Login with business email/password (requires APPROVED status)
 *   POST /api/v1/business-auth/refresh   -> Refresh business token pair
 *   POST /api/v1/business-auth/logout    -> Revoke business refresh token
 *   GET  /api/v1/business-auth/me        -> Current business profile & organization context (businessGuard)
 */

const { Router } = require('express');
const controller = require('./business-auth.controller');
const { validate, registerSchema, loginSchema, refreshSchema, logoutSchema } = require('./business-auth.validation');
const businessGuard = require('../../core/middleware/businessGuard');

const router = Router();

// POST /api/v1/business-auth/register
router.post('/register', validate(registerSchema), controller.register);

// POST /api/v1/business-auth/login
router.post('/login', validate(loginSchema), controller.login);

// POST /api/v1/business-auth/refresh
router.post('/refresh', validate(refreshSchema), controller.refresh);

// POST /api/v1/business-auth/logout
router.post('/logout', validate(logoutSchema), controller.logout);

// GET /api/v1/business-auth/me
router.get('/me', businessGuard, controller.getMe);

module.exports = router;
