'use strict';

/**
 * languages.routes — Public language endpoints.
 *
 * Mounted at /api/v1/languages.
 */

const { Router } = require('express');
const controller = require('./languages.controller');

const router = Router();

// GET /api/v1/languages — public active languages for app language selector
router.get('/', controller.getActiveLanguages);

module.exports = router;
