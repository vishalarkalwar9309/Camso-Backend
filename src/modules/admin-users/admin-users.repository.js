'use strict';

/**
 * admin-users.repository — Prisma operations for managing admin accounts and organizations.
 */

const { prisma } = require('../../config/database');
const { parseSort } = require('../../core/utils/pagination');

async function createAdminUser(data) {
  return prisma.adminUser.create({
    data: {
      email: data.email,
      password_hash: data.password_hash,
      role: data.role,
      is_active: data.is_active !== undefined ? data.is_active : true,
    },
    select: {
      id: true,
      email: true,
      role: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });
}

async function findAdminByEmail(email) {
  return prisma.adminUser.findUnique({
    where: { email },
  });
}

async function findByEmail(email) {
  return prisma.adminUser.findFirst({
    where: { email },
    select: { id: true, email: true },
  });
}

async function findAdminById(id) {
  return prisma.adminUser.findUnique({
    where: { id: String(id) },
  });
}

async function findAdminUserDetail(id) {
  return prisma.adminUser.findUnique({
    where: { id: String(id) },
    select: { id: true, email: true, role: true, is_active: true, created_at: true, updated_at: true },
  });
}

async function listAdminUsers({ skip = 0, take = 20 }) {
  const [items, total] = await Promise.all([
    prisma.adminUser.findMany({
      skip,
      take,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    }),
    prisma.adminUser.count(),
  ]);

  return { items, total };
}

async function findAllAdminUsers(filters = {}, pagination = {}) {
  const ALLOWED_SORT = ['id', 'email', 'role', 'is_active', 'created_at'];
  const where = {};
  if (filters.role) where.role = filters.role;
  if (typeof filters.is_active === 'boolean') where.is_active = filters.is_active;

  const { orderBy } = parseSort(pagination.sort, ALLOWED_SORT, 'created_at', 'desc');
  const [total, data] = await prisma.$transaction([
    prisma.adminUser.count({ where }),
    prisma.adminUser.findMany({
      where,
      skip: pagination.skip || 0,
      take: pagination.take || 20,
      orderBy,
      select: { id: true, email: true, role: true, is_active: true, created_at: true, updated_at: true },
    }),
  ]);
  return { total, data };
}

async function updateAdminStatus(id, is_active) {
  return prisma.$transaction(async (tx) => {
    const admin = await tx.adminUser.update({
      where: { id: String(id) },
      data: { is_active },
      select: {
        id: true,
        email: true,
        role: true,
        is_active: true,
        updated_at: true,
      },
    });

    if (!is_active) {
      await tx.adminRefreshToken.updateMany({
        where: { admin_id: String(id), revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }

    return admin;
  });
}

async function updateAdminUser(id, data) {
  return prisma.adminUser.update({
    where: { id: String(id) },
    data,
    select: { id: true, email: true, role: true, is_active: true, created_at: true, updated_at: true },
  });
}

async function revokeAdminSessions(id) {
  const result = await prisma.adminRefreshToken.updateMany({
    where: { admin_id: String(id), revoked_at: null },
    data: { revoked_at: new Date() },
  });
  return { revokedCount: result.count };
}

// ---------------------------------------------------------------------------
// Organizations (Dealers & Distributors) Management
// ---------------------------------------------------------------------------

async function listOrganizations({ type, approval_status, skip = 0, take = 20 }) {
  const where = {
    ...(type ? { type } : {}),
    ...(approval_status ? { approval_status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.businessOrganization.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        members: {
          select: {
            id: true,
            email: true,
            display_name: true,
            role: true,
            status: true,
          },
        },
      },
    }),
    prisma.businessOrganization.count({ where }),
  ]);

  return { items, total };
}

async function updateOrganizationApproval(id, approval_status) {
  return prisma.$transaction(async (tx) => {
    const org = await tx.businessOrganization.update({
      where: { id: String(id) },
      data: {
        approval_status,
        is_active: approval_status === 'APPROVED',
      },
    });

    if (approval_status === 'SUSPENDED' || approval_status === 'REJECTED') {
      const members = await tx.businessUser.findMany({
        where: { organization_id: String(id) },
        select: { id: true },
      });
      const memberIds = members.map((m) => m.id);

      if (memberIds.length > 0) {
        await tx.businessUser.updateMany({
          where: { organization_id: String(id) },
          data: { status: 'SUSPENDED' },
        });

        await tx.businessRefreshToken.updateMany({
          where: { business_user_id: { in: memberIds }, revoked_at: null },
          data: { revoked_at: new Date() },
        });
      }
    } else if (approval_status === 'APPROVED') {
      await tx.businessUser.updateMany({
        where: { organization_id: String(id) },
        data: { status: 'ACTIVE' },
      });
    }

    return org;
  });
}

async function findOrganizationById(id) {
  return prisma.businessOrganization.findUnique({
    where: { id: String(id) },
    include: {
      members: {
        select: { id: true, email: true, display_name: true, role: true, status: true },
      },
    },
  });
}

const adminUsersRepository = {
  createAdminUser,
  findAdminByEmail,
  findByEmail,
  findAdminById,
  findAdminUserDetail,
  listAdminUsers,
  findAllAdminUsers,
  updateAdminStatus,
  updateAdminUser,
  revokeAdminSessions,
  listOrganizations,
  updateOrganizationApproval,
  findOrganizationById,
};

module.exports = adminUsersRepository;
