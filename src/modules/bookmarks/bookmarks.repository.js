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
 * Create a new bookmark.
 */
async function createBookmark({ userId, deviceId, productId }) {
  return prisma.bookmark.create({
    data: {
      user_id: userId || null,
      device_id: deviceId || null,
      product_id: productId,
    },
    include: {
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
    },
  });
}

/**
 * Find paginated bookmarks for a user or guest device.
 */
async function findBookmarks({ userId, deviceId, skip = 0, take = 20, sort = 'desc' }) {
  if (!userId && !deviceId) {
    return { items: [], total: 0 };
  }

  const where = {
    product: { is_active: true },
    ...(userId ? { user_id: userId } : { device_id: deviceId }),
  };

  const [items, total] = await Promise.all([
    prisma.bookmark.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: sort },
      include: {
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
      },
    }),
    prisma.bookmark.count({ where }),
  ]);

  return { items, total };
}

/**
 * Find an existing bookmark by ID or product ID matching ownership.
 */
async function findBookmarkByIdOrProduct({ identifier, userId, deviceId }) {
  if (!userId && !deviceId) {
    return null;
  }

  const ownerCondition = userId ? { user_id: userId } : { device_id: deviceId };

  return prisma.bookmark.findFirst({
    where: {
      AND: [
        ownerCondition,
        {
          OR: [{ id: identifier }, { product_id: identifier }],
        },
      ],
    },
  });
}

/**
 * Delete bookmark by ID with database-level ownership enforcement.
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
    ...(userId ? { user_id: userId } : { device_id: deviceId }),
  };

  return prisma.bookmark.deleteMany({
    where,
  });
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
  findDeviceForUser,
  findDevice,
  createBookmark,
  findBookmarks,
  findBookmarkByIdOrProduct,
  deleteBookmark,
  syncGuestBookmarks,
};

