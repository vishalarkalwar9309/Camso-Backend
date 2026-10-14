'use strict';

/**
 * devices.routes — Express router for /devices/* endpoints.
 *
 * Mounted at /api/v1/devices in src/routes/index.js.
 * All routes require authentication (authGuard).
 */

const { Router } = require('express');
const authGuard = require('../../core/middleware/authGuard');
const {
  validate,
  registerDeviceSchema,
  deviceIdParamSchema,
} = require('./devices.validation');
const controller = require('./devices.controller');

const router = Router();

// All /devices/* routes require a valid access token
router.use(authGuard);

// POST /api/v1/devices — register/update device and FCM token
router.post('/', validate(registerDeviceSchema, 'body'), controller.registerDevice);

// DELETE /api/v1/devices/:id — deactivate device
router.delete('/:id', validate(deviceIdParamSchema, 'params'), controller.deactivateDevice);

// GET /api/v1/devices — list user's devices
router.get('/', controller.getDevices);

module.exports = router;
