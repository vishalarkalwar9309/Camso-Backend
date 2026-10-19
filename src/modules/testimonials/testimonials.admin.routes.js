'use strict';

const express = require('express');
const requireRole = require('../../core/middleware/requireRole');
const asyncHandler = require('../../core/utils/asyncHandler');
const testimonialsController = require('./testimonials.controller');

const router = express.Router();

// GET /api/v1/admin/testimonials
router.get('/', requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'), asyncHandler(testimonialsController.adminList));

// GET /api/v1/admin/testimonials/:id
router.get('/:id', requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'), asyncHandler(testimonialsController.adminGetById));

// POST /api/v1/admin/testimonials
router.post('/', requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'), asyncHandler(testimonialsController.adminCreate));

// PATCH /api/v1/admin/testimonials/:id
router.patch('/:id', requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'), asyncHandler(testimonialsController.adminUpdate));

// DELETE /api/v1/admin/testimonials/:id
router.delete('/:id', requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'), asyncHandler(testimonialsController.adminDelete));

module.exports = router;
