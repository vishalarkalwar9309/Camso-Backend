'use strict';

const express = require('express');
const requireRole = require('../../core/middleware/requireRole');
const asyncHandler = require('../../core/utils/asyncHandler');
const faqsController = require('./faqs.controller');

const router = express.Router();

// GET /api/v1/admin/faqs
router.get('/', requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'), asyncHandler(faqsController.adminList));

// GET /api/v1/admin/faqs/:id
router.get('/:id', requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'), asyncHandler(faqsController.adminGetById));

// POST /api/v1/admin/faqs
router.post('/', requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'), asyncHandler(faqsController.adminCreate));

// PATCH /api/v1/admin/faqs/:id
router.patch('/:id', requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'), asyncHandler(faqsController.adminUpdate));

module.exports = router;
