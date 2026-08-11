/**
 * prisma.config.js
 *
 * WHAT THIS FILE DOES:
 *   Configures Prisma CLI to use the multi-file schema directory.
 *   This is the Prisma 6.x GA mechanism for multi-file schemas.
 *
 * OVERALL DESIGN:
 *   Points the schema path to prisma/schema/ — Prisma aggregates all
 *   .prisma files in that directory automatically.
 *   Migrations are stored in prisma/migrations/ as per the master plan.
 *
 * KEY NOTES:
 *   - Prisma CLI does NOT automatically load .env when prisma.config.js is present.
 *     dotenv is imported here to ensure DATABASE_URL is available.
 *   - This file is CommonJS (no TypeScript in this project).
 *
 * FINAL OUTPUT:
 *   Prisma CLI reads this config and combines all prisma/schema/*.prisma files.
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 4 (Repository structure)
 */

'use strict';

require('dotenv').config();

const path = require('path');
const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
  schema: path.join('prisma', 'schema'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
});
