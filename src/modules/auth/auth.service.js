'use strict';

/**
 * auth.service — business logic for all authentication endpoints.
 *
 * This layer imports:
 *   - auth.repository  (data access)
 *   - password         (bcrypt helpers)
 *   - tokenService     (JWT + refresh token helpers)
 *   - ApiError         (error factory)
 *
 * This layer NEVER imports Prisma directly.
 * This layer NEVER returns password_hash to callers.
 */

const repo = require('./auth.repository');
const { hashPassword, comparePassword } = require('../../core/utils/password');
const {
  generateAccessToken,
  generateRawRefreshToken,
  hashRefreshToken,
  buildRefreshTokenExpiry,
} = require('../../core/utils/tokenService');
const ApiError = require('../../core/utils/ApiError');

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Build a safe user object safe to send to clients.
 * Explicitly lists fields — password_hash is NEVER included.
 *
 * @param {import('@prisma/client').User} user
 * @returns {object}
 */
function safeUser(user) {
  return {
    id:                 user.id,
    email:              user.email,
    phone:              user.phone,
    display_name:       user.display_name,
    is_guest:           user.is_guest,
    preferred_language: user.preferred_language,
    created_at:         user.created_at,
    updated_at:         user.updated_at,
  };
}

/**
 * Issue a new access + refresh token pair for a user.
 * Stores the hashed refresh token in the database.
 *
 * @param {import('@prisma/client').User} user
 * @param {string|null} device_id
 * @returns {Promise<{ access_token: string, refresh_token: string }>}
 */
async function _issueTokenPair(user, device_id) {
  const accessToken = generateAccessToken({ sub: user.id, is_guest: user.is_guest });
  const rawRefresh  = generateRawRefreshToken();
  const tokenHash   = hashRefreshToken(rawRefresh);
  const expiresAt   = buildRefreshTokenExpiry();

  await repo.createRefreshToken({
    user_id:    user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    device_id:  device_id ?? null,
  });

  return { access_token: accessToken, refresh_token: rawRefresh };
}

// ---------------------------------------------------------------------------
// Public methods
// ---------------------------------------------------------------------------

/**
 * Guest sign-in.
 *
 * Behaviour (ASSUMPTION A3, A4 — pending CEAT confirmation):
 *   - device_id belongs to registered (non-guest) user → 400
 *   - device_id belongs to existing guest user         → reuse user, return 200
 *   - device_id not found, OR found but user_id null   → create guest user, return 201
 *
 * @param {{ device_id: string, platform: string, app_version?: string }} body
 * @returns {Promise<{ statusCode: number, tokens: object, user: object }>}
 */
async function guestSignIn({ device_id, platform, app_version }) {
  const existingDevice = await repo.findDeviceWithUser(device_id);

  let user;
  let statusCode;

  if (existingDevice && existingDevice.user && !existingDevice.user.is_guest) {
    // Device belongs to a registered user — refuse guest session
    throw ApiError.badRequest(
      'This device is associated with a registered account. Please log in.'
    );
  }

  if (existingDevice && existingDevice.user && existingDevice.user.is_guest) {
    // Reuse the existing guest user
    user = existingDevice.user;
    statusCode = 200;
  } else {
    // No user associated — create a new guest user
    user = await repo.createGuestUser();
    statusCode = 201;
  }

  // Upsert the device (creates or refreshes last_seen_at + user_id link)
  await repo.upsertDevice({ device_id, user_id: user.id, platform, app_version });

  const tokens = await _issueTokenPair(user, device_id);

  return { statusCode, tokens, user: safeUser(user) };
}

/**
 * Register a new user account.
 *
 * @param {{ email: string, password: string, display_name?: string, preferred_language?: string }} body
 * @returns {Promise<{ tokens: object, user: object }>}
 */
async function register({ email, password, display_name, preferred_language }) {
  // Check for duplicate email
  const existing = await repo.findUserByEmail(email);
  if (existing) {
    throw new ApiError(409, 'VALIDATION_ERROR', 'An account with this email already exists.');
  }

  const password_hash = await hashPassword(password);

  const user = await repo.createUser({
    email,
    password_hash,
    display_name,
    preferred_language,
  });

  const tokens = await _issueTokenPair(user, null);

  return { tokens, user: safeUser(user) };
}

/**
 * Log in with email + password.
 *
 * Returns the SAME 401 error whether the email is unknown or the password is wrong.
 * This prevents user enumeration.
 *
 * @param {{ email: string, password: string }} body
 * @returns {Promise<{ tokens: object, user: object }>}
 */
async function login({ email, password }) {
  const INVALID_MSG = 'Invalid email or password.';

  const user = await repo.findUserByEmail(email);

  // Not found, or is a guest user (guests have no password)
  if (!user || user.is_guest) {
    throw ApiError.unauthorized(INVALID_MSG);
  }

  const passwordMatch = await comparePassword(password, user.password_hash);
  if (!passwordMatch) {
    throw ApiError.unauthorized(INVALID_MSG);
  }

  const tokens = await _issueTokenPair(user, null);

  return { tokens, user: safeUser(user) };
}

/**
 * Refresh an access token using a valid refresh token.
 *
 * Rotation is atomic:
 *   - old token is revoked
 *   - new token is created
 *   both in a single Prisma transaction.
 *
 * @param {{ refresh_token: string }} body
 * @returns {Promise<{ tokens: { access_token: string, refresh_token: string } }>}
 */
async function refresh({ refresh_token: rawToken }) {
  const INVALID_MSG = 'Invalid or expired refresh token.';

  // 1. Hash the incoming raw token to look it up
  const tokenHash = hashRefreshToken(rawToken);
  const stored    = await repo.findRefreshTokenByHash(tokenHash);

  if (!stored)               throw ApiError.unauthorized(INVALID_MSG);
  if (stored.revoked_at)     throw ApiError.unauthorized(INVALID_MSG);
  if (stored.expires_at < new Date()) throw ApiError.unauthorized(INVALID_MSG);

  // 2. Fetch the user for the is_guest claim in the new access token
  const user = await repo.findUserById(stored.user_id);
  if (!user) throw ApiError.unauthorized(INVALID_MSG);

  // 3. Generate new raw refresh token
  const newRaw    = generateRawRefreshToken();
  const newHash   = hashRefreshToken(newRaw);
  const newExpiry = buildRefreshTokenExpiry();

  // 4. Atomic rotation: revoke old, create new — single transaction
  await repo.rotateRefreshToken({
    oldTokenId:   stored.id,
    newTokenData: {
      user_id:    stored.user_id,
      token_hash: newHash,
      expires_at: newExpiry,
      device_id:  stored.device_id,
    },
  });

  // 5. Sign new access token
  const accessToken = generateAccessToken({ sub: user.id, is_guest: user.is_guest });

  return {
    tokens: {
      access_token:  accessToken,
      refresh_token: newRaw,
    },
  };
}

module.exports = { guestSignIn, register, login, refresh };
