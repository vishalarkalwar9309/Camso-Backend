'use strict';

/**
 * business-auth.service — Authentication and session lifecycle for Dealer and Distributor accounts.
 */

const repo = require('./business-auth.repository');
const { hashPassword, comparePassword } = require('../../core/utils/password');
const {
  generateBusinessAccessToken,
  generateRawRefreshToken,
  hashRefreshToken,
  buildRefreshTokenExpiry,
} = require('../../core/utils/tokenService');
const ApiError = require('../../core/utils/ApiError');

function safeBusinessUser(user) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    phone: user.phone,
    role: user.role,
    status: user.status,
    organization_id: user.organization_id,
    created_at: user.created_at,
  };
}

function safeOrganization(org) {
  return {
    id: org.id,
    name: org.name,
    code: org.code,
    type: org.type,
    approval_status: org.approval_status,
    is_active: org.is_active,
    city: org.city,
    state: org.state,
    country: org.country,
    phone: org.phone,
    email: org.email,
  };
}

async function _issueBusinessTokenPair(user) {
  const accessToken = generateBusinessAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    org_id: user.organization_id,
  });
  const rawRefresh = generateRawRefreshToken();
  const tokenHash = hashRefreshToken(rawRefresh);
  const expiresAt = buildRefreshTokenExpiry();

  await repo.createBusinessRefreshToken({
    business_user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  return { access_token: accessToken, refresh_token: rawRefresh };
}

/**
 * Register a new business organization (Dealer or Distributor) with initial staff account.
 */
async function register({ organization, user }) {
  const existing = await repo.findBusinessUserByEmail(user.email);
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.');
  }

  const password_hash = await hashPassword(user.password);
  const result = await repo.registerBusinessOrganization({
    orgData: organization,
    userData: {
      ...user,
      password_hash,
    },
  });

  return {
    message: 'Business registration submitted successfully. Your account is pending administrator approval.',
    organization: safeOrganization(result.organization),
    user: safeBusinessUser(result.user),
  };
}

/**
 * Authenticate dealer or distributor staff.
 */
async function login({ email, password }) {
  const INVALID_MSG = 'Invalid business email or password.';

  const user = await repo.findBusinessUserByEmail(email);
  if (!user) {
    throw ApiError.unauthorized(INVALID_MSG);
  }

  const matches = await comparePassword(password, user.password_hash);
  if (!matches) {
    throw ApiError.unauthorized(INVALID_MSG);
  }

  // Validate User Account Status
  if (user.status === 'PENDING') {
    throw ApiError.forbidden('Your account is pending administrator approval.');
  }
  if (user.status === 'SUSPENDED') {
    throw ApiError.forbidden('Your account has been suspended. Please contact support.');
  }

  // Validate Organization Approval Status
  const org = user.organization;
  if (!org) {
    throw ApiError.forbidden('No organization associated with this account.');
  }
  if (org.approval_status === 'PENDING') {
    throw ApiError.forbidden('Your organization is pending administrator approval.');
  }
  if (org.approval_status === 'REJECTED') {
    throw ApiError.forbidden('Your organization registration was rejected.');
  }
  if (org.approval_status === 'SUSPENDED' || !org.is_active) {
    throw ApiError.forbidden('Your organization has been suspended. Please contact support.');
  }

  const tokens = await _issueBusinessTokenPair(user);

  return {
    tokens,
    user: safeBusinessUser(user),
    organization: safeOrganization(org),
  };
}

/**
 * Refresh a business access token using a valid business refresh token.
 */
async function refresh({ refresh_token: rawToken }) {
  const INVALID_MSG = 'Invalid or expired business refresh token.';

  const tokenHash = hashRefreshToken(rawToken);
  const stored = await repo.findBusinessRefreshTokenByHash(tokenHash);

  if (!stored) throw ApiError.unauthorized(INVALID_MSG);
  if (stored.revoked_at) throw ApiError.unauthorized(INVALID_MSG);
  if (stored.expires_at < new Date()) throw ApiError.unauthorized(INVALID_MSG);

  const user = await repo.findBusinessUserById(stored.business_user_id);
  if (!user || user.status !== 'ACTIVE' || !user.organization || user.organization.approval_status !== 'APPROVED') {
    throw ApiError.unauthorized(INVALID_MSG);
  }

  const newRaw = generateRawRefreshToken();
  const newHash = hashRefreshToken(newRaw);
  const newExpiry = buildRefreshTokenExpiry();

  await repo.rotateBusinessRefreshToken({
    oldTokenId: stored.id,
    newTokenData: {
      business_user_id: stored.business_user_id,
      token_hash: newHash,
      expires_at: newExpiry,
    },
  });

  const accessToken = generateBusinessAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    org_id: user.organization_id,
  });

  return {
    tokens: {
      access_token: accessToken,
      refresh_token: newRaw,
    },
  };
}

/**
 * Revoke a business refresh token on logout.
 */
async function logout({ refresh_token: rawToken }) {
  if (!rawToken) {
    throw ApiError.badRequest('refresh_token is required for logout.');
  }
  const tokenHash = hashRefreshToken(rawToken);
  await repo.revokeBusinessRefreshToken(tokenHash);
  return { message: 'Business user logged out successfully.' };
}

/**
 * Get current business user profile and organization info.
 */
async function getMe(businessUserId) {
  const user = await repo.findBusinessUserById(businessUserId);
  if (!user) {
    throw ApiError.notFound('Business user not found.');
  }
  return {
    user: safeBusinessUser(user),
    organization: safeOrganization(user.organization),
  };
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
};
