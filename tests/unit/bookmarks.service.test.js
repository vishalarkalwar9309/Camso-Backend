'use strict';

const service = require('../../src/modules/bookmarks/bookmarks.service');
const repo = require('../../src/modules/bookmarks/bookmarks.repository');
const { generateAccessToken } = require('../../src/core/utils/tokenService');

jest.mock('../../src/modules/bookmarks/bookmarks.repository');

describe('Bookmarks Service (Unit Tests)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addBookmark', () => {
    it('throws 404 NOT_FOUND if product does not exist', async () => {
      repo.findProductById.mockResolvedValue(null);

      await expect(
        service.addBookmark({ id: 'user-1', is_guest: false }, { product_id: 'p-none' })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Product not found.',
      });
    });

    it('throws 400 BAD_REQUEST if product is inactive', async () => {
      repo.findProductById.mockResolvedValue({ id: 'p-1', is_active: false });

      await expect(
        service.addBookmark({ id: 'user-1', is_guest: false }, { product_id: 'p-1' })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Cannot bookmark an inactive product.',
      });
    });

    it('throws 400 BAD_REQUEST if guest has no active linked device in DB', async () => {
      repo.findProductById.mockResolvedValue({ id: 'p-1', is_active: true });
      repo.findDeviceForUser.mockResolvedValue(null);

      await expect(
        service.addBookmark({ id: 'guest-user-1', is_guest: true }, { product_id: 'p-1', device_id: 'arbitrary-dev' })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Guest session has no active linked device.',
      });
    });

    it('successfully adds bookmark for guest with linked device', async () => {
      repo.findProductById.mockResolvedValue({ id: 'p-1', is_active: true });
      repo.findDeviceForUser.mockResolvedValue('linked-dev-777');
      repo.createBookmark.mockResolvedValue({
        id: 'bm-2',
        device_id: 'linked-dev-777',
        product_id: 'p-1',
        user_id: null,
      });

      const result = await service.addBookmark(
        { id: 'guest-1', is_guest: true },
        { product_id: 'p-1', device_id: 'linked-dev-777' }
      );

      expect(repo.findDeviceForUser).toHaveBeenCalledWith('guest-1');
      expect(repo.createBookmark).toHaveBeenCalledWith({
        userId: null,
        deviceId: 'linked-dev-777',
        productId: 'p-1',
      });
      expect(result.id).toBe('bm-2');
    });

    it('automatically uses linked device for guest when device_id is omitted', async () => {
      repo.findProductById.mockResolvedValue({ id: 'p-1', is_active: true });
      repo.findDeviceForUser.mockResolvedValue('linked-dev-777');
      repo.createBookmark.mockResolvedValue({
        id: 'bm-2',
        device_id: 'linked-dev-777',
        product_id: 'p-1',
      });

      const result = await service.addBookmark(
        { id: 'guest-1', is_guest: true },
        { product_id: 'p-1' }
      );

      expect(repo.findDeviceForUser).toHaveBeenCalledWith('guest-1');
      expect(repo.createBookmark).toHaveBeenCalledWith({
        userId: null,
        deviceId: 'linked-dev-777',
        productId: 'p-1',
      });
      expect(result.id).toBe('bm-2');
    });

    it('throws 400 if guest passes device_id that mismatches their linked session', async () => {
      repo.findProductById.mockResolvedValue({ id: 'p-1', is_active: true });
      repo.findDeviceForUser.mockResolvedValue('linked-dev-777');

      await expect(
        service.addBookmark(
          { id: 'guest-1', is_guest: true },
          { product_id: 'p-1', device_id: 'different-device-999' }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'device_id does not match the authenticated guest session.',
      });
    });

    it('successfully adds bookmark for registered user using JWT identity', async () => {
      repo.findProductById.mockResolvedValue({ id: 'p-1', is_active: true });
      repo.createBookmark.mockResolvedValue({
        id: 'bm-3',
        user_id: 'reg-user-1',
        device_id: null,
        product_id: 'p-1',
      });

      const result = await service.addBookmark(
        { id: 'reg-user-1', is_guest: false },
        { product_id: 'p-1', device_id: 'spoofed-device' }
      );

      expect(repo.createBookmark).toHaveBeenCalledWith({
        userId: 'reg-user-1',
        deviceId: null,
        productId: 'p-1',
      });
      expect(result.id).toBe('bm-3');
    });

    it('catches P2002 unique constraint error and throws 409 CONFLICT', async () => {
      repo.findProductById.mockResolvedValue({ id: 'p-1', is_active: true });
      const error = new Error('Unique constraint failed');
      error.code = 'P2002';
      repo.createBookmark.mockRejectedValue(error);

      await expect(
        service.addBookmark({ id: 'reg-user-1', is_guest: false }, { product_id: 'p-1' })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Product already bookmarked.',
      });
    });
  });

  describe('getBookmarks', () => {
    it('returns paginated bookmarks for authenticated user', async () => {
      repo.findBookmarks.mockResolvedValue({
        items: [{ id: 'bm-1', product_id: 'p-1' }],
        total: 1,
      });

      const result = await service.getBookmarks(
        { id: 'user-1', is_guest: false },
        { page: 1, pageSize: 20 }
      );

      expect(repo.findBookmarks).toHaveBeenCalledWith({
        userId: 'user-1',
        deviceId: null,
        skip: 0,
        take: 20,
        sort: 'desc',
      });
      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('throws 400 BAD_REQUEST if guest has no active linked device', async () => {
      repo.findDeviceForUser.mockResolvedValue(null);

      await expect(
        service.getBookmarks(
          { id: 'guest-1', is_guest: true },
          { page: 1, pageSize: 20, device_id: 'arbitrary-dev' }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Guest session has no active linked device.',
      });
    });

    it('throws 400 if guest supplies device_id that mismatches their linked session', async () => {
      repo.findDeviceForUser.mockResolvedValue('linked-dev-123');

      await expect(
        service.getBookmarks(
          { id: 'guest-1', is_guest: true },
          { page: 1, pageSize: 20, device_id: 'victim-device-456' }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'device_id does not match the authenticated guest session.',
      });
    });

    it('returns paginated bookmarks for guest using linked device', async () => {
      repo.findDeviceForUser.mockResolvedValue('linked-dev-123');
      repo.findBookmarks.mockResolvedValue({
        items: [{ id: 'bm-g1', product_id: 'p-1' }],
        total: 1,
      });

      const result = await service.getBookmarks(
        { id: 'guest-1', is_guest: true },
        { page: 1, pageSize: 20 }
      );

      expect(repo.findBookmarks).toHaveBeenCalledWith({
        userId: null,
        deviceId: 'linked-dev-123',
        skip: 0,
        take: 20,
        sort: 'desc',
      });
      expect(result.items).toHaveLength(1);
    });
  });

  describe('removeBookmark', () => {
    it('throws 400 BAD_REQUEST if guest has no active linked device', async () => {
      repo.findDeviceForUser.mockResolvedValue(null);

      await expect(
        service.removeBookmark(
          { id: 'guest-1', is_guest: true },
          { identifier: 'bm-1', device_id: 'arbitrary-dev' }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Guest session has no active linked device.',
      });
    });

    it('throws 400 if guest supplies device_id that mismatches their linked session', async () => {
      repo.findDeviceForUser.mockResolvedValue('linked-dev-123');

      await expect(
        service.removeBookmark(
          { id: 'guest-1', is_guest: true },
          { identifier: 'bm-1', device_id: 'victim-device-456' }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'device_id does not match the authenticated guest session.',
      });
    });

    it('throws 404 NOT_FOUND if bookmark is not found or owned by someone else', async () => {
      repo.findBookmarkByIdOrProduct.mockResolvedValue(null);

      await expect(
        service.removeBookmark(
          { id: 'user-1', is_guest: false },
          { identifier: 'bm-unknown' }
        )
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Bookmark not found or does not belong to the user.',
      });
    });

    it('deletes bookmark successfully when owner matches', async () => {
      repo.findBookmarkByIdOrProduct.mockResolvedValue({ id: 'bm-1', user_id: 'user-1' });
      repo.deleteBookmark.mockResolvedValue({ count: 1 });

      const result = await service.removeBookmark(
        { id: 'user-1', is_guest: false },
        { identifier: 'bm-1' }
      );

      expect(repo.deleteBookmark).toHaveBeenCalledWith({
        id: 'bm-1',
        userId: 'user-1',
        deviceId: null,
      });
      expect(result.message).toMatch(/removed successfully/i);
    });
  });

  describe('syncBookmarks', () => {
    it('throws 403 FORBIDDEN if caller is a guest', async () => {
      await expect(
        service.syncBookmarks(
          { id: 'guest-1', is_guest: true },
          { guest_token: 'some-token' }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Only registered users can synchronize bookmarks.',
      });
    });

    it('throws 400 BAD_REQUEST if guest_token is missing', async () => {
      await expect(
        service.syncBookmarks(
          { id: 'user-1', is_guest: false },
          { device_id: 'some-device' }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'guest_token is required to verify the source guest session.',
      });
    });

    it('throws 401 UNAUTHORIZED if guest_token is invalid or malformed', async () => {
      await expect(
        service.syncBookmarks(
          { id: 'user-1', is_guest: false },
          { guest_token: 'malformed.token.xyz' }
        )
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid guest access token.',
      });
    });

    it('throws 400 BAD_REQUEST if provided token belongs to a registered user instead of a guest', async () => {
      const regUserToken = generateAccessToken({ sub: 'user-other', is_guest: false });

      await expect(
        service.syncBookmarks(
          { id: 'user-1', is_guest: false },
          { guest_token: regUserToken }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Provided credential is not a guest session.',
      });
    });

    it('throws 400 BAD_REQUEST if verified guest has no active linked device in DB', async () => {
      const guestToken = generateAccessToken({ sub: 'guest-no-dev', is_guest: true });
      repo.findDeviceForUser.mockResolvedValue(null);

      await expect(
        service.syncBookmarks(
          { id: 'user-1', is_guest: false },
          { guest_token: guestToken }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Source guest session has no active linked device.',
      });
    });

    it('throws 400 BAD_REQUEST if request device_id mismatches verified guest device', async () => {
      const guestToken = generateAccessToken({ sub: 'guest-with-dev', is_guest: true });
      repo.findDeviceForUser.mockResolvedValue('actual-guest-dev');

      await expect(
        service.syncBookmarks(
          { id: 'user-1', is_guest: false },
          { guest_token: guestToken, device_id: 'spoofed-dev-different' }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'device_id does not match the verified guest session.',
      });
    });

    it('throws 403 if device belongs to another registered user account', async () => {
      const guestToken = generateAccessToken({ sub: 'guest-123', is_guest: true });
      repo.findDeviceForUser.mockResolvedValue('dev-registered');
      repo.findDevice.mockResolvedValue({
        id: 'dev-row-1',
        device_id: 'dev-registered',
        user_id: 'other-reg-user',
        user: { id: 'other-reg-user', is_guest: false },
      });

      await expect(
        service.syncBookmarks(
          { id: 'user-1', is_guest: false },
          { guest_token: guestToken }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Cannot synchronize bookmarks from a device associated with another registered user.',
      });
    });

    it('throws 403 if device is linked to a different guest account', async () => {
      const guestToken = generateAccessToken({ sub: 'guest-123', is_guest: true });
      repo.findDeviceForUser.mockResolvedValue('dev-different-guest');
      repo.findDevice.mockResolvedValue({
        id: 'dev-row-2',
        device_id: 'dev-different-guest',
        user_id: 'guest-other-id',
        user: { id: 'guest-other-id', is_guest: true },
      });

      await expect(
        service.syncBookmarks(
          { id: 'user-1', is_guest: false },
          { guest_token: guestToken }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Device is not associated with the verified guest session.',
      });
    });

    it('delegates to transactional sync and returns result for registered user with valid guest_token', async () => {
      const guestToken = generateAccessToken({ sub: 'guest-user-1', is_guest: true });
      repo.findDeviceForUser.mockResolvedValue('guest-dev-123');
      repo.findDevice.mockResolvedValue({
        id: 'dev-row-1',
        device_id: 'guest-dev-123',
        user_id: 'guest-user-1',
        user: { id: 'guest-user-1', is_guest: true },
      });
      repo.syncGuestBookmarks.mockResolvedValue({
        syncedCount: 3,
        removedDuplicates: 1,
      });

      const result = await service.syncBookmarks(
        { id: 'user-1', is_guest: false },
        { guest_token: guestToken, device_id: 'guest-dev-123' }
      );

      expect(repo.syncGuestBookmarks).toHaveBeenCalledWith({
        userId: 'user-1',
        deviceId: 'guest-dev-123',
        sourceGuestId: 'guest-user-1',
      });
      expect(result.synced_count).toBe(3);
      expect(result.removed_duplicates).toBe(1);
    });
  });
});
