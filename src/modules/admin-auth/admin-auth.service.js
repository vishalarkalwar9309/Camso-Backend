'use strict';

/**
 * admin-auth.service — Business logic for Admin authentication and session lifecycle.
 */

const repo = require('./admin-auth.repository');
const { comparePassword } = require('../../core/utils/password');
const {
  generateAdminAccessToken,
  generateRawRefreshToken,
  hashRefreshToken,
  buildRefreshTokenExpiry,
} = require('../../core/utils/tokenService');
const { recordAudit } = require('../../core/services/auditService');
const ApiError = require('../../core/utils/ApiError');

function safeAdmin(admin) {
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    is_active: admin.is_active,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
  };
}

async function _issueAdminTokenPair(admin) {
  const accessToken = generateAdminAccessToken({
    sub: admin.id,
    email: admin.email,
    role: admin.role,
  });
  const rawRefresh = generateRawRefreshToken();
  const tokenHash = hashRefreshToken(rawRefresh);
  const expiresAt = buildRefreshTokenExpiry();

  await repo.createAdminRefreshToken({
    admin_id: admin.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  return { access_token: accessToken, refresh_token: rawRefresh };
}

/**
 * Admin login with email & password.
 */
async function login({ email, password }) {
  const INVALID_MSG = 'Invalid admin email or password.';

  const admin = await repo.findAdminByEmail(email);
  if (!admin) {
    throw ApiError.unauthorized(INVALID_MSG);
  }

  if (admin.is_active === false) {
    throw ApiError.forbidden('Admin account is deactivated. Please contact an administrator.');
  }

  const matches = await comparePassword(password, admin.password_hash);
  if (!matches) {
    throw ApiError.unauthorized(INVALID_MSG);
  }

  const tokens = await _issueAdminTokenPair(admin);

  // Record audit log
  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: 'LOGIN',
    entityType: 'ADMIN_SESSION',
    details: { role: admin.role },
  });

  return {
    tokens,
    admin: safeAdmin(admin),
  };
}

/**
 * Refresh an admin access token using a valid admin refresh token.
 */
async function refresh({ refresh_token: rawToken }) {
  const INVALID_MSG = 'Invalid or expired admin refresh token.';

  const tokenHash = hashRefreshToken(rawToken);
  const stored = await repo.findAdminRefreshTokenByHash(tokenHash);

  if (!stored) throw ApiError.unauthorized(INVALID_MSG);
  if (stored.revoked_at) throw ApiError.unauthorized(INVALID_MSG);
  if (stored.expires_at < new Date()) throw ApiError.unauthorized(INVALID_MSG);

  const admin = await repo.findAdminById(stored.admin_id);
  if (!admin || admin.is_active === false) {
    throw ApiError.unauthorized(INVALID_MSG);
  }

  const newRaw = generateRawRefreshToken();
  const newHash = hashRefreshToken(newRaw);
  const newExpiry = buildRefreshTokenExpiry();

  await repo.rotateAdminRefreshToken({
    oldTokenId: stored.id,
    newTokenData: {
      admin_id: stored.admin_id,
      token_hash: newHash,
      expires_at: newExpiry,
    },
  });

  const accessToken = generateAdminAccessToken({
    sub: admin.id,
    email: admin.email,
    role: admin.role,
  });

  return {
    tokens: {
      access_token: accessToken,
      refresh_token: newRaw,
    },
  };
}

/**
 * Revoke an admin refresh token on logout.
 */
async function logout({ refresh_token: rawToken }) {
  if (!rawToken) {
    throw ApiError.badRequest('refresh_token is required for logout.');
  }
  const tokenHash = hashRefreshToken(rawToken);
  await repo.revokeAdminRefreshToken(tokenHash);
  return { message: 'Admin logged out successfully.' };
}

/**
 * Get current admin user profile.
 */
async function getMe(adminId) {
  const admin = await repo.findAdminById(adminId);
  if (!admin) {
    throw ApiError.notFound('Admin user not found.');
  }
  return safeAdmin(admin);
}

module.exports = {
  login,
  refresh,
  logout,
  getMe,
};
