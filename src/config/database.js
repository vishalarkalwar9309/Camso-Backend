'use strict';

/**
 * Prisma client singleton.
 *
 * IMPORTANT: This is the ONLY file that imports @prisma/client.
 * All repositories import `prisma` from this file.
 * Controllers and services must never import Prisma directly.
 */

const { PrismaClient } = require('@prisma/client');
const env = require('./env');

const prisma = new PrismaClient({
  log: env.isDevelopment
    ? ['query', 'warn', 'error']
    : ['warn', 'error'],
});

prisma.prisma = prisma;
prisma.connectDB = async () => {
  await prisma.$queryRaw`SELECT 1`;
  return prisma;
};

module.exports = prisma;
