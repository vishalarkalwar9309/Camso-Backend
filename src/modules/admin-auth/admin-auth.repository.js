'use strict';

/**
 * admin-auth.repository — Prisma operations for admin user authentication.
 */

const prisma = require('../../config/database');

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

async function createAdminRefreshToken({ admin_id, token_hash, expires_at }) {
  return prisma.adminRefreshToken.create({
    data: {
      admin_id,
      token_hash,
      expires_at,
    },
  });
}

async function findAdminRefreshTokenByHash(token_hash) {
  return prisma.adminRefreshToken.findUnique({
    where: { token_hash },
  });
}

async function rotateAdminRefreshToken({ oldTokenId, newTokenData }) {
  return prisma.$transaction([
    prisma.adminRefreshToken.update({
      where: { id: oldTokenId },
      data: { revoked_at: new Date() },
    }),
    prisma.adminRefreshToken.create({
      data: {
        admin_id: newTokenData.admin_id,
        token_hash: newTokenData.token_hash,
        expires_at: newTokenData.expires_at,
      },
    }),
  ]);
}

async function revokeAdminRefreshToken(token_hash) {
  return prisma.adminRefreshToken.updateMany({
    where: { token_hash, revoked_at: null },
    data: { revoked_at: new Date() },
  });
}

module.exports = {
  findAdminByEmail,
  findAdminById,
  createAdminRefreshToken,
  findAdminRefreshTokenByHash,
  rotateAdminRefreshToken,
  revokeAdminRefreshToken,
};
