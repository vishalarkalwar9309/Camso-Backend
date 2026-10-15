'use strict';

/**
 * src/modules/documents/documents.routes.js
 *
 * WHAT THIS FILE DOES:
 *   Defines public Express routes for documents module (/api/v1/documents).
 *   Auto-mounted by src/routes/index.js convention scanner.
 *
 * OVERALL DESIGN:
 *   Public endpoints (no authentication required).
 *   Wraps controller handlers with asyncHandler.
 *
 * ENDPOINTS:
 *   GET /            — list published documents
 *   GET /:id         — get document detail by ID
 *
 * FINAL OUTPUT OF THE FILE:
 *   Express Router instance.
 *
 * IMPORTED BY:
 *   Auto-mounted by src/routes/index.js at /api/v1/documents
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8
 */

const express = require('express');
const documentsController = require('./documents.controller');
const asyncHandler = require('../../core/utils/asyncHandler');

const router = express.Router();

/**
 * @openapi
 * /documents:
 *   get:
 *     tags: [Documents]
 *     summary: List published documents
 *     description: Returns a paginated list of published documents filtered by product, category, or document type.
 *     parameters:
 *       - in: query
 *         name: product_id
 *         schema: { type: integer }
 *       - in: query
 *         name: category_id
 *         schema: { type: integer }
 *       - in: query
 *         name: document_type
 *         schema: { type: string, enum: [CATALOGUE, BROCHURE, MANUAL, TECHNICAL_GUIDE, BULLETIN, WARRANTY, VIDEO] }
 *       - in: query
 *         name: lang
 *         schema: { type: string, default: en }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of documents
 */
router.get('/', asyncHandler(documentsController.list));

/**
 * @openapi
 * /documents/{id}:
 *   get:
 *     tags: [Documents]
 *     summary: Get document detail by ID
 *     description: Returns details of a single published document including per-language document files.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: lang
 *         schema: { type: string, default: en }
 *     responses:
 *       200:
 *         description: Document detail
 *       404:
 *         description: Document not found or draft
 */
router.get('/:id', asyncHandler(documentsController.getById));
router.get('/:id/download', asyncHandler(documentsController.download));

module.exports = router;
