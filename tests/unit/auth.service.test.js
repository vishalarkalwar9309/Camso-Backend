'use strict';

/**
 * auth.service unit tests.
 *
 * The repository and token utilities are mocked so these tests
 * run without any database or secret dependency beyond the .env
 * values loaded by tests/helpers/setup.js.
 */

jest.mock('../../src/modules/auth/auth.repository');
jest.mock('../../src/core/utils/password');
jest.mock('../../src/core/utils/tokenService');

const authService  = require('../../src/modules/auth/auth.service');
const repo         = require('../../src/modules/auth/auth.repository');
const { hashPassword, comparePassword } = require('../../src/core/utils/password');
const {
  generateAccessToken,
  generateRawRefreshToken,
  hashRefreshToken,
  buildRefreshTokenExpiry,
} = require('../../src/core/utils/tokenService');

// ---------------------------------------------------------------------------
// Default mock return values
// ---------------------------------------------------------------------------
const MOCK_ACCESS_TOKEN  = 'mock.access.token';
const MOCK_REFRESH_RAW   = 'mock-raw-refresh-token';
const MOCK_REFRESH_HASH  = 'mock-refresh-hash';
const MOCK_EXPIRY        = new Date(Date.now() + 86400_000);

const MOCK_GUEST_USER = {
  id: 'guest-cuid', email: null, phone: null, display_name: null,
  is_guest: true, preferred_language: 'en',
  created_at: new Date(), updated_at: new Date(),
};

const MOCK_REG_USER = {
  id: 'user-cuid', email: 'user@test.com', phone: null, display_name: null,
  is_guest: false, preferred_language: 'en', password_hash: 'bcrypt-hash',
  created_at: new Date(), updated_at: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();

  generateAccessToken.mockReturnValue(MOCK_ACCESS_TOKEN);
  generateRawRefreshToken.mockReturnValue(MOCK_REFRESH_RAW);
  hashRefreshToken.mockReturnValue(MOCK_REFRESH_HASH);
  buildRefreshTokenExpiry.mockReturnValue(MOCK_EXPIRY);

  repo.createRefreshToken.mockResolvedValue({});
  repo.upsertDevice.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// guestSignIn
// ---------------------------------------------------------------------------
describe('authService.guestSignIn', () => {
  const BODY = { device_id: 'dev-123', platform: 'ANDROID' };

  it('creates a new guest user when device is unknown (201)', async () => {
    repo.findDeviceWithUser.mockResolvedValue(null);
    repo.createGuestUser.mockResolvedValue(MOCK_GUEST_USER);

    const result = await authService.guestSignIn(BODY);

    expect(repo.createGuestUser).toHaveBeenCalledTimes(1);
    expect(repo.upsertDevice).toHaveBeenCalledWith(
      expect.objectContaining({ device_id: 'dev-123', user_id: MOCK_GUEST_USER.id })
    );
    expect(result.statusCode).toBe(201);
    expect(result.tokens.access_token).toBe(MOCK_ACCESS_TOKEN);
    expect(result.tokens.refresh_token).toBe(MOCK_REFRESH_RAW);
    expect(result.user.id).toBe(MOCK_GUEST_USER.id);
    expect(result.user).not.toHaveProperty('password_hash');
  });

  it('reuses existing guest user when device is known (200)', async () => {
    repo.findDeviceWithUser.mockResolvedValue({
      device_id: 'dev-123',
      user_id: MOCK_GUEST_USER.id,
      user: MOCK_GUEST_USER,
    });

    const result = await authService.guestSignIn(BODY);

    expect(repo.createGuestUser).not.toHaveBeenCalled();
    expect(result.statusCode).toBe(200);
    expect(result.user.id).toBe(MOCK_GUEST_USER.id);
  });

  it('throws 400 ApiError when device belongs to a registered user', async () => {
    repo.findDeviceWithUser.mockResolvedValue({
      device_id: 'dev-123',
      user_id: MOCK_REG_USER.id,
      user: MOCK_REG_USER, // is_guest: false
    });

    await expect(authService.guestSignIn(BODY)).rejects.toMatchObject({
      statusCode: 400,
      type: 'VALIDATION_ERROR',
    });
    expect(repo.createGuestUser).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------
describe('authService.register', () => {
  const BODY = { email: 'new@test.com', password: 'password123' };

  it('creates user and returns tokens', async () => {
    repo.findUserByEmail.mockResolvedValue(null);
    hashPassword.mockResolvedValue('hashed-pw');
    repo.createUser.mockResolvedValue(MOCK_REG_USER);

    const result = await authService.register(BODY);

    expect(repo.createUser).toHaveBeenCalledTimes(1);
    expect(result.tokens.access_token).toBe(MOCK_ACCESS_TOKEN);
    expect(result.user.email).toBe(MOCK_REG_USER.email);
    expect(result.user).not.toHaveProperty('password_hash');
  });

  it('throws 409 ApiError when email is already taken', async () => {
    repo.findUserByEmail.mockResolvedValue(MOCK_REG_USER);

    await expect(authService.register(BODY)).rejects.toMatchObject({
      statusCode: 409,
      type: 'VALIDATION_ERROR',
      message: expect.stringContaining('already exists'),
    });
    expect(repo.createUser).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------
describe('authService.login', () => {
  const BODY = { email: 'user@test.com', password: 'password123' };

  it('returns tokens on correct credentials', async () => {
    repo.findUserByEmail.mockResolvedValue(MOCK_REG_USER);
    comparePassword.mockResolvedValue(true);

    const result = await authService.login(BODY);

    expect(result.tokens.access_token).toBe(MOCK_ACCESS_TOKEN);
    expect(result.user).not.toHaveProperty('password_hash');
  });

  it('throws 401 with generic message when email is unknown', async () => {
    repo.findUserByEmail.mockResolvedValue(null);

    await expect(authService.login(BODY)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password.',
    });
  });

  it('throws 401 with generic message when password is wrong', async () => {
    repo.findUserByEmail.mockResolvedValue(MOCK_REG_USER);
    comparePassword.mockResolvedValue(false);

    await expect(authService.login(BODY)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password.',
    });
  });

  it('throws 401 if the user is a guest (no password)', async () => {
    repo.findUserByEmail.mockResolvedValue({ ...MOCK_GUEST_USER, email: 'guest@test.com' });

    await expect(authService.login(BODY)).rejects.toMatchObject({ statusCode: 401 });
  });
});

// ---------------------------------------------------------------------------
// refresh
// ---------------------------------------------------------------------------
describe('authService.refresh', () => {
  const RAW_TOKEN = 'old-raw-token';

  const STORED_TOKEN = {
    id: 'token-id',
    user_id: MOCK_REG_USER.id,
    token_hash: MOCK_REFRESH_HASH,
    revoked_at: null,
    expires_at: new Date(Date.now() + 86400_000), // future
    device_id: null,
  };

  it('succeeds and rotates the refresh token', async () => {
    hashRefreshToken.mockReturnValue(MOCK_REFRESH_HASH);
    repo.findRefreshTokenByHash.mockResolvedValue(STORED_TOKEN);
    repo.findUserById.mockResolvedValue(MOCK_REG_USER);
    repo.rotateRefreshToken.mockResolvedValue([{}, {}]);

    const result = await authService.refresh({ refresh_token: RAW_TOKEN });

    expect(repo.rotateRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ oldTokenId: STORED_TOKEN.id })
    );
    expect(result.tokens.access_token).toBe(MOCK_ACCESS_TOKEN);
    expect(result.tokens.refresh_token).toBe(MOCK_REFRESH_RAW);
  });

  it('throws 401 when token hash is not found', async () => {
    repo.findRefreshTokenByHash.mockResolvedValue(null);

    await expect(authService.refresh({ refresh_token: RAW_TOKEN })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid or expired refresh token.',
    });
    expect(repo.rotateRefreshToken).not.toHaveBeenCalled();
  });

  it('throws 401 when token is revoked', async () => {
    repo.findRefreshTokenByHash.mockResolvedValue({
      ...STORED_TOKEN,
      revoked_at: new Date(Date.now() - 1000),
    });

    await expect(authService.refresh({ refresh_token: RAW_TOKEN })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid or expired refresh token.',
    });
  });

  it('throws 401 when token is expired', async () => {
    repo.findRefreshTokenByHash.mockResolvedValue({
      ...STORED_TOKEN,
      expires_at: new Date(Date.now() - 1000), // past
    });

    await expect(authService.refresh({ refresh_token: RAW_TOKEN })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid or expired refresh token.',
    });
  });

  it('propagates error if rotateRefreshToken throws (atomicity)', async () => {
    repo.findRefreshTokenByHash.mockResolvedValue(STORED_TOKEN);
    repo.findUserById.mockResolvedValue(MOCK_REG_USER);
    repo.rotateRefreshToken.mockRejectedValue(new Error('DB error'));

    await expect(authService.refresh({ refresh_token: RAW_TOKEN })).rejects.toThrow('DB error');
  });
});
