'use strict';

/**
 * src/config/database.js
 *
 * WHAT THIS FILE DOES:
 *   Creates and exports the single shared Prisma Client instance (singleton).
 *   All repositories import `prisma` from this file — never create their own.
 *
 * OVERALL DESIGN:
 *   Singleton pattern ensures one connection pool across the entire application.
 *   Repositories are the only application layer that calls `prisma.*` methods.
 *   Controllers and services must NEVER import this file directly.
 *
 * ELEMENTS:
 *   prisma      — singleton PrismaClient instance
 *   connectDB() — helper to verify DB connectivity at startup (used by /ready)
 *
 * FINAL OUTPUT:
 *   module.exports = { prisma, connectDB }
 *
 * IMPORTED BY:
 *   src/config/index.js (indirectly for /ready health check)
 *   All *repository.js files (the ONLY files that should import this)
 *
 * CRITICAL RULE:
 *   Only repository files may import this module.
 *   Controllers and services must call repositories — never Prisma directly.
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 3 (System architecture)
 */

const { PrismaClient } = require('@prisma/client');
const config = require('./index');

/**
 * prisma
 *
 * USE: The single Prisma Client instance used across the entire backend.
 *
 * HOW IT WORKS:
 *   PrismaClient is constructed once with log configuration derived from NODE_ENV.
 *   In development, query and info logs are emitted. In production, only warnings and errors.
 *   Connection pooling is managed by Prisma internally.
 *
 * CONCEPTS: Singleton pattern, connection pooling.
 *
 * BEFORE: No database connection.
 * AFTER:  Connected Prisma client ready to process queries.
 */
const prisma = new PrismaClient({
  log: config.isProduction
    ? ['warn', 'error']
    : ['warn', 'error'],
  errorFormat: 'minimal',
});

/**
 * connectDB
 *
 * USE: Verifies the database is reachable. Called during /ready health check
 *      and optionally at server startup.
 *
 * HOW IT WORKS:
 *   Runs a lightweight `prisma.$queryRaw` ping. If the DB is unreachable,
 *   this throws and the caller handles the error.
 *
 * CONCEPTS: Health check pattern, fail-fast startup.
 *
 * IMPORTED BY: src/server.js (startup), GET /ready endpoint
 *
 * BEFORE: DB connectivity unknown.
 * AFTER:  Resolves if connected, rejects if not.
 *
 * @returns {Promise<void>}
 */
async function connectDB() {
  await prisma.$queryRaw`SELECT 1`;
}

module.exports = { prisma, connectDB };
