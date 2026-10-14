'use strict';

/**
 * admin-users.repository — Prisma operations for managing admin accounts and organizations.
 */

const prisma = require('../../config/database');

async function createAdminUser({ email, password_hash, role }) {
  return prisma.adminUser.create({
    data: {
      email,
      password_hash,
      role,
      is_active: true,
    },
  });
}

async function findAdminByEmail(email) {
  return prisma.adminUser.findUnique({
    where: { email },
  });
}

async function findAdminById(id) {
  return prisma.adminUser.findUnique({
    where: { id },
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

async function updateAdminStatus(id, is_active) {
  return prisma.$transaction(async (tx) => {
    const admin = await tx.adminUser.update({
      where: { id },
      data: { is_active },
      select: {
        id: true,
        email: true,
        role: true,
        is_active: true,
        updated_at: true,
      },
    });

    // If deactivated, revoke all active refresh tokens immediately
    if (!is_active) {
      await tx.adminRefreshToken.updateMany({
        where: { admin_id: id, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }

    return admin;
  });
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
      where: { id },
      data: {
        approval_status,
        is_active: approval_status === 'APPROVED',
      },
    });

    // If suspended or rejected, suspend all staff and revoke refresh tokens
    if (approval_status === 'SUSPENDED' || approval_status === 'REJECTED') {
      const members = await tx.businessUser.findMany({
        where: { organization_id: id },
        select: { id: true },
      });
      const memberIds = members.map((m) => m.id);

      if (memberIds.length > 0) {
        await tx.businessUser.updateMany({
          where: { organization_id: id },
          data: { status: 'SUSPENDED' },
        });

        await tx.businessRefreshToken.updateMany({
          where: { business_user_id: { in: memberIds }, revoked_at: null },
          data: { revoked_at: new Date() },
        });
      }
    } else if (approval_status === 'APPROVED') {
      // Activate members
      await tx.businessUser.updateMany({
        where: { organization_id: id },
        data: { status: 'ACTIVE' },
      });
    }

    return org;
  });
}

async function findOrganizationById(id) {
  return prisma.businessOrganization.findUnique({
    where: { id },
    include: {
      members: {
        select: { id: true, email: true, display_name: true, role: true, status: true },
      },
    },
  });
}

module.exports = {
  createAdminUser,
  findAdminByEmail,
  findAdminById,
  listAdminUsers,
  updateAdminStatus,
  listOrganizations,
  updateOrganizationApproval,
  findOrganizationById,
};
