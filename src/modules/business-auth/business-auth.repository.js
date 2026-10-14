'use strict';

/**
 * business-auth.repository — Prisma operations for Dealer and Distributor authentication.
 */

const prisma = require('../../config/database');

async function registerBusinessOrganization({ orgData, userData }) {
  const normalizedType = orgData.type === 'OEM' ? 'OEM_PARTNER' : orgData.type;
  return prisma.$transaction(async (tx) => {
    const organization = await tx.businessOrganization.create({
      data: {
        name: orgData.name,
        code: orgData.code || null,
        type: normalizedType,
        approval_status: 'PENDING',
        is_active: false,
        address: orgData.address || null,
        city: orgData.city || null,
        state: orgData.state || null,
        country: orgData.country || null,
        phone: orgData.phone || null,
        email: orgData.email || null,
      },
    });

    const user = await tx.businessUser.create({
      data: {
        organization_id: organization.id,
        email: userData.email,
        password_hash: userData.password_hash,
        display_name: userData.display_name || null,
        phone: userData.phone || null,
        role: normalizedType,
        status: 'PENDING',
      },
    });

    return { organization, user };
  });
}

async function findBusinessUserByEmail(email) {
  return prisma.businessUser.findUnique({
    where: { email },
    include: {
      organization: true,
    },
  });
}

async function findBusinessUserById(id) {
  return prisma.businessUser.findUnique({
    where: { id },
    include: {
      organization: true,
    },
  });
}

async function createBusinessRefreshToken({ business_user_id, token_hash, expires_at }) {
  return prisma.businessRefreshToken.create({
    data: {
      business_user_id,
      token_hash,
      expires_at,
    },
  });
}

async function findBusinessRefreshTokenByHash(token_hash) {
  return prisma.businessRefreshToken.findUnique({
    where: { token_hash },
  });
}

async function rotateBusinessRefreshToken({ oldTokenId, newTokenData }) {
  return prisma.$transaction([
    prisma.businessRefreshToken.update({
      where: { id: oldTokenId },
      data: { revoked_at: new Date() },
    }),
    prisma.businessRefreshToken.create({
      data: {
        business_user_id: newTokenData.business_user_id,
        token_hash: newTokenData.token_hash,
        expires_at: newTokenData.expires_at,
      },
    }),
  ]);
}

async function revokeBusinessRefreshToken(token_hash) {
  return prisma.businessRefreshToken.updateMany({
    where: { token_hash, revoked_at: null },
    data: { revoked_at: new Date() },
  });
}

module.exports = {
  registerBusinessOrganization,
  findBusinessUserByEmail,
  findBusinessUserById,
  createBusinessRefreshToken,
  findBusinessRefreshTokenByHash,
  rotateBusinessRefreshToken,
  revokeBusinessRefreshToken,
};
