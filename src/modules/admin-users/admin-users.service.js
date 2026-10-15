'use strict';

/**
 * admin-users.service — Service for Admin CMS user management and business organization approvals.
 */

const repo = require('./admin-users.repository');
const { hashPassword } = require('../../core/utils/password');
const auditService = require('../../core/services/auditService');
const ApiError = require('../../core/utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../../core/utils/pagination');

const VALID_ROLES = ['SUPER_ADMIN', 'CONTENT_ADMIN', 'MARKETING', 'VIEWER'];
const VALID_APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

/**
 * Controlled provisioning of a new admin user by a SUPER_ADMIN.
 */
async function createAdminUser(arg1, arg2) {
  let actor = null;
  let body = null;
  let auditCtx = null;

  if (arg1 && arg1.email && !arg1.password && arg2 && arg2.password) {
    // Called as (actor, { email, password, role })
    actor = arg1;
    body = arg2;
  } else {
    // Called as (body, auditContext)
    body = arg1;
    auditCtx = arg2 || {};
    actor = { id: auditCtx.actorId || null, email: null };
  }

  const { email, password, role, is_active = true } = body;

  if (!email || !email.trim()) {
    throw ApiError.validation('email is required.');
  }

  if (!role || !VALID_ROLES.includes(role)) {
    throw ApiError.badRequest(`Invalid admin role. Allowed roles: ${VALID_ROLES.join(', ')}`);
  }

  if (!password || password.length < 8) {
    throw ApiError.validation('password must be at least 8 characters.');
  }

  const existing = await repo.findAdminByEmail(email.toLowerCase().trim());
  if (existing) {
    throw ApiError.conflict('An admin account with this email already exists.');
  }

  const password_hash = await hashPassword(password);
  const created = await repo.createAdminUser({
    email: email.toLowerCase().trim(),
    password_hash,
    role,
    is_active,
  });

  await auditService.record({
    actorId: actor ? actor.id : null,
    action: 'CREATE',
    entityType: 'ADMIN_USER',
    entityId: created.id,
    before: null,
    after: { id: created.id, email: created.email, role: created.role, is_active: created.is_active },
    ip: auditCtx ? auditCtx.ip : null,
    userAgent: auditCtx ? auditCtx.userAgent : null,
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
async function listAdminUsers(query = {}) {
  const { page, pageSize, skip, take, sort } = parsePagination(query);
  const filters = {};
  if (query.role) filters.role = query.role;
  if (query.is_active !== undefined) {
    filters.is_active = query.is_active === 'true' || query.is_active === true;
  }

  const { total, data } = await repo.findAllAdminUsers(filters, { skip, take, sort });
  const pagination = buildPaginationMeta(page, pageSize, total);

  return {
    items: data,
    data,
    total,
    pagination,
  };
}

/**
 * Get single admin account by ID without password_hash.
 */
async function getAdminUserById(id) {
  const admin = await repo.findAdminUserDetail(id);
  if (!admin) {
    throw ApiError.notFound(`Admin user with ID ${id} not found.`);
  }
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    is_active: admin.is_active,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
  };
}

/**
 * Update admin account (role, is_active).
 */
async function updateAdminUser(id, body, auditContext = {}) {
  const before = await repo.findAdminUserDetail(id);
  if (!before) {
    throw ApiError.notFound(`Admin user with ID ${id} not found.`);
  }

  const updateData = {};
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      throw ApiError.validation(`Invalid role. Allowed roles: ${VALID_ROLES.join(', ')}`);
    }
    updateData.role = body.role;
  }
  if (body.is_active !== undefined) {
    updateData.is_active = Boolean(body.is_active);
  }

  if (Object.keys(updateData).length === 0) {
    throw ApiError.validation('At least one field (role, is_active) is required for update.');
  }

  const after = await repo.updateAdminUser(id, updateData);

  await auditService.record({
    actorId: auditContext.actorId,
    action: 'UPDATE',
    entityType: 'ADMIN_USER',
    entityId: id,
    before: { id: before.id, email: before.email, role: before.role, is_active: before.is_active },
    after: { id: after.id, email: after.email, role: after.role, is_active: after.is_active },
    ip: auditContext.ip,
    userAgent: auditContext.userAgent,
  });

  return after;
}

/**
 * Update admin status (active/inactive).
 */
async function updateAdminStatus(actor, id, { is_active }) {
  if (typeof is_active !== 'boolean') {
    throw ApiError.badRequest('is_active must be a boolean.');
  }

  if (actor && actor.id === id && is_active === false) {
    throw ApiError.badRequest('Super admin cannot deactivate their own account.');
  }

  const existing = await repo.findAdminById(id);
  if (!existing) {
    throw ApiError.notFound('Admin user not found.');
  }

  const updated = await repo.updateAdminStatus(id, is_active);

  const recordFn = auditService.recordAudit || auditService.record;
  await recordFn({
    actorId: actor ? actor.id : null,
    action: 'UPDATE',
    entityType: 'ADMIN_USER',
    entityId: id,
    before: { is_active: existing.is_active },
    after: { is_active: updated.is_active },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Business Organizations Management
// ---------------------------------------------------------------------------

async function listOrganizations({ type, approval_status, page = 1, pageSize = 20 }) {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedPageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const skip = (parsedPage - 1) * parsedPageSize;
  const take = parsedPageSize;

  const { items, total } = await repo.listOrganizations({ type, approval_status, skip, take });
  return {
    items,
    data: items,
    total,
    pagination: buildPaginationMeta(parsedPage, parsedPageSize, total),
  };
}

async function updateOrganizationApproval(actor, id, body = {}) {
  const approval_status = body.approval_status || body.status;
  if (!approval_status || !VALID_APPROVAL_STATUSES.includes(approval_status)) {
    throw ApiError.badRequest(`Invalid approval status. Allowed: ${VALID_APPROVAL_STATUSES.join(', ')}`);
  }

  const existing = await repo.findOrganizationById(id);
  if (!existing) {
    throw ApiError.notFound('Business organization not found.');
  }

  const updated = await repo.updateOrganizationApproval(id, approval_status);

  const recordFn = auditService.recordAudit || auditService.record;
  await recordFn({
    actorId: actor ? actor.id : null,
    action: 'STATUS_CHANGE',
    entityType: 'BUSINESS_ORGANIZATION',
    entityId: id,
    before: { approval_status: existing.approval_status },
    after: { approval_status: updated.approval_status },
    details: { approval_status },
  });

  return updated;
}

const adminUsersService = {
  createAdminUser,
  listAdminUsers,
  getAdminUserById,
  updateAdminUser,
  updateAdminStatus,
  listOrganizations,
  updateOrganizationApproval,
};

module.exports = adminUsersService;
