'use strict';

/**
 * search.routes — Express router for search endpoints.
 *
 * Endpoints:
 * - GET /api/v1/search — 6-tier ranked product search (public, optional JWT)
 * - GET /api/v1/search/recent — user's recent search queries (requires JWT)
 * - GET /api/v1/search/popular — top aggregated queries (public)
 */

const { Router } = require('express');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../config/jwt');
const authGuard = require('../../core/middleware/authGuard');
const controller = require('./search.controller');
const {
  validate,
  searchQuerySchema,
  recentQuerySchema,
  popularQuerySchema,
} = require('./search.validation');

const router = Router();

/**
 * Optional authentication middleware for public search.
 * Attaches user identity to req.user if a valid token is present, without blocking unauthenticated requests.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, jwtConfig.accessSecret);
      req.user = { id: decoded.sub, is_guest: Boolean(decoded.is_guest) };
    } catch {
      // Ignored for optional auth — continues as anonymous guest
    }
  }
  next();
}

// GET /api/v1/search/recent — must be declared BEFORE /:id or general routes to avoid route shadowing
router.use('/recent', authGuard);
router.get('/recent', validate(recentQuerySchema, 'query'), controller.getRecentSearches);

// GET /api/v1/search/popular — aggregated top queries
router.get('/popular', validate(popularQuerySchema, 'query'), controller.getPopularSearches);

// GET /api/v1/search — ranked multi-attribute product search
router.get('/', optionalAuth, validate(searchQuerySchema, 'query', true), controller.search);

module.exports = router;
