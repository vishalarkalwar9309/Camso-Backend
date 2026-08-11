'use strict';

const express = require('express');
const requireRole = require('../../core/middleware/requireRole');
const asyncHandler = require('../../core/utils/asyncHandler');
const documentsController = require('./documents.controller');
const { upload } = require('../../core/utils/mediaUpload');

const router = express.Router();

// GET /api/v1/admin/documents
router.get('/', requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'), asyncHandler(documentsController.adminList));

// GET /api/v1/admin/documents/:id
router.get('/:id', requireRole('VIEWER', 'CONTENT_ADMIN', 'SUPER_ADMIN'), asyncHandler(documentsController.adminGetById));

// POST /api/v1/admin/documents
router.post('/', requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'), asyncHandler(documentsController.adminCreate));

// PATCH /api/v1/admin/documents/:id
router.patch('/:id', requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'), asyncHandler(documentsController.adminUpdate));

// POST /api/v1/admin/documents/:id/files
router.post('/:id/files', requireRole('CONTENT_ADMIN', 'SUPER_ADMIN'), upload.single('file'), asyncHandler(documentsController.adminUploadFile));

module.exports = router;
