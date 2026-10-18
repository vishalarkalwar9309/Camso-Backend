'use strict';

const prisma = require('../../config/database');

/**
 * Find product by ID including active status.
 */
async function findProductById(productId) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      pid: true,
      name: true,
      slug: true,
      is_active: true,
      category_id: true,
    },
  });
}

/**
 * Find document by ID including published status.
 */
async function findDocumentById(documentId) {
  return prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      document_type: true,
      is_published: true,
    },
  });
}

/**
 * Find testimonial by ID including published status.
 */
async function findTestimonialById(testimonialId) {
  return prisma.testimonial.findUnique({
    where: { id: testimonialId },
    select: {
      id: true,
      customer_name: true,
      region: true,
      story_type: true,
      is_published: true,
    },
  });
}

/**
 * Find active device associated with a user in user_devices.
 */
async function findDeviceForUser(userId) {
  const device = await prisma.userDevice.findFirst({
    where: { user_id: userId, is_active: true },
    orderBy: { last_seen_at: 'desc' },
  });
  return device ? device.device_id : null;
}

/**
 * Create a new bookmark (polymorphic: product, document, or testimonial).
 *
 * 1. The use of function:
 *    Inserts a bookmark record scoped to a user, business user, or guest device.
 * 2. How does the specific function work:
 *    Populates data object including target IDs and user/business identity.
 *    Catches P2022 on unmigrated schemas to gracefully omit business_user_id if not present in DB.
 * 3. Concepts used in the function:
 *    Polymorphism, multi-tenant scoping, schema fallback resilience.
 * 4. Places where this function is imported and used:
 *    Imported and used in src/modules/bookmarks/bookmarks.service.js.
 * 5. Final output of the function, before and after:
 *    Before: Bookmark creation parameters { userId, businessUserId, deviceId, productId, targetType, documentId, testimonialId }.
 *    After: Created Bookmark record with populated relational entities.
 *
 * @param {object} params
 * @returns {Promise<object>}
 */
async function createBookmark({ userId, businessUserId, deviceId, productId, targetType = 'PRODUCT', documentId, testimonialId }) {
  const data = {
    user_id: userId || null,
    device_id: deviceId || null,
    target_type: targetType,
    product_id: productId || null,
    document_id: documentId || null,
    testimonial_id: testimonialId || null,
  };
  if (businessUserId) {
    data.business_user_id = businessUserId;
  }

  const include = {
    product: {
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          where: { is_primary: true },
          take: 1,
        },
      },
    },
    document: {
      include: {
        files: {
          take: 1,
          include: {
            media_asset: {
              select: { id: true, url: true, filename: true, mime_type: true, size_bytes: true },
            },
          },
        },
      },
    },
    testimonial: {
      select: { id: true, customer_name: true, region: true, story_type: true },
    },
  };

  try {
    return await prisma.bookmark.create({
      data,
      include,
    });
  } catch (err) {
    if (err.code === 'P2022' && data.business_user_id) {
      delete data.business_user_id;
      return prisma.bookmark.create({ data, include });
    }
    throw err;
  }
}

/**
 * Find paginated bookmarks for a user, business user, or guest device.
 *
 * 1. The use of function:
 *    Retrieves bookmarked items for authenticated or guest sessions.
 * 2. How does the specific function work:
 *    Queries bookmarks matching user_id OR business_user_id (for authenticated users)
 *    or device_id (for guests), ordered by created_at desc with pagination.
 * 3. Concepts used in the function:
 *    Multi-role scoping, pagination, relational eager loading.
 * 4. Places where this function is imported and used:
 *    Imported and used in src/modules/bookmarks/bookmarks.service.js.
 * 5. Final output of the function, before and after:
 *    Before: Query parameters { userId, deviceId, skip, take, sort, targetType }.
 *    After: { items: Array<object>, total: number }.
 *
 * @param {object} params
 * @returns {Promise<{ items: Array<object>, total: number }>}
 */
async function findBookmarks({ userId, deviceId, skip = 0, take = 20, sort = 'desc', targetType }) {
  if (!userId && !deviceId) {
    return { items: [], total: 0 };
  }

  const where = {};
  if (userId) {
    where.OR = [
      { user_id: userId },
      { business_user_id: userId },
    ];
  } else if (deviceId) {
    where.device_id = deviceId;
  }

  if (targetType && targetType !== 'ALL') {
    where.target_type = targetType;
  }

  const include = {
    product: {
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
          take: 3,
        },
        specifications: {
          where: { is_filterable: true },
          orderBy: { sort_order: 'asc' },
          take: 5,
        },
      },
    },
    document: {
      include: {
        files: {
          take: 1,
          include: {
            media_asset: {
              select: { id: true, url: true, filename: true, mime_type: true, size_bytes: true },
            },
          },
        },
      },
    },
    testimonial: {
      select: { id: true, customer_name: true, region: true, story_type: true },
    },
  };

  try {
    const [items, total] = await Promise.all([
      prisma.bookmark.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: sort },
        include,
      }),
      prisma.bookmark.count({ where }),
    ]);
    return { items, total };
  } catch (err) {
    if (err.code === 'P2022' && userId) {
      const fallbackWhere = { user_id: userId };
      if (targetType && targetType !== 'ALL') fallbackWhere.target_type = targetType;
      const [items, total] = await Promise.all([
        prisma.bookmark.findMany({ where: fallbackWhere, skip, take, orderBy: { created_at: sort }, include }),
        prisma.bookmark.count({ where: fallbackWhere }),
      ]);
      return { items, total };
    }
    throw err;
  }
}

/**
 * Find an existing bookmark by ID or target ID matching ownership.
 *
 * 1. The use of function:
 *    Locates a specific bookmark ensuring caller owns the record.
 * 2. How does the specific function work:
 *    Constructs ownership check (user_id OR business_user_id OR device_id)
 *    and searches for primary key id or target entity IDs.
 * 3. Concepts used in the function:
 *    Row-level authorization, entity lookup.
 * 4. Places where this function is imported and used:
 *    Imported and used in src/modules/bookmarks/bookmarks.service.js.
 * 5. Final output of the function, before and after:
 *    Before: Lookup criteria { identifier, userId, deviceId }.
 *    After: Bookmark record or null.
 *
 * @param {object} params
 * @returns {Promise<object|null>}
 */
async function findBookmarkByIdOrProduct({ identifier, userId, deviceId }) {
  if (!userId && !deviceId) {
    return null;
  }

  const ownerConditions = userId
    ? [{ user_id: userId }, { business_user_id: userId }]
    : [{ device_id: deviceId }];

  try {
    return await prisma.bookmark.findFirst({
      where: {
        AND: [
          { OR: ownerConditions },
          {
            OR: [
              { id: identifier },
              { product_id: identifier },
              { document_id: identifier },
              { testimonial_id: identifier },
            ],
          },
        ],
      },
    });
  } catch (err) {
    if (err.code === 'P2022' && userId) {
      return prisma.bookmark.findFirst({
        where: {
          AND: [
            { user_id: userId },
            {
              OR: [
                { id: identifier },
                { product_id: identifier },
                { document_id: identifier },
                { testimonial_id: identifier },
              ],
            },
          ],
        },
      });
    }
    throw err;
  }
}

/**
 * Delete bookmark by ID with database-level ownership enforcement.
 *
 * 1. The use of function:
 *    Safely removes a bookmark owned by the authenticated caller or guest device.
 * 2. How does the specific function work:
 *    Constructs a scoped delete query ensuring only the owner's bookmark can be deleted.
 * 3. Concepts used in the function:
 *    Owner-scoped deletion, tenant data isolation.
 * 4. Places where this function is imported and used:
 *    Imported and used in src/modules/bookmarks/bookmarks.service.js.
 * 5. Final output of the function, before and after:
 *    Before: Target delete criteria { id, userId, deviceId }.
 *    After: { count: number } deleted count.
 *
 * @param {object|string} target
 * @returns {Promise<{ count: number }|object>}
 */
async function deleteBookmark(target) {
  if (typeof target === 'string') {
    return prisma.bookmark.delete({
      where: { id: target },
    });
  }

  const { id, userId, deviceId } = target;
  if (!id || (!userId && !deviceId)) {
    return { count: 0 };
  }

  const where = {
    id,
    ...(userId
      ? { OR: [{ user_id: userId }, { business_user_id: userId }] }
      : { device_id: deviceId }),
  };

  try {
    return await prisma.bookmark.deleteMany({
      where,
    });
  } catch (err) {
    if (err.code === 'P2022' && userId) {
      return prisma.bookmark.deleteMany({
        where: { id, user_id: userId },
      });
    }
    throw err;
  }
}

/**
 * Transactional guest-to-account bookmark synchronization.
 * Migrates bookmarks belonging strictly to the verified guest device.
 */
async function syncGuestBookmarks({ userId, deviceId, sourceGuestId }) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch all guest bookmarks for this verified device (user_id is null for guest bookmarks)
    const guestBookmarks = await tx.bookmark.findMany({
      where: {
        device_id: deviceId,
        user_id: null,
      },
    });

    if (guestBookmarks.length === 0) {
      return { syncedCount: 0, removedDuplicates: 0 };
    }

    // 2. Fetch existing user bookmarks
    const userBookmarks = await tx.bookmark.findMany({
      where: { user_id: userId },
      select: { product_id: true },
    });

    const userProductIds = new Set(userBookmarks.map((b) => b.product_id));

    let syncedCount = 0;
    let removedDuplicates = 0;

    for (const gb of guestBookmarks) {
      if (userProductIds.has(gb.product_id)) {
        // User already has this product bookmarked — delete duplicate guest bookmark
        await tx.bookmark.delete({ where: { id: gb.id } });
        removedDuplicates++;
      } else {
        // Re-assign bookmark to authenticated user
        await tx.bookmark.update({
          where: { id: gb.id },
          data: {
            user_id: userId,
            device_id: null,
          },
        });
        userProductIds.add(gb.product_id);
        syncedCount++;
      }
    }

    // If device was linked to the source guest, re-associate it with user
    if (sourceGuestId) {
      await tx.userDevice.updateMany({
        where: {
          device_id: deviceId,
          user_id: sourceGuestId,
        },
        data: {
          user_id: userId,
        },
      });
    }

    return { syncedCount, removedDuplicates };
  });
}

/**
 * Find device record by device_id with user relation.
 */
async function findDevice(deviceId) {
  return prisma.userDevice.findUnique({
    where: { device_id: deviceId },
    include: {
      user: {
        select: { id: true, is_guest: true },
      },
    },
  });
}

module.exports = {
  findProductById,
  findDocumentById,
  findTestimonialById,
  findDeviceForUser,
  findDevice,
  createBookmark,
  findBookmarks,
  findBookmarkByIdOrProduct,
  deleteBookmark,
  syncGuestBookmarks,
};

