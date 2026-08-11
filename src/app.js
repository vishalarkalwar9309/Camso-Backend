'use strict';

/**
 * src/app.js
 *
 * WHAT THIS FILE DOES:
 *   Creates and configures the Express application instance.
 *   This is a pure function — it creates an app but does not listen on a port.
 *   Listening is done in src/server.js, which also handles graceful shutdown.
 *
 * OVERALL DESIGN:
 *   Middleware stack is applied in order:
 *   1. Security headers (helmet)
 *   2. CORS
 *   3. Rate limiting
 *   4. HTTP access logging (Morgan)
 *   5. Body parsing
 *   6. Swagger UI at /api/docs
 *   7. Application routes (/api/v1/*)
 *   8. 404 handler for unmatched routes
 *   9. Global error handler (must be last)
 *
 * ELEMENTS:
 *   createApp() — factory function that returns a configured Express Application
 *
 * FINAL OUTPUT:
 *   module.exports = { createApp }
 *
 * IMPORTED BY:
 *   src/server.js
 *   tests/integration/*.test.js (creates test app instance)
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 2 (Security: helmet, cors, express-rate-limit)
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/index');
const { swaggerSpec, swaggerUiOptions } = require('./config/swagger');
const morganMiddleware = require('./core/logger/morgan');
const errorHandler = require('./core/middleware/errorHandler');
const ApiError = require('./core/utils/ApiError');
const { createRouter } = require('./routes/index');
const logger = require('./core/logger/winston');

/**
 * createApp
 *
 * USE: Factory function that creates and configures the Express application.
 *      Called once at startup (server.js) and in integration tests.
 *
 * HOW IT WORKS:
 *   1. Creates Express app.
 *   2. Applies security middleware (helmet, cors, rate-limit).
 *   3. Applies logging (morgan → winston).
 *   4. Applies body parsers (JSON, URL-encoded).
 *   5. Mounts Swagger UI at /api/docs.
 *   6. Mounts all application routes via createRouter().
 *   7. Mounts 404 handler for unmatched routes.
 *   8. Mounts global error handler LAST.
 *
 * CONCEPTS:
 *   Express middleware ordering. Factory pattern for testability.
 *   Helmet for HTTP security headers. CORS from config whitelist.
 *   Rate limiting to protect against brute-force and DoS.
 *
 * BEFORE: No Express application.
 * AFTER:  Fully configured Express app ready to call .listen() on.
 *
 * @returns {import('express').Application}
 */
function createApp() {
  const app = express();

  // ── Trust proxy (for Render deployment — X-Forwarded-For) ─────────────────
  app.set('trust proxy', 1);

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl)
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes(origin) || config.corsOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(new ApiError(403, 'FORBIDDEN', `CORS policy: origin ${origin} not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        type: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
        details: null,
      },
    },
  });
  app.use('/api/', limiter);

  // ── HTTP access logging ────────────────────────────────────────────────────
  app.use(morganMiddleware);

  // ── Body parsers ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Swagger UI ─────────────────────────────────────────────────────────────
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // ── Application routes ─────────────────────────────────────────────────────
  createRouter(app);

  // ── 404 handler ────────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  // ── Global error handler (must be last) ────────────────────────────────────
  app.use(errorHandler);

  logger.info('[App] Express application configured');

  return app;
}

module.exports = { createApp };
