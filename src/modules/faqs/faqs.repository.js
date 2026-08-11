'use strict';

/**
 * src/modules/faqs/faqs.repository.js
 *
 * WHAT THIS FILE DOES:
 *   Repository module for database access on the faqs table.
 *   Contains Prisma queries for reading published FAQs.
 *
 * OVERALL DESIGN:
 *   Follows the 5-tier architecture (Repositories are the ONLY layer that calls Prisma).
 *   Encapsulates all database reads for faqs.
 *
 * ELEMENTS IN THIS FILE:
 *   - findPublishedFaqs(filters, pagination, prismaClient) — lists published FAQs with count
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing database query methods for faqs.
 *
 * IMPORTED BY:
 *   src/modules/faqs/faqs.service.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 4 & 7
 */

const { parseSort } = require('../../core/utils/pagination');
const { prisma } = require('../../config/database');

const ALLOWED_SORT_FIELDS = ['sort_order', 'created_at', 'updated_at', 'id'];

const faqsRepository = {
  /**
   * findPublishedFaqs
   *
   * USE: Queries PostgreSQL for published FAQs matching filter criteria with pagination.
   *      Defaults to sorting by sort_order ascending.
   *
   * HOW IT WORKS:
   *   Builds Prisma where clause enforcing `is_published: true`.
   *   Applies optional category and product_id filters.
   *   Uses parseSort defaulting to sort_order asc.
   *   Executes count and findMany in a transaction.
   *
   * CONCEPTS: Offset pagination, Prisma transaction query, allow-list sort safety.
   *
   * PLACES IMPORTED AND USED: src/modules/faqs/faqs.service.js
   *
   * @param {object} filters — { category, product_id }
   * @param {object} pagination — { skip, take, sort }
   * @param {object} [prismaClient=prisma] — Prisma client instance
   * @returns {Promise<[number, Array<object>]>} — count and records array
   */
  async findPublishedFaqs(filters, pagination, prismaClient = prisma) {
    const where = {
      is_published: true,
    };

    if (filters.category) where.category = filters.category;
    if (filters.product_id) where.product_id = filters.product_id;

    const { orderBy } = parseSort(pagination.sort, ALLOWED_SORT_FIELDS, 'sort_order', 'asc');

    return prismaClient.$transaction([
      prismaClient.faq.count({ where }),
      prismaClient.faq.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        select: {
          id: true,
          product_id: true,
          category: true,
          sort_order: true,
          created_at: true,
          updated_at: true,
        },
      }),
    ]);
  },
};

module.exports = faqsRepository;
