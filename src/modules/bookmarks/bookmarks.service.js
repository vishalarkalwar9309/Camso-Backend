'use strict';

const repo = require('./bookmarks.repository');
const ApiError = require('../../core/utils/ApiError');
const { verifyAccessToken } = require('../../core/utils/tokenService');

/**
 * Add a product bookmark for an authenticated user or guest device.
 */
async function addBookmark(userPrincipal, { product_id, device_id }) {
  // 1. Verify product existence and active status
  const product = await repo.findProductById(product_id);
  if (!product) {
    throw ApiError.notFound('Product not found.');
  }
  if (!product.is_active) {
    throw ApiError.badRequest('Cannot bookmark an inactive product.');
  }

  // 2. Resolve ownership
  let userId = null;
  let resolvedDeviceId = null;

  if (userPrincipal.is_guest) {
    const linkedDevice = await repo.findDeviceForUser(userPrincipal.id);
    if (!linkedDevice) {
      throw ApiError.badRequest('Guest session has no active linked device.');
    }
    if (device_id && device_id !== linkedDevice) {
      throw ApiError.badRequest('device_id does not match the authenticated guest session.');
    }
    resolvedDeviceId = linkedDevice;
  } else {
    // Authenticated registered user — strictly derive identity from verified token
    userId = userPrincipal.id;
  }

  // 3. Create bookmark handling database-level uniqueness
  try {
    return await repo.createBookmark({
      userId,
      deviceId: resolvedDeviceId,
      productId: product.id,
    });
  } catch (err) {
    // Prisma P2002 or PostgreSQL 23505 unique constraint violation
    if (
      err.code === 'P2002' ||
      err.code === '23505' ||
      (err.message && err.message.includes('unique constraint'))
    ) {
      throw ApiError.conflict('Product already bookmarked.');
    }
    throw err;
  }
}

/**
 * List paginated bookmarks for the caller.
 */
async function getBookmarks(userPrincipal, { page = 1, pageSize = 20, device_id, sort = 'desc' }) {
  let userId = null;
  let resolvedDeviceId = null;

  if (userPrincipal.is_guest) {
    const linkedDevice = await repo.findDeviceForUser(userPrincipal.id);
    if (!linkedDevice) {
      throw ApiError.badRequest('Guest session has no active linked device.');
    }
    if (device_id && device_id !== linkedDevice) {
      throw ApiError.badRequest('device_id does not match the authenticated guest session.');
    }
    resolvedDeviceId = linkedDevice;
  } else {
    userId = userPrincipal.id;
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedPageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const skip = (parsedPage - 1) * parsedPageSize;
  const take = parsedPageSize;

  const { items, total } = await repo.findBookmarks({
    userId,
    deviceId: resolvedDeviceId,
    skip,
    take,
    sort,
  });

  const totalPages = Math.ceil(total / parsedPageSize);

  return {
    items,
    pagination: {
      page: parsedPage,
      pageSize: parsedPageSize,
      total,
      totalPages,
    },
  };
}

/**
 * Remove a bookmark by bookmark ID or product ID for the caller.
 */
async function removeBookmark(userPrincipal, { identifier, device_id }) {
  let userId = null;
  let resolvedDeviceId = null;

  if (userPrincipal.is_guest) {
    const linkedDevice = await repo.findDeviceForUser(userPrincipal.id);
    if (!linkedDevice) {
      throw ApiError.badRequest('Guest session has no active linked device.');
    }
    if (device_id && device_id !== linkedDevice) {
      throw ApiError.badRequest('device_id does not match the authenticated guest session.');
    }
    resolvedDeviceId = linkedDevice;
  } else {
    userId = userPrincipal.id;
  }

  const bookmark = await repo.findBookmarkByIdOrProduct({
    identifier,
    userId,
    deviceId: resolvedDeviceId,
  });

  if (!bookmark) {
    throw ApiError.notFound('Bookmark not found or does not belong to the user.');
  }

  const deleteResult = await repo.deleteBookmark({
    id: bookmark.id,
    userId,
    deviceId: resolvedDeviceId,
  });

  if (deleteResult && typeof deleteResult.count === 'number' && deleteResult.count === 0) {
    throw ApiError.notFound('Bookmark not found or does not belong to the user.');
  }

  return { message: 'Bookmark removed successfully.' };
}

/**
 * Synchronize guest bookmarks into an authenticated user account.
 * Requires cryptographic proof of the source guest session via verified JWT.
 */
async function syncBookmarks(userPrincipal, { guest_token, device_id }) {
  if (userPrincipal.is_guest) {
    throw ApiError.forbidden('Only registered users can synchronize bookmarks.');
  }

  if (!guest_token) {
    throw ApiError.badRequest('guest_token is required to verify the source guest session.');
  }

  // 1. Cryptographically verify guest credential signature, expiry, and identity
  let decodedGuest;
  try {
    decodedGuest = verifyAccessToken(guest_token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Guest access token expired.');
    }
    throw ApiError.unauthorized('Invalid guest access token.');
  }

  if (!decodedGuest || !decodedGuest.is_guest) {
    throw ApiError.badRequest('Provided credential is not a guest session.');
  }

  // 2. Resolve source guest device from verified guest identity
  const sourceGuestId = decodedGuest.sub;
  let linkedSourceDevice = await repo.findDeviceForUser(sourceGuestId);

  // If source guest has no active device, check if device was already migrated to this user account (idempotent retry)
  if (!linkedSourceDevice) {
    if (device_id) {
      const alreadyOwned = await repo.findDevice(device_id);
      if (alreadyOwned && alreadyOwned.user_id === userPrincipal.id) {
        return {
          synced_count: 0,
          removed_duplicates: 0,
          message: 'Bookmarks synchronized successfully.',
        };
      }
    }
    throw ApiError.badRequest('Source guest session has no active linked device.');
  }

  if (device_id && device_id !== linkedSourceDevice) {
    throw ApiError.badRequest('device_id does not match the verified guest session.');
  }

  const resolvedSourceDevice = linkedSourceDevice;

  // 3. Verify device ownership in user_devices:
  // Cannot synchronize from a device belonging to another registered user account
  const existingDevice = await repo.findDevice(resolvedSourceDevice);
  if (
    existingDevice &&
    existingDevice.user &&
    !existingDevice.user.is_guest &&
    existingDevice.user_id !== userPrincipal.id
  ) {
    throw ApiError.forbidden('Cannot synchronize bookmarks from a device associated with another registered user.');
  }

  // Device cannot belong to a different guest
  if (
    existingDevice &&
    existingDevice.user &&
    existingDevice.user.is_guest &&
    existingDevice.user_id !== sourceGuestId
  ) {
    throw ApiError.forbidden('Device is not associated with the verified guest session.');
  }

  const result = await repo.syncGuestBookmarks({
    userId: userPrincipal.id,
    deviceId: resolvedSourceDevice,
    sourceGuestId,
  });

  return {
    synced_count: result.syncedCount,
    removed_duplicates: result.removedDuplicates,
    message: 'Bookmarks synchronized successfully.',
  };
}

module.exports = {
  addBookmark,
  getBookmarks,
  removeBookmark,
  syncBookmarks,
};
