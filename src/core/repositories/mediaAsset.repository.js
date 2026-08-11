'use strict';

/**
 * src/core/repositories/mediaAsset.repository.js
 *
 * WHAT THIS FILE DOES:
 *   Repository module for database operations on the media_assets table.
 *   Provides data access methods for creating media asset metadata records.
 *
 * OVERALL DESIGN:
 *   Follows the 5-tier architecture (Repositories are the ONLY layer that calls Prisma).
 *   Encapsulates all Prisma queries targeting media_assets.
 *   Accepts an optional `prismaClient` parameter to allow mock or transaction scopes.
 *
 * ELEMENTS IN THIS FILE:
 *   - createMediaAsset(data, prismaClient) — inserts a media asset row into PostgreSQL
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing database persistence methods for media_assets.
 *
 * IMPORTED BY:
 *   src/core/utils/mediaUpload.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 13 (Admin CMS & file uploads)
 */

const { prisma } = require('../../config/database');

/**
 * mediaAssetRepository
 *
 * USE: Data access layer for media_assets database table.
 *
 * KEY DESIGN:
 *   Encapsulates Prisma write operations for file metadata records.
 *   Does NOT perform storage bucket file manipulation.
 */
const mediaAssetRepository = {
  /**
   * createMediaAsset
   *
   * USE: Inserts one media asset metadata record into media_assets.
   *
   * @param {object} data — { url, filename, mime_type, size_bytes, uploaded_by_admin_id }
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<object>}
   */
  async createMediaAsset(data, prismaClient = prisma) {
    return prismaClient.mediaAsset.create({ data });
  },
};

module.exports = mediaAssetRepository;
