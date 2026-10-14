'use strict';

/**
 * auth.routes — Express router for /auth/* endpoints.
 *
 * Mounted at /api/v1/auth in src/routes/index.js.
 *
 * Middleware order per route:
 *   validate(schema)  → validates and strips req.body
 *   controller        → delegates to service, sends response
 */

const { Router } = require('express');
const controller = require('./auth.controller');
const { validate, guestSchema, registerSchema, loginSchema, refreshSchema, logoutSchema } = require('./auth.validation');

const router = Router();

// POST /api/v1/auth/guest
router.post('/guest',    validate(guestSchema),    controller.guest);

// POST /api/v1/auth/register
router.post('/register', validate(registerSchema),  controller.register);

// POST /api/v1/auth/login
router.post('/login',    validate(loginSchema),     controller.login);

// POST /api/v1/auth/refresh
router.post('/refresh',  validate(refreshSchema),   controller.refreshToken);

// POST /api/v1/auth/logout
router.post('/logout',   validate(logoutSchema),    controller.logout);

module.exports = router;

