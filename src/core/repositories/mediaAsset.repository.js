'use strict';

/**
 * src/core/repositories/mediaAsset.repository.js
 *
 * Repository module for database operations on the media_assets table.
 * Encapsulates all Prisma queries targeting media_assets.
 */

const { prisma } = require('../../config/database');

const mediaAssetRepository = {
  /**
   * createMediaAsset
   * Inserts one media asset metadata record into media_assets.
   *
   * @param {object} data — { url, filename, mime_type, size_bytes, uploaded_by_admin_id }
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<object>}
   */
  async createMediaAsset(data, prismaClient = prisma) {
    return prismaClient.mediaAsset.create({ data });
  },

  async findById(id, prismaClient = prisma) {
    return prismaClient.mediaAsset.findUnique({ where: { id: String(id) } });
  },
};

module.exports = mediaAssetRepository;
