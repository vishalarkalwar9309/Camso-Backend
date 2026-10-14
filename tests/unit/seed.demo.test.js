'use strict';

/**
 * Unit tests for demo account seeder (prisma/seed.demo.js).
 *
 * Tests:
 * 1. Environment validation safeguards (NODE_ENV, non-local DB, prod DB).
 * 2. Fail-closed credential validation (missing/empty env vars).
 * 3. Create-if-absent idempotency (new vs existing entities).
 * 4. Conflict detection and abort behavior.
 */

const {
  validateEnvironment,
  validateDemoCredentials,
  seedDemoAccounts,
  REQUIRED_DEMO_ENV_VARS,
} = require('../../prisma/seed.demo');

describe('prisma/seed.demo.js unit tests', () => {
  describe('Environment Validation (validateEnvironment)', () => {
    it('throws if NODE_ENV is production or missing', () => {
      expect(() => validateEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://localhost:5432/camso' })).toThrow(
        /Refusing to seed database: NODE_ENV must be explicitly "development" or "test"/
      );
      expect(() => validateEnvironment({ DATABASE_URL: 'postgresql://localhost:5432/camso' })).toThrow(
        /Refusing to seed database: NODE_ENV must be explicitly "development" or "test"/
      );
    });

    it('throws if DATABASE_URL is missing or malformed', () => {
      expect(() => validateEnvironment({ NODE_ENV: 'development' })).toThrow(
        /DATABASE_URL is not set/
      );
      expect(() => validateEnvironment({ NODE_ENV: 'development', DATABASE_URL: 'not-a-valid-url' })).toThrow(
        /Malformed DATABASE_URL/
      );
      expect(() => validateEnvironment({ NODE_ENV: 'development', DATABASE_URL: 'mysql://localhost:3306/camso' })).toThrow(
        /Protocol must be postgresql/
      );
    });

    it('throws if DATABASE_URL is not a local host', () => {
      expect(() =>
        validateEnvironment({
          NODE_ENV: 'development',
          DATABASE_URL: 'postgresql://camso:pass@db.external-host.com:5432/camso',
        })
      ).toThrow(/does not point to a local host/);
    });

    it('throws if DATABASE_URL contains production keywords', () => {
      expect(() =>
        validateEnvironment({
          NODE_ENV: 'development',
          DATABASE_URL: 'postgresql://camso:pass@localhost:5432/camso_production',
        })
      ).toThrow(/appears to target production/);
    });

    it('passes for valid development environment and local database', () => {
      expect(() =>
        validateEnvironment({
          NODE_ENV: 'development',
          DATABASE_URL: 'postgresql://camso:pass@localhost:5432/camso',
        })
      ).not.toThrow();

      expect(() =>
        validateEnvironment({
          NODE_ENV: 'test',
          DATABASE_URL: 'postgresql://camso:pass@127.0.0.1:5432/camso_test',
        })
      ).not.toThrow();
    });
  });

  describe('Credential Validation (validateDemoCredentials)', () => {
    it('fails closed if any of the required variables is missing or empty', () => {
      const incompleteEnv = {
        DEMO_CUSTOMER_PASSWORD: 'Pass1',
        DEMO_ADMIN_PASSWORD: 'Pass2',
        DEMO_DEALER_PASSWORD: '', // empty
        // DEMO_DISTRIBUTOR_PASSWORD missing
      };

      expect(() => validateDemoCredentials(incompleteEnv)).toThrow(/FAIL CLOSED: Missing required demo credential/);
      expect(() => validateDemoCredentials(incompleteEnv)).toThrow(/DEMO_DEALER_PASSWORD/);
      expect(() => validateDemoCredentials(incompleteEnv)).toThrow(/DEMO_DISTRIBUTOR_PASSWORD/);
    });

    it('returns trimmed credential object when all 4 are present', () => {
      const validEnv = {
        DEMO_CUSTOMER_PASSWORD: 'CustomerPass123!',
        DEMO_ADMIN_PASSWORD: 'AdminPass123!',
        DEMO_DEALER_PASSWORD: 'DealerPass123!',
        DEMO_DISTRIBUTOR_PASSWORD: 'DistribPass123!',
      };

      const result = validateDemoCredentials(validEnv);
      expect(result).toEqual({
        customerPass: 'CustomerPass123!',
        adminPass: 'AdminPass123!',
        dealerPass: 'DealerPass123!',
        distribPass: 'DistribPass123!',
      });
    });
  });

  describe('Seeder Logic & Idempotency (seedDemoAccounts)', () => {
    let mockPrisma;
    const testCredentials = {
      customerPass: 'CustPass123',
      adminPass: 'AdminPass123',
      dealerPass: 'DealerPass123',
      distribPass: 'DistribPass123',
    };

    beforeEach(() => {
      mockPrisma = {
        user: {
          findUnique: jest.fn(),
          create: jest.fn().mockResolvedValue({ id: 'cust_1' }),
        },
        adminUser: {
          findUnique: jest.fn(),
          create: jest.fn().mockResolvedValue({ id: 'admin_1' }),
        },
        businessOrganization: {
          findUnique: jest.fn(),
          create: jest.fn().mockResolvedValue({ id: 'org_1' }),
        },
        businessUser: {
          findUnique: jest.fn(),
          create: jest.fn().mockResolvedValue({ id: 'buser_1' }),
        },
        $transaction: jest.fn(async (cb) => {
          return cb(mockPrisma);
        }),
      };
    });

    it('creates all 4 entities when none exist (first run)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);
      mockPrisma.businessOrganization.findUnique.mockResolvedValue(null);
      mockPrisma.businessUser.findUnique.mockResolvedValue(null);

      const result = await seedDemoAccounts(mockPrisma, testCredentials);

      expect(result.created).toHaveLength(4);
      expect(result.existed).toHaveLength(0);
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.adminUser.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2); // dealer + distributor
    });

    it('skips all 4 entities when all already exist with matching demo identity (idempotent)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'c1',
        display_name: 'Demo Customer',
        is_guest: false,
      });
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: 'a1',
        role: 'SUPER_ADMIN',
      });
      mockPrisma.businessOrganization.findUnique
        .mockResolvedValueOnce({ id: 'org_d', name: 'Demo Dealer Enterprise', type: 'DEALER' })
        .mockResolvedValueOnce({ id: 'org_dist', name: 'Demo Distributor Hub', type: 'DISTRIBUTOR' });
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce({ id: 'u_d', organization_id: 'org_d', role: 'DEALER' })
        .mockResolvedValueOnce({ id: 'u_dist', organization_id: 'org_dist', role: 'DISTRIBUTOR' });

      const result = await seedDemoAccounts(mockPrisma, testCredentials);

      expect(result.created).toHaveLength(0);
      expect(result.existed).toHaveLength(4);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.adminUser.create).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws conflict error and aborts if customer email exists for an unrelated identity', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'other_user',
        display_name: 'John Doe', // not Demo Customer
        is_guest: false,
      });

      await expect(seedDemoAccounts(mockPrisma, testCredentials)).rejects.toThrow(
        /\[CONFLICT\] Email demo.customer@camso.local exists but identity details do not match/
      );
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('throws conflict error and aborts if admin email exists with wrong role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: 'other_admin',
        role: 'VIEWER', // not SUPER_ADMIN
      });

      await expect(seedDemoAccounts(mockPrisma, testCredentials)).rejects.toThrow(
        /\[CONFLICT\] Email demo.admin@camso.local exists with unexpected role: VIEWER/
      );
    });

    it('throws conflict error if dealer org exists without user or mismatched linkage', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);
      mockPrisma.businessOrganization.findUnique.mockResolvedValue({
        id: 'org_1',
        type: 'DEALER',
      });
      mockPrisma.businessUser.findUnique.mockResolvedValue(null); // missing staff

      await expect(seedDemoAccounts(mockPrisma, testCredentials)).rejects.toThrow(
        /\[CONFLICT\] Partial dealer entity exists/
      );
    });
  });
});
