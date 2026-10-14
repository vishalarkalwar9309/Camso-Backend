'use strict';

/**
 * users.service unit tests.
 *
 * Mocks the users repository to verify profile retrieval,
 * safeUser stripping, and profile updates in isolation.
 */

jest.mock('../../src/modules/users/users.repository');

const usersService = require('../../src/modules/users/users.service');
const repo = require('../../src/modules/users/users.repository');
const ApiError = require('../../src/core/utils/ApiError');

const MOCK_USER_ID = 'user-cuid-789';

const MOCK_DB_USER = {
  id: MOCK_USER_ID,
  email: 'dealer@ceat.com',
  phone: '+919876543210',
  password_hash: '$2b$10$hashedpasswordstringthatmustneverleak',
  display_name: 'CEAT Dealer 1',
  is_guest: false,
  preferred_language: 'en',
  created_at: new Date('2026-10-13T08:00:00Z'),
  updated_at: new Date('2026-10-13T08:30:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('usersService.getMe', () => {
  it('returns safe user profile and never leaks password_hash', async () => {
    repo.findUserById.mockResolvedValue(MOCK_DB_USER);

    const user = await usersService.getMe(MOCK_USER_ID);

    expect(repo.findUserById).toHaveBeenCalledWith(MOCK_USER_ID);
    expect(user).toEqual({
      id: MOCK_USER_ID,
      email: 'dealer@ceat.com',
      phone: '+919876543210',
      display_name: 'CEAT Dealer 1',
      is_guest: false,
      role: 'END_USER',
      user_type: 'End User',
      preferred_language: 'en',
      created_at: MOCK_DB_USER.created_at,
      updated_at: MOCK_DB_USER.updated_at,
    });
    expect(user.password_hash).toBeUndefined();
  });

  it('throws 404 Not Found when user record does not exist', async () => {
    repo.findUserById.mockResolvedValue(null);

    await expect(usersService.getMe('nonexistent-id')).rejects.toThrow(ApiError);

    try {
      await usersService.getMe('nonexistent-id');
    } catch (err) {
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('User not found.');
    }
  });

  it('propagates repository errors', async () => {
    repo.findUserById.mockRejectedValue(new Error('DB disconnect'));

    await expect(usersService.getMe(MOCK_USER_ID)).rejects.toThrow('DB disconnect');
  });
});

describe('usersService.updateMe', () => {
  it('updates permitted fields and returns safe updated profile', async () => {
    const updatedDbUser = {
      ...MOCK_DB_USER,
      display_name: 'Updated Dealer Name',
      preferred_language: 'fr',
      updated_at: new Date('2026-10-13T09:00:00Z'),
    };
    repo.updateUser.mockResolvedValue(updatedDbUser);

    const updatePayload = {
      display_name: 'Updated Dealer Name',
      preferred_language: 'fr',
    };

    const result = await usersService.updateMe(MOCK_USER_ID, updatePayload);

    expect(repo.updateUser).toHaveBeenCalledWith(MOCK_USER_ID, updatePayload);
    expect(result.display_name).toBe('Updated Dealer Name');
    expect(result.preferred_language).toBe('fr');
    expect(result.password_hash).toBeUndefined();
  });

  it('propagates repository errors on update failure', async () => {
    repo.updateUser.mockRejectedValue(new Error('Update failed'));

    await expect(
      usersService.updateMe(MOCK_USER_ID, { display_name: 'New Name' })
    ).rejects.toThrow('Update failed');
  });
});
