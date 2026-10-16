'use strict';

/**
 * Express application factory.
 *
 * Creates and configures the Express app.
 * Does NOT start the HTTP server — that is server.js's responsibility.
 *
 * Middleware registration order matters and is intentional:
 *   1. Security headers (helmet)
 *   2. CORS
 *   3. Body parsers
 *   4. HTTP access logging (morgan)
 *   5. Rate limiting
 *   6. Application routes (/api/v1)
 *   7. 404 handler (after routes)
 *   8. Error handler (must be last, 4-argument signature)
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const morganMiddleware = require('./core/logger/morgan');
const routes = require('./routes');
const notFound = require('./core/middleware/notFound');
const errorHandler = require('./core/middleware/errorHandler');

const app = express();

// Configure trusted proxy for Render / Cloudflare reverse proxy infrastructure.
// Strictly trusts exactly 1 hop (the immediate Render reverse proxy), ensuring req.ip
// accurately resolves to the true client IP instead of the shared router internal IP.
// Avoids trusting arbitrary upstream client headers by specifying 1 hop.
if (env.isProduction || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// 1. Security headers
app.use(helmet());

// 2. CORS
// In development: allow all origins for ease of local testing.
// In production: restrict to specific origins (configure via env when deployment is set up).
// ASSUMPTION: CORS origin policy for production will be confirmed with CEAT.
// Marked as pending — currently permissive for development.
const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN;
const corsOptions = env.isProduction
  ? {
      origin: (!rawOrigins || rawOrigins === '*')
        ? '*'
        : rawOrigins.split(',').map((o) => o.trim()).filter(Boolean),
    }
  : { origin: '*' };
app.use(cors(corsOptions));

// 3. Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// 4. HTTP access logging
app.use(morganMiddleware);

// 5. Rate limiting — applied to all /api/ routes
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/ready' || req.originalUrl?.endsWith('/health') || req.originalUrl?.endsWith('/ready'),
  message: {
    success: false,
    error: {
      type: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      details: [],
    },
  },
});
app.use('/api/', limiter);

// Root health and readiness probes (for container orchestrators / load balancers)
const { checkReadiness } = require('./core/services/readinessService');
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});
app.get('/ready', async (req, res) => {
  const { isReady, statusCode, result } = await checkReadiness();
  if (isReady) {
    return res.status(200).json({ success: true, data: result });
  }
  return res.status(statusCode).json({
    success: false,
    error: {
      type: 'SERVICE_UNAVAILABLE',
      message: 'Service is not ready to serve traffic.',
      details: [result],
    },
  });
});

// 6. Application routes
app.use('/api/v1', routes);

// 7. 404 handler — must come after all routes
app.use(notFound);

// 8. Error handler — must be last (4-argument signature required by Express)
app.use(errorHandler);

function createApp() {
  return app;
}

app.createApp = createApp;
app.app = app;

module.exports = app;
module.exports.createApp = createApp;
module.exports.app = app;

