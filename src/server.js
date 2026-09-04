'use strict';

/**
 * server.js — HTTP server entry point.
 *
 * Responsibilities:
 *   - Load environment variables (must be first)
 *   - Start the HTTP server
 *   - Handle process-level crash signals gracefully
 *   - Disconnect Prisma on shutdown
 *
 * dotenv.config() is called here (not in app.js or config files),
 * so it runs before any other module is imported.
 */

require('dotenv').config();

const http = require('http');
const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/database');
const logger = require('./core/logger');

const server = http.createServer(app);

// --- Graceful shutdown ---
async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected.');
    } catch (err) {
      logger.error('Error disconnecting Prisma:', err);
    }
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// --- Crash handlers ---
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — shutting down:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection — shutting down:', reason);
  process.exit(1);
});

// --- Start server ---
server.listen(env.PORT, () => {
  logger.info(`CAMSO backend running on port ${env.PORT} [${env.NODE_ENV}]`);
});

module.exports = server; // exported for supertest in integration tests
