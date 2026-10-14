'use strict';

/**
 * readinessService — Evaluates backend readiness to serve client requests.
 *
 * Distinct from liveness (process alive):
 * - Readiness checks that required dependencies (PostgreSQL database) are reachable.
 * - Accurately reports unconfigured dependencies (e.g. Firebase) without false claims.
 * - Never leaks connection strings, passwords, or internal environment details.
 */

const prisma = require('../../config/database');

/**
 * Check readiness of backend and critical dependencies.
 *
 * @returns {Promise<{ isReady: boolean, statusCode: number, result: object }>}
 */
async function checkReadiness() {
  const checks = {
    database: 'disconnected',
    firebase: 'unconfigured',
  };

  let dbOk = false;

  try {
    // 2-second timeout probe to ensure fast fail when DB is unresponsive
    const dbProbe = prisma.$queryRaw`SELECT 1`;
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database ping timeout')), 2000)
    );

    await Promise.race([dbProbe, timeout]);
    checks.database = 'connected';
    dbOk = true;
  } catch {
    checks.database = 'disconnected';
    dbOk = false;
  }

  // Check Firebase status dynamically without falsely claiming readiness
  const firebase = require('../../config/firebase');
  if (firebase.getIsFirebaseReady()) {
    checks.firebase = 'connected';
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    checks.firebase = 'configured';
  } else {
    checks.firebase = 'unconfigured';
  }


  const isReady = dbOk;
  const statusCode = isReady ? 200 : 503;

  return {
    isReady,
    statusCode,
    result: {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    },
  };
}

module.exports = { checkReadiness };
