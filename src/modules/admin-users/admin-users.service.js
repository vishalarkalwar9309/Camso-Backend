'use strict';

/**
 * admin-users.service — Service for Admin CMS user management and business organization approvals.
 */

const repo = require('./admin-users.repository');
const { hashPassword } = require('../../core/utils/password');
const { recordAudit } = require('../../core/services/auditService');
const ApiError = require('../../core/utils/ApiError');

const VALID_ROLES = ['SUPER_ADMIN', 'CONTENT_ADMIN', 'MARKETING', 'VIEWER'];
const VALID_APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

/**
 * Controlled provisioning of a new admin user by a SUPER_ADMIN.
 */
async function createAdminUser(actor, { email, password, role }) {
  if (!role || !VALID_ROLES.includes(role)) {
    throw ApiError.badRequest(`Invalid admin role. Allowed roles: ${VALID_ROLES.join(', ')}`);
  }

  const existing = await repo.findAdminByEmail(email);
  if (existing) {
    throw ApiError.conflict('An admin account with this email already exists.');
  }

  const password_hash = await hashPassword(password);
  const created = await repo.createAdminUser({ email, password_hash, role });

  await recordAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'CREATE',
    entityType: 'ADMIN_USER',
    entityId: created.id,
    details: { email: created.email, role: created.role },
  });

  return {
    id: created.id,
    email: created.email,
    role: created.role,
    is_active: created.is_active,
    created_at: created.created_at,
  };
}

/**
 * List admin users.
 */
async function listAdminUsers({ page = 1, pageSize = 20 }) {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedPageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const skip = (parsedPage - 1) * parsedPageSize;
  const take = parsedPageSize;

  const { items, total } = await repo.listAdminUsers({ skip, take });
  return {
    items,
    pagination: {
      page: parsedPage,
      pageSize: parsedPageSize,
      total,
      totalPages: Math.ceil(total / parsedPageSize),
    },
  };
}

/**
 * Update admin active/deactivated status.
 */
async function updateAdminStatus(actor, targetAdminId, { is_active }) {
  if (typeof is_active !== 'boolean') {
    throw ApiError.badRequest('is_active must be a boolean.');
  }

  // Prevent self-deactivation by super admin
  if (actor.id === targetAdminId && !is_active) {
    throw ApiError.badRequest('Administrators cannot deactivate their own account.');
  }

  const existing = await repo.findAdminById(targetAdminId);
  if (!existing) {
    throw ApiError.notFound('Admin user not found.');
  }

  const updated = await repo.updateAdminStatus(targetAdminId, is_active);

  await recordAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'STATUS_CHANGE',
    entityType: 'ADMIN_USER',
    entityId: targetAdminId,
    details: { is_active },
  });

  return updated;
}

/**
 * List business organizations (Dealers & Distributors) for approval/monitoring.
 */
async function listOrganizations({ type, approval_status, page = 1, pageSize = 20 }) {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedPageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const skip = (parsedPage - 1) * parsedPageSize;
  const take = parsedPageSize;

  const { items, total } = await repo.listOrganizations({ type, approval_status, skip, take });
  return {
    items,
    pagination: {
      page: parsedPage,
      pageSize: parsedPageSize,
      total,
      totalPages: Math.ceil(total / parsedPageSize),
    },
  };
}

/**
 * Update an organization's approval status (Approve, Reject, or Suspend).
 */
async function updateOrganizationApproval(actor, orgId, { approval_status }) {
  if (!approval_status || !VALID_APPROVAL_STATUSES.includes(approval_status)) {
    throw ApiError.badRequest(`Invalid approval status. Allowed: ${VALID_APPROVAL_STATUSES.join(', ')}`);
  }

  const existing = await repo.findOrganizationById(orgId);
  if (!existing) {
    throw ApiError.notFound('Business organization not found.');
  }

  const updated = await repo.updateOrganizationApproval(orgId, approval_status);

  await recordAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'STATUS_CHANGE',
    entityType: 'BUSINESS_ORGANIZATION',
    entityId: orgId,
    details: { approval_status, organization_name: existing.name, type: existing.type },
  });

  return updated;
}

module.exports = {
  createAdminUser,
  listAdminUsers,
  updateAdminStatus,
  listOrganizations,
  updateOrganizationApproval,
};
