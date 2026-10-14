'use strict';

/**
 * admin-users.service.test.js — Unit tests for Admin User provisioning and Organization approvals.
 */

const service = require('../../src/modules/admin-users/admin-users.service');
const repo = require('../../src/modules/admin-users/admin-users.repository');
const { recordAudit } = require('../../src/core/services/auditService');

jest.mock('../../src/modules/admin-users/admin-users.repository');
jest.mock('../../src/core/services/auditService');

describe('Admin Users & Organizations Management Service (Unit Tests)', () => {
  const superActor = { id: 'super-admin-1', email: 'super@ceat.com' };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAdminUser', () => {
    it('throws 400 on invalid role', async () => {
      await expect(
        service.createAdminUser(superActor, {
          email: 'new@ceat.com',
          password: 'Password123!',
          role: 'INVALID_ROLE',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/invalid admin role/i),
      });
    });

    it('throws 409 if admin email already exists', async () => {
      repo.findAdminByEmail.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.createAdminUser(superActor, {
          email: 'duplicate@ceat.com',
          password: 'Password123!',
          role: 'CONTENT_ADMIN',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringMatching(/already exists/i),
      });
    });

    it('successfully provisions new admin user and records audit log', async () => {
      repo.findAdminByEmail.mockResolvedValue(null);
      repo.createAdminUser.mockResolvedValue({
        id: 'new-admin-cuid',
        email: 'editor@ceat.com',
        role: 'CONTENT_ADMIN',
        is_active: true,
        created_at: new Date(),
      });
      recordAudit.mockResolvedValue({});

      const res = await service.createAdminUser(superActor, {
        email: 'editor@ceat.com',
        password: 'Password123!',
        role: 'CONTENT_ADMIN',
      });

      expect(res.id).toBe('new-admin-cuid');
      expect(res.role).toBe('CONTENT_ADMIN');
      expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE',
        entityType: 'ADMIN_USER',
        entityId: 'new-admin-cuid',
      }));
    });
  });

  describe('updateAdminStatus', () => {
    it('throws 400 if super admin tries to deactivate self', async () => {
      await expect(
        service.updateAdminStatus(superActor, 'super-admin-1', { is_active: false })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/cannot deactivate their own account/i),
      });
    });

    it('successfully deactivates other admin', async () => {
      repo.findAdminById.mockResolvedValue({ id: 'target-admin' });
      repo.updateAdminStatus.mockResolvedValue({
        id: 'target-admin',
        is_active: false,
      });
      recordAudit.mockResolvedValue({});

      const res = await service.updateAdminStatus(superActor, 'target-admin', { is_active: false });

      expect(res.is_active).toBe(false);
      expect(repo.updateAdminStatus).toHaveBeenCalledWith('target-admin', false);
    });
  });

  describe('updateOrganizationApproval', () => {
    it('throws 400 on invalid approval status', async () => {
      await expect(
        service.updateOrganizationApproval(superActor, 'org-1', { approval_status: 'UNKNOWN_STATUS' })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/invalid approval status/i),
      });
    });

    it('successfully approves a dealer organization', async () => {
      repo.findOrganizationById.mockResolvedValue({
        id: 'org-1',
        name: 'Authorized Dealer 1',
        type: 'DEALER',
        approval_status: 'PENDING',
      });
      repo.updateOrganizationApproval.mockResolvedValue({
        id: 'org-1',
        name: 'Authorized Dealer 1',
        approval_status: 'APPROVED',
        is_active: true,
      });
      recordAudit.mockResolvedValue({});

      const res = await service.updateOrganizationApproval(superActor, 'org-1', { approval_status: 'APPROVED' });

      expect(res.approval_status).toBe('APPROVED');
      expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'STATUS_CHANGE',
        entityType: 'BUSINESS_ORGANIZATION',
        entityId: 'org-1',
      }));
    });
  });
});
