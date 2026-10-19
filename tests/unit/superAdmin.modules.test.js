'use strict';

/**
 * tests/unit/superAdmin.modules.test.js
 *
 * 1. What this file does:
 *    Unit tests for Super Admin audit logs service and system health diagnostics service.
 * 2. Overall design:
 *    Mocks database, repositories, and config dependencies using Jest to verify business logic,
 *    safe error handling, and response structure in isolation.
 * 3. Elements in the file:
 *    - Audit logs service test suite.
 *    - System health diagnostics service test suite.
 * 4. Final output of the file:
 *    Executes Jest assertions verifying Super Admin services.
 */

jest.mock('../../src/config/database', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    product: { count: jest.fn() },
    document: { count: jest.fn() },
    dealer: { count: jest.fn() },
    category: { count: jest.fn() },
    adminUser: { count: jest.fn() },
    businessOrganization: { count: jest.fn() },
  },
}));

jest.mock('../../src/modules/audit-logs/audit-logs.repository', () => ({
  listAuditLogs: jest.fn(),
}));

const { prisma } = require('../../src/config/database');
const auditLogsRepository = require('../../src/modules/audit-logs/audit-logs.repository');
const auditLogsService = require('../../src/modules/audit-logs/audit-logs.service');
const systemHealthService = require('../../src/modules/system-health/system-health.service');

describe('Super Admin Modules Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('audit-logs.service', () => {
    it('parses filters and returns paginated audit log items', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          actor_email: 'superadmin@camso.com',
          action: 'UPDATE',
          entity_type: 'PRODUCT',
          created_at: new Date(),
        },
      ];
      auditLogsRepository.listAuditLogs.mockResolvedValue([1, mockLogs]);

      const result = await auditLogsService.listAuditLogs({
        page: '1',
        pageSize: '10',
        action: 'UPDATE',
        actor_email: 'superadmin@camso.com',
      });

      expect(auditLogsRepository.listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          actor_email: 'superadmin@camso.com',
        }),
        expect.objectContaining({
          page: 1,
          pageSize: 10,
        })
      );
      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe('system-health.service', () => {
    it('returns healthy status when database is reachable', async () => {
      prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      prisma.product.count.mockResolvedValue(42);
      prisma.document.count.mockResolvedValue(15);
      prisma.dealer.count.mockResolvedValue(8);
      prisma.category.count.mockResolvedValue(5);
      prisma.adminUser.count.mockResolvedValue(3);
      prisma.businessOrganization.count.mockResolvedValue(2);

      const health = await systemHealthService.getSystemHealth();

      expect(health.status).toBe('healthy');
      expect(health.database.status).toBe('connected');
      expect(typeof health.database.latency_ms).toBe('number');
      expect(health.counts.products).toBe(42);
      expect(health.counts.documents).toBe(15);
      expect(health.counts.pending_approvals).toBe(2);
      expect(health.system.node_version).toBeDefined();
    });

    it('returns degraded status when database is unreachable without throwing', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Connection timeout'));
      prisma.product.count.mockRejectedValue(new Error('DB unreachable'));
      prisma.document.count.mockRejectedValue(new Error('DB unreachable'));
      prisma.dealer.count.mockRejectedValue(new Error('DB unreachable'));
      prisma.category.count.mockRejectedValue(new Error('DB unreachable'));
      prisma.adminUser.count.mockRejectedValue(new Error('DB unreachable'));
      prisma.businessOrganization.count.mockRejectedValue(new Error('DB unreachable'));

      const health = await systemHealthService.getSystemHealth();

      expect(health.status).toBe('degraded');
      expect(health.database.status).toBe('disconnected');
      expect(health.database.latency_ms).toBeNull();
      expect(health.counts.products).toBe(0);
    });
  });
});
