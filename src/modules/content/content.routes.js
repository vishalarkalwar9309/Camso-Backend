'use strict';

/**
 * content.routes — Public content & settings endpoints.
 *
 * Mounted at /api/v1/content.
 */

const { Router } = require('express');
const controller = require('./content.controller');
const { validate, contentKeyParamSchema } = require('./content.validation');

const router = Router();

// GET /api/v1/content — list all active dynamic configurations / content
router.get('/', controller.getAllPublicContent);

// GET /api/v1/content/:key — get active content/settings for key (e.g. settings, about, contact, legal)
router.get('/:key', validate(contentKeyParamSchema, 'params'), controller.getPublicContentByKey);

module.exports = router;
