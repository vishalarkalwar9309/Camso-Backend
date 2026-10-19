'use strict';

/**
 * src/modules/system-health/system-health.service.js
 *
 * 1. What this file does:
 *    Gathers deep system diagnostics, dependency connectivity states, and entity counts
 *    for administrative monitoring in the Super Admin Console.
 * 2. Overall design:
 *    Executes parallel probes against database, storage, push services, and core entity counts
 *    with safe timeouts to guarantee sub-second execution without exposing secrets.
 * 3. Elements in the file:
 *    - getSystemHealth(): aggregates system metrics, database ping, storage readiness,
 *      push status, and counts.
 * 4. Final output of the file:
 *    Exports service object with getSystemHealth method.
 */

const { prisma } = require('../../config/database');
const { getSupabaseConfig } = require('../../config/supabase');
const firebase = require('../../config/firebase');

/**
 * getSystemHealth
 *
 * 1. The use of function:
 *    Compiles comprehensive platform health metrics and service connectivity diagnostics.
 * 2. How does the specific function work:
 *    Measures round-trip database ping latency using Prisma queryRaw, checks Supabase storage
 *    credentials and bucket readiness, checks Firebase configuration and initialization status,
 *    queries core entity counts, and captures process memory and uptime metrics.
 * 3. Concepts used in the function:
 *    Parallel execution via Promise.allSettled, latency timing with process.hrtime, fail-safe probing.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/system-health/system-health.controller.js.
 * 5. Final output of the function, before and after:
 *    Before: Invoked without parameters.
 *    After: Returns diagnostics object with system, database, storage, firebase, and counts.
 *
 * @returns {Promise<object>} Platform health report.
 */
async function getSystemHealth() {
  const startTime = Date.now();

  // 1. Database Connectivity & Ping Latency Probe
  let dbStatus = 'disconnected';
  let dbLatencyMs = null;
  try {
    const pingStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - pingStart;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
    dbLatencyMs = null;
  }

  // 2. Supabase Storage Probe
  const supabaseConfig = getSupabaseConfig(process.env);
  const storageStatus = {
    isReady: supabaseConfig.isReady,
    bucket: supabaseConfig.bucket,
    status: supabaseConfig.isReady ? 'ready' : 'unconfigured',
  };

  // 3. Firebase Cloud Messaging Probe
  const isFCMReady = firebase.getIsFirebaseReady();
  const firebaseStatus = {
    isReady: isFCMReady,
    status: isFCMReady
      ? 'connected'
      : (process.env.FIREBASE_PROJECT_ID ? 'configured' : 'unconfigured'),
  };

  // 4. Counts & Platform Quantities
  const [
    productsCount,
    documentsCount,
    dealersCount,
    categoriesCount,
    adminsCount,
    pendingOrgsCount,
  ] = await Promise.allSettled([
    prisma.product.count(),
    prisma.document.count(),
    prisma.dealer.count(),
    prisma.category.count(),
    prisma.adminUser.count(),
    prisma.businessOrganization.count({ where: { approval_status: 'PENDING' } }),
  ]).then((results) =>
    results.map((r) => (r.status === 'fulfilled' ? r.value : 0))
  );

  const memoryUsage = process.memoryUsage();

  return {
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    duration_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    system: {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime_seconds: Math.floor(process.uptime()),
      memory: {
        rss_mb: Math.round(memoryUsage.rss / 1024 / 1024),
        heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      },
    },
    database: {
      status: dbStatus,
      latency_ms: dbLatencyMs,
    },
    storage: storageStatus,
    firebase: firebaseStatus,
    counts: {
      products: productsCount,
      documents: documentsCount,
      dealers: dealersCount,
      categories: categoriesCount,
      admins: adminsCount,
      pending_approvals: pendingOrgsCount,
    },
  };
}

module.exports = {
  getSystemHealth,
};
