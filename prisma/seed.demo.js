'use strict';

/**
 * CAMSO Backend — Synthetic Demo Account Seeder
 *
 * Seeds local-development demo accounts for:
 * 1. Customer:        demo.customer@camso.local
 * 2. Super Admin:     demo.admin@camso.local
 * 3. Dealer:          ORG-DEALER-DEMO / demo.dealer@camso.local
 * 4. Distributor:     ORG-DISTRIB-DEMO / demo.distributor@camso.local
 *
 * STRICT CREDENTIAL & SECURITY RULES:
 * 1. ZERO hardcoded passwords.
 * 2. Requires all 4 DEMO_*_PASSWORD environment variables; fails closed if any is missing.
 * 3. Refuses execution unless NODE_ENV is 'development' or 'test'.
 * 4. Refuses execution if DATABASE_URL does not point to a local development host.
 * 5. Strictly create-if-absent. Detects conflicts and aborts without overwriting.
 * 6. Never logs passwords, password hashes, or DATABASE_URL.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../src/core/utils/password');

const REQUIRED_DEMO_ENV_VARS = [
  'DEMO_CUSTOMER_PASSWORD',
  'DEMO_ADMIN_PASSWORD',
  'DEMO_DEALER_PASSWORD',
  'DEMO_DISTRIBUTOR_PASSWORD',
];

/**
 * Validates runtime environment and database target.
 * Throws an Error if conditions for safe local seeding are not met.
 *
 * @param {object} env
 */
function validateEnvironment(env = process.env) {
  const nodeEnv = env.NODE_ENV;
  if (!nodeEnv || (nodeEnv !== 'development' && nodeEnv !== 'test')) {
    throw new Error(
      `[SEED BLOCKED] Refusing to seed database: NODE_ENV must be explicitly "development" or "test". Current: ${nodeEnv || '(undefined)'}`
    );
  }

  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('[SEED BLOCKED] Refusing to seed database: DATABASE_URL is not set.');
  }

  let parsed;
  try {
    parsed = new URL(dbUrl);
  } catch {
    throw new Error('[SEED BLOCKED] Refusing to seed database: Malformed DATABASE_URL.');
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error('[SEED BLOCKED] Refusing to seed database: Protocol must be postgresql.');
  }

  const isLocal =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '::1';

  if (!isLocal) {
    throw new Error('[SEED BLOCKED] Refusing to seed database: DATABASE_URL does not point to a local host.');
  }

  const lower = dbUrl.toLowerCase();
  if (lower.includes('prod') || lower.includes('production') || lower.includes('live')) {
    throw new Error('[SEED BLOCKED] Refusing to seed database: DATABASE_URL appears to target production.');
  }
}

/**
 * Validates that all four demo password environment variables are present and non-empty.
 * Throws an Error listing missing variable names.
 *
 * @param {object} env
 * @returns {{ customerPass: string, adminPass: string, dealerPass: string, distribPass: string }}
 */
function validateDemoCredentials(env = process.env) {
  const endUserPass = env.DEMO_ENDUSER_PASSWORD || env.DEMO_CUSTOMER_PASSWORD;
  const missing = [];
  if (!endUserPass || endUserPass.trim() === '') {
    missing.push('DEMO_ENDUSER_PASSWORD (or DEMO_CUSTOMER_PASSWORD)');
  }
  if (!env.DEMO_ADMIN_PASSWORD || env.DEMO_ADMIN_PASSWORD.trim() === '') {
    missing.push('DEMO_ADMIN_PASSWORD');
  }
  if (!env.DEMO_DEALER_PASSWORD || env.DEMO_DEALER_PASSWORD.trim() === '') {
    missing.push('DEMO_DEALER_PASSWORD');
  }
  if (!env.DEMO_DISTRIBUTOR_PASSWORD || env.DEMO_DISTRIBUTOR_PASSWORD.trim() === '') {
    missing.push('DEMO_DISTRIBUTOR_PASSWORD');
  }

  if (missing.length > 0) {
    throw new Error(
      `[SEED BLOCKED] FAIL CLOSED: Missing required demo credential environment variable(s):\n` +
      missing.map((k) => `  - ${k}`).join('\n') +
      `\nPlease define all four demo passwords in your local .env file before running seed:demo.`
    );
  }

  return {
    customerPass: endUserPass,
    adminPass: env.DEMO_ADMIN_PASSWORD,
    dealerPass: env.DEMO_DEALER_PASSWORD,
    distribPass: env.DEMO_DISTRIBUTOR_PASSWORD,
  };
}

/**
 * Idempotent seeder logic for all four personas.
 *
 * @param {PrismaClient} prisma
 * @param {object} credentials
 * @returns {Promise<{ created: string[], existed: string[] }>}
 */
async function seedDemoAccounts(prisma, credentials) {
  const results = { created: [], existed: [] };

  // ---------------------------------------------------------------------------
  // 1. End User Persona (formerly Customer)
  // ---------------------------------------------------------------------------
  const customerEmail = 'demo.customer@camso.local';
  const existingCustomer = await prisma.user.findUnique({
    where: { email: customerEmail },
    select: { id: true, display_name: true, is_guest: true, is_active: true },
  });

  const validNames = ['Demo End User', 'Demo Customer'];

  if (!existingCustomer) {
    const passwordHash = await hashPassword(credentials.endUserPass || credentials.customerPass);
    await prisma.user.create({
      data: {
        email: customerEmail,
        password_hash: passwordHash,
        display_name: 'Demo End User',
        is_guest: false,
        is_active: true,
        preferred_language: 'en',
      },
    });
    results.created.push(`End User (${customerEmail})`);
  } else {
    if (!validNames.includes(existingCustomer.display_name) || existingCustomer.is_guest !== false) {
      throw new Error(`[CONFLICT] Email ${customerEmail} exists but identity details do not match synthetic end user demo.`);
    }
    results.existed.push(`End User (${customerEmail})`);
  }

  // ---------------------------------------------------------------------------
  // 2. Super Admin Persona
  // ---------------------------------------------------------------------------
  const adminEmail = 'demo.admin@camso.local';
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
    select: { id: true, role: true, is_active: true },
  });

  if (!existingAdmin) {
    const passwordHash = await hashPassword(credentials.adminPass);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        password_hash: passwordHash,
        role: 'SUPER_ADMIN',
        is_active: true,
      },
    });
    results.created.push(`Super Admin (${adminEmail})`);
  } else {
    if (existingAdmin.role !== 'SUPER_ADMIN') {
      throw new Error(`[CONFLICT] Email ${adminEmail} exists with unexpected role: ${existingAdmin.role}`);
    }
    results.existed.push(`Super Admin (${adminEmail})`);
  }

  // ---------------------------------------------------------------------------
  // 3. Dealer Organization & Staff Persona
  // ---------------------------------------------------------------------------
  const dealerCode = 'ORG-DEALER-DEMO';
  const dealerEmail = 'demo.dealer@camso.local';

  const existingDealerOrg = await prisma.businessOrganization.findUnique({
    where: { code: dealerCode },
    select: { id: true, name: true, type: true, approval_status: true },
  });
  const existingDealerUser = await prisma.businessUser.findUnique({
    where: { email: dealerEmail },
    select: { id: true, organization_id: true, role: true, status: true, display_name: true },
  });

  if (!existingDealerOrg && !existingDealerUser) {
    const passwordHash = await hashPassword(credentials.dealerPass);
    await prisma.$transaction(async (tx) => {
      const org = await tx.businessOrganization.create({
        data: {
          name: 'Demo Dealer Enterprise',
          code: dealerCode,
          type: 'DEALER',
          approval_status: 'APPROVED',
          is_active: true,
          email: dealerEmail,
        },
      });
      await tx.businessUser.create({
        data: {
          organization_id: org.id,
          email: dealerEmail,
          password_hash: passwordHash,
          display_name: 'Demo Dealer User',
          role: 'DEALER',
          status: 'ACTIVE',
        },
      });
    });
    results.created.push(`Dealer Org (${dealerCode}) + Staff (${dealerEmail})`);
  } else if (existingDealerOrg && existingDealerUser) {
    if (
      existingDealerOrg.type !== 'DEALER' ||
      existingDealerUser.role !== 'DEALER' ||
      existingDealerUser.organization_id !== existingDealerOrg.id
    ) {
      throw new Error(`[CONFLICT] Dealer org (${dealerCode}) or user (${dealerEmail}) exists with conflicting linkage.`);
    }
    results.existed.push(`Dealer Org (${dealerCode}) + Staff (${dealerEmail})`);
  } else {
    throw new Error(`[CONFLICT] Partial dealer entity exists: Org=${Boolean(existingDealerOrg)}, User=${Boolean(existingDealerUser)}`);
  }

  // ---------------------------------------------------------------------------
  // 4. Distributor Organization & Staff Persona
  // ---------------------------------------------------------------------------
  const distribCode = 'ORG-DISTRIB-DEMO';
  const distribEmail = 'demo.distributor@camso.local';

  const existingDistribOrg = await prisma.businessOrganization.findUnique({
    where: { code: distribCode },
    select: { id: true, name: true, type: true, approval_status: true },
  });
  const existingDistribUser = await prisma.businessUser.findUnique({
    where: { email: distribEmail },
    select: { id: true, organization_id: true, role: true, status: true, display_name: true },
  });

  if (!existingDistribOrg && !existingDistribUser) {
    const passwordHash = await hashPassword(credentials.distribPass);
    await prisma.$transaction(async (tx) => {
      const org = await tx.businessOrganization.create({
        data: {
          name: 'Demo Distributor Hub',
          code: distribCode,
          type: 'DISTRIBUTOR',
          approval_status: 'APPROVED',
          is_active: true,
          email: distribEmail,
        },
      });
      await tx.businessUser.create({
        data: {
          organization_id: org.id,
          email: distribEmail,
          password_hash: passwordHash,
          display_name: 'Demo Distributor User',
          role: 'DISTRIBUTOR',
          status: 'ACTIVE',
        },
      });
    });
    results.created.push(`Distributor Org (${distribCode}) + Staff (${distribEmail})`);
  } else if (existingDistribOrg && existingDistribUser) {
    if (
      existingDistribOrg.type !== 'DISTRIBUTOR' ||
      existingDistribUser.role !== 'DISTRIBUTOR' ||
      existingDistribUser.organization_id !== existingDistribOrg.id
    ) {
      throw new Error(`[CONFLICT] Distributor org (${distribCode}) or user (${distribEmail}) exists with conflicting linkage.`);
    }
    results.existed.push(`Distributor Org (${distribCode}) + Staff (${distribEmail})`);
  } else {
    throw new Error(`[CONFLICT] Partial distributor entity exists: Org=${Boolean(existingDistribOrg)}, User=${Boolean(existingDistribUser)}`);
  }

  return results;
}

/**
 * Main entry point when invoked via CLI.
 */
async function main() {
  console.log('====================================================');
  console.log('CAMSO Demo Account Seeder — Local Development Only');
  console.log('====================================================');

  validateEnvironment(process.env);
  const credentials = validateDemoCredentials(process.env);

  const prisma = new PrismaClient({ log: ['warn', 'error'] });

  try {
    const { created, existed } = await seedDemoAccounts(prisma, credentials);
    console.log(`\nExecution Summary:`);
    console.log(`  Newly Created: ${created.length}`);
    created.forEach((c) => console.log(`    + ${c}`));
    console.log(`  Already Existed: ${existed.length}`);
    existed.forEach((e) => console.log(`    = ${e}`));
    console.log('\nSeeding completed successfully with zero mutations to unrelated data.');
  } catch (err) {
    console.error(`\n[SEED FAILED] ${err.message}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  REQUIRED_DEMO_ENV_VARS,
  validateEnvironment,
  validateDemoCredentials,
  seedDemoAccounts,
};
