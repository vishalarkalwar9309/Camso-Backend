'use strict';

/**
 * src/server.js
 *
 * WHAT THIS FILE DOES:
 *   Entry point for the CAMSO backend application.
 *   Creates the Express app, starts the HTTP server, and handles graceful shutdown.
 *
 * OVERALL DESIGN:
 *   Separation of concerns:
 *   - app.js: Express configuration (testable, no I/O)
 *   - server.js: HTTP server lifecycle (startup, shutdown, error handling)
 *
 *   Startup sequence:
 *   1. Create Express app.
 *   2. Start HTTP server on configured PORT.
 *   3. Log startup success with version info.
 *
 *   Graceful shutdown on SIGTERM/SIGINT:
 *   1. Stop accepting new connections (server.close()).
 *   2. Disconnect Prisma (close database connection pool).
 *   3. Exit process.
 *
 * ELEMENTS:
 *   start()         — creates app, starts server
 *   shutdown()      — graceful shutdown handler
 *   SIGTERM handler — called by Docker/Render on container stop
 *   SIGINT handler  — called by Ctrl+C in development
 *
 * FINAL OUTPUT:
 *   Running HTTP server listening on PORT (default 4000).
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 3 (src/server.js)
 */

const { createApp } = require('./app');
const { prisma } = require('./config/database');
const config = require('./config/index');
const logger = require('./core/logger/winston');

let server;

/**
 * shutdown
 *
 * USE: Gracefully shuts down the HTTP server and closes the Prisma connection pool.
 *
 * HOW IT WORKS:
 *   1. Calls server.close() — stops accepting new connections, waits for inflight requests.
 *   2. Disconnects Prisma client (closes PostgreSQL connection pool).
 *   3. Exits the process with code 0.
 *
 * CONCEPTS:
 *   Graceful shutdown. Connection pool cleanup. Inflight request draining.
 *
 * BEFORE: Server accepting connections, Prisma connected.
 * AFTER:  Server closed, Prisma disconnected, process exited.
 *
 * @param {string} signal — the OS signal that triggered shutdown (e.g. 'SIGTERM')
 */
async function shutdown(signal) {
  logger.info(`[Server] Received ${signal}. Starting graceful shutdown...`);

  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }

    server.close(async () => {
      logger.info('[Server] HTTP server closed. Disconnecting Prisma...');
      try {
        await prisma.$disconnect();
        logger.info('[Server] Prisma disconnected. Exiting.');
      } catch (err) {
        logger.error('[Server] Error disconnecting Prisma', { error: err.message });
      }
      resolve();
    });

    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      logger.error('[Server] Graceful shutdown timed out after 10s. Forcing exit.');
      resolve();
    }, 10_000);
  });
}

/**
 * start
 *
 * USE: Starts the HTTP server.
 *
 * HOW IT WORKS:
 *   1. Creates the Express app via createApp().
 *   2. Calls app.listen() on the configured port.
 *   3. Logs startup success with environment info.
 *
 * CONCEPTS: HTTP server lifecycle. Factory pattern for testability.
 *
 * BEFORE: No server running.
 * AFTER:  Server listening, Swagger UI available at /api/docs.
 *
 * @returns {Promise<void>}
 */
async function start() {
  const app = createApp();
  const port = config.port;

  server = app.listen(port, () => {
    logger.info(`[Server] 🚀 CAMSO API started`, {
      port,
      env: config.nodeEnv,
      swagger: `http://localhost:${port}/api/docs`,
      health: `http://localhost:${port}/api/v1/health`,
      ready: `http://localhost:${port}/api/v1/ready`,
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`[Server] Port ${port} is already in use.`, { error: err.message });
    } else {
      logger.error('[Server] HTTP server error', { error: err.message });
    }
    process.exit(1);
  });
}

// ── Graceful shutdown signal handlers ──────────────────────────────────────────

process.on('SIGTERM', async () => {
  await shutdown('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutdown('SIGINT');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error('[Server] Uncaught exception', {
    message: err.message,
    stack: err.stack,
  });
  // Do not exit immediately — let in-flight requests complete
  shutdown('uncaughtException').then(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  logger.error('[Server] Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
start().catch((err) => {
  logger.error('[Server] Failed to start', { error: err.message, stack: err.stack });
  process.exit(1);
});
