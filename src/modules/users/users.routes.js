'use strict';

/**
 * users.routes — Express router for /users/* endpoints.
 *
 * Mounted at /api/v1/users in src/routes/index.js.
 * All routes require authentication (authGuard).
 */

const { Router } = require('express');
const authGuard = require('../../core/middleware/authGuard');
const { validate, updateMeSchema } = require('./users.validation');
const controller = require('./users.controller');

const router = Router();

// All /users/* routes require a valid access token
router.use(authGuard);

// GET /api/v1/users/me
router.get('/me', controller.getMe);

// PATCH /api/v1/users/me
router.patch('/me', validate(updateMeSchema), controller.updateMe);

module.exports = router;
