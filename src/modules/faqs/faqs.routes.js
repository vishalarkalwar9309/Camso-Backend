'use strict';

/**
 * src/modules/faqs/faqs.routes.js
 *
 * WHAT THIS FILE DOES:
 *   Defines public Express routes for FAQs module (/api/v1/faqs).
 *   Auto-mounted by src/routes/index.js convention scanner.
 *
 * OVERALL DESIGN:
 *   Public endpoint (no authentication required).
 *   Wraps controller handlers with asyncHandler.
 *
 * ENDPOINTS:
 *   GET / — list published FAQs
 *
 * FINAL OUTPUT OF THE FILE:
 *   Express Router instance.
 *
 * IMPORTED BY:
 *   Auto-mounted by src/routes/index.js at /api/v1/faqs
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8
 */

const express = require('express');
const faqsController = require('./faqs.controller');
const asyncHandler = require('../../core/utils/asyncHandler');

const router = express.Router();

/**
 * @openapi
 * /faqs:
 *   get:
 *     tags: [FAQs]
 *     summary: List published FAQs
 *     description: Returns a paginated list of published FAQs sorted by sort_order ascending, filtered by category or product.
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [COMPANY, PRODUCT, DISTRIBUTION] }
 *       - in: query
 *         name: product_id
 *         schema: { type: integer }
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
 *         description: List of FAQs
 */
router.get('/', asyncHandler(faqsController.list));

module.exports = router;
