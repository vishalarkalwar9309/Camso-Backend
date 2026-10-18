'use strict';

const repo = require('./bookmarks.repository');
const ApiError = require('../../core/utils/ApiError');
const { verifyAccessToken } = require('../../core/utils/tokenService');

/**
 * Add a bookmark (product, document, or testimonial) for an authenticated user or guest device.
 */
async function addBookmark(userPrincipal, payload) {
  const {
    target_type = 'PRODUCT',
    product_id,
    document_id,
    testimonial_id,
    target_id,
    device_id,
  } = payload;

  const resolvedTargetType = (target_type || 'PRODUCT').toUpperCase();
  let resolvedProductId = product_id || null;
  let resolvedDocumentId = document_id || null;
  let resolvedTestimonialId = testimonial_id || null;

  if (target_id) {
    if (resolvedTargetType === 'DOCUMENT') resolvedDocumentId = target_id;
    else if (resolvedTargetType === 'TESTIMONIAL') resolvedTestimonialId = target_id;
    else resolvedProductId = target_id;
  }

  // 1. Verify target existence
  if (resolvedTargetType === 'PRODUCT') {
    if (!resolvedProductId) {
      throw ApiError.badRequest('product_id is required.');
    }
    const product = await repo.findProductById(resolvedProductId);
    if (!product) {
      throw ApiError.notFound('Product not found.');
    }
    if (!product.is_active) {
      throw ApiError.badRequest('Cannot bookmark an inactive product.');
    }
    resolvedProductId = product.id;
  } else if (resolvedTargetType === 'DOCUMENT') {
    if (!resolvedDocumentId) {
      throw ApiError.badRequest('document_id is required.');
    }
    const doc = await repo.findDocumentById(resolvedDocumentId);
    if (!doc || !doc.is_published) {
      throw ApiError.notFound('Document not found or unpublished.');
    }
    resolvedDocumentId = doc.id;
  } else if (resolvedTargetType === 'TESTIMONIAL') {
    if (!resolvedTestimonialId) {
      throw ApiError.badRequest('testimonial_id is required.');
    }
    const testm = await repo.findTestimonialById(resolvedTestimonialId);
    if (!testm || !testm.is_published) {
      throw ApiError.notFound('Testimonial not found or unpublished.');
    }
    resolvedTestimonialId = testm.id;
  }

  // 2. Resolve ownership
  let userId = null;
  let businessUserId = null;
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
  } else if (userPrincipal.is_business || ['DEALER', 'DISTRIBUTOR', 'OEM_PARTNER'].includes(userPrincipal.role)) {
    businessUserId = userPrincipal.id;
  } else {
    // Authenticated registered user — strictly derive identity from verified token
    userId = userPrincipal.id;
  }

  // 3. Create bookmark handling database-level uniqueness
  try {
    const createParams = {
      userId,
      deviceId: resolvedDeviceId,
      productId: resolvedProductId,
    };
    if (businessUserId) {
      createParams.businessUserId = businessUserId;
    }
    if (resolvedTargetType !== 'PRODUCT' || resolvedDocumentId || resolvedTestimonialId) {
      createParams.targetType = resolvedTargetType;
      createParams.documentId = resolvedDocumentId;
      createParams.testimonialId = resolvedTestimonialId;
    }

    const created = await repo.createBookmark(createParams);

    // Record activity non-blockingly
    try {
      const { prisma } = require('../../config/database');
      if (process.env.NODE_ENV !== 'test' && prisma && prisma.userActivity && typeof prisma.userActivity.create === 'function') {
        const entityId = resolvedProductId || resolvedDocumentId || resolvedTestimonialId;
        await prisma.userActivity.create({
          data: {
            user_id: userPrincipal.is_guest ? null : userPrincipal.id,
            device_id: resolvedDeviceId || (typeof userPrincipal.deviceId === 'string' ? userPrincipal.deviceId : null),
            activity_type: 'BOOKMARK_ADD',
            entity_type: resolvedTargetType,
            entity_id: entityId,
            metadata: { target_type: resolvedTargetType },
          },
        }).catch(() => {});
      }
    } catch (_) {}

    return created;
  } catch (err) {
    // Prisma P2002 or PostgreSQL 23505 unique constraint violation
    if (
      err.code === 'P2002' ||
      err.code === '23505' ||
      (err.message && err.message.includes('unique constraint'))
    ) {
      if (resolvedTargetType === 'PRODUCT') {
        throw ApiError.conflict('Product already bookmarked.');
      }
      throw ApiError.conflict('Item already bookmarked.');
    }
    throw err;
  }
}

/**
 * List paginated bookmarks for the caller.
 */
async function getBookmarks(userPrincipal, { page = 1, pageSize = 20, device_id, sort = 'desc', target_type = 'ALL' }) {
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

  const queryParams = {
    userId,
    deviceId: resolvedDeviceId,
    skip,
    take,
    sort,
  };

  if (target_type && target_type !== 'ALL') {
    queryParams.targetType = target_type;
  }

  const { items, total } = await repo.findBookmarks(queryParams);

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

  // Record activity non-blockingly
  try {
    const { prisma } = require('../../config/database');
    if (process.env.NODE_ENV !== 'test' && prisma && prisma.userActivity && typeof prisma.userActivity.create === 'function') {
      await prisma.userActivity.create({
        data: {
          user_id: userPrincipal.is_guest ? null : userPrincipal.id,
          device_id: resolvedDeviceId || (typeof userPrincipal.deviceId === 'string' ? userPrincipal.deviceId : null),
          activity_type: 'BOOKMARK_REMOVE',
          entity_type: bookmark.target_type || 'PRODUCT',
          entity_id: bookmark.product_id || bookmark.document_id || bookmark.testimonial_id || identifier,
          metadata: { target_type: bookmark.target_type || 'PRODUCT' },
        },
      }).catch(() => {});
    }
  } catch (_) {}

  return { message: 'Bookmark removed successfully.' };
}

/**
 * Synchronize guest or offline bookmarks into an authenticated user or business account.
 *
 * 1. The use of function:
 *    Migrates offline/guest saved bookmarks into the caller's persistent account.
 * 2. How does the specific function work:
 *    - If product_ids or bookmark_ids array is provided, batch-creates bookmarks for the authenticated caller.
 *    - If guest_token is provided, cryptographically verifies guest session and migrates guest device bookmarks.
 *    - Returns count of synced bookmarks.
 * 3. Concepts used in the function:
 *    Batch synchronization, cryptographic credential handoff, idempotent migration.
 * 4. Places where this function is imported and used:
 *    Imported and used in src/modules/bookmarks/bookmarks.controller.js.
 * 5. Final output of the function, before and after:
 *    Before: Unsynced guest token or list of product IDs in request payload.
 *    After: { synced_count: number, removed_duplicates: number, message: string }.
 *
 * @param {object} userPrincipal
 * @param {object} payload
 * @returns {Promise<{ synced_count: number, removed_duplicates: number, message: string }>}
 */
async function syncBookmarks(userPrincipal, payload = {}) {
  const { guest_token, device_id, product_ids, bookmark_ids } = payload;
  if (userPrincipal.is_guest) {
    throw ApiError.forbidden('Only registered users can synchronize bookmarks.');
  }

  // Support batch syncing polymorphic bookmarks from offline client storage
  const hasBatchPayload =
    (Array.isArray(payload.product_ids) && payload.product_ids.length > 0) ||
    (Array.isArray(payload.document_ids) && payload.document_ids.length > 0) ||
    (Array.isArray(payload.testimonial_ids) && payload.testimonial_ids.length > 0) ||
    (Array.isArray(payload.bookmark_ids) && payload.bookmark_ids.length > 0) ||
    (Array.isArray(payload.bookmarks) && payload.bookmarks.length > 0);

  if (hasBatchPayload) {
    let syncedCount = 0;

    // 1. Explicit product_ids
    if (Array.isArray(payload.product_ids)) {
      for (const pid of payload.product_ids) {
        try {
          await addBookmark(userPrincipal, { product_id: pid, target_type: 'PRODUCT' });
          syncedCount++;
        } catch (_) {}
      }
    }

    // 2. Explicit document_ids
    if (Array.isArray(payload.document_ids)) {
      for (const did of payload.document_ids) {
        try {
          await addBookmark(userPrincipal, { document_id: did, target_type: 'DOCUMENT' });
          syncedCount++;
        } catch (_) {}
      }
    }

    // 3. Explicit testimonial_ids
    if (Array.isArray(payload.testimonial_ids)) {
      for (const tid of payload.testimonial_ids) {
        try {
          await addBookmark(userPrincipal, { testimonial_id: tid, target_type: 'TESTIMONIAL' });
          syncedCount++;
        } catch (_) {}
      }
    }

    // 4. Structured bookmarks array
    if (Array.isArray(payload.bookmarks)) {
      for (const b of payload.bookmarks) {
        try {
          await addBookmark(userPrincipal, b);
          syncedCount++;
        } catch (_) {}
      }
    }

    // 5. Generic bookmark_ids (auto-detect target entity)
    if (Array.isArray(payload.bookmark_ids)) {
      for (const id of payload.bookmark_ids) {
        try {
          const prod = await repo.findProductById(id);
          if (prod) {
            await addBookmark(userPrincipal, { product_id: id, target_type: 'PRODUCT' });
            syncedCount++;
            continue;
          }
          const doc = await repo.findDocumentById(id);
          if (doc) {
            await addBookmark(userPrincipal, { document_id: id, target_type: 'DOCUMENT' });
            syncedCount++;
            continue;
          }
          const testm = await repo.findTestimonialById(id);
          if (testm) {
            await addBookmark(userPrincipal, { testimonial_id: id, target_type: 'TESTIMONIAL' });
            syncedCount++;
            continue;
          }
          await addBookmark(userPrincipal, { product_id: id, target_type: 'PRODUCT' });
          syncedCount++;
        } catch (_) {}
      }
    }

    return {
      synced_count: syncedCount,
      removed_duplicates: 0,
      message: 'Bookmarks synchronized successfully.',
    };
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
