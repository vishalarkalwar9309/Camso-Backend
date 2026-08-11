'use strict';

/**
 * src/modules/testimonials/testimonials.routes.js
 *
 * WHAT THIS FILE DOES:
 *   Defines public Express routes for testimonials module (/api/v1/testimonials).
 *   Auto-mounted by src/routes/index.js convention scanner.
 *
 * OVERALL DESIGN:
 *   Public endpoint (no authentication required).
 *   Wraps controller handlers with asyncHandler.
 *
 * ENDPOINTS:
 *   GET / — list published testimonials
 *
 * FINAL OUTPUT OF THE FILE:
 *   Express Router instance.
 *
 * IMPORTED BY:
 *   Auto-mounted by src/routes/index.js at /api/v1/testimonials
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8
 */

const express = require('express');
const testimonialsController = require('./testimonials.controller');
const asyncHandler = require('../../core/utils/asyncHandler');

const router = express.Router();

/**
 * @openapi
 * /testimonials:
 *   get:
 *     tags: [Testimonials]
 *     summary: List published testimonials
 *     description: Returns a paginated list of published customer testimonials filtered by product or story type.
 *     parameters:
 *       - in: query
 *         name: product_id
 *         schema: { type: integer }
 *       - in: query
 *         name: story_type
 *         schema: { type: string, enum: [SOLIDS, OPERATING_COST, WORN_PRODUCT_REPLACEMENT, REPEAT_PURCHASE] }
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
 *         description: List of testimonials
 */
router.get('/', asyncHandler(testimonialsController.list));

module.exports = router;
