'use strict';

/**
 * src/modules/dealers/dealers.repository.js
 *
 * WHAT THIS FILE DOES:
 *   Database access for dealers using Prisma.
 *
 * OVERALL DESIGN:
 *   Contains raw SQL for Haversine distance calculation to avoid PostGIS dependency.
 *
 * ELEMENTS:
 *   findNearest       — executes raw SQL locator query
 *   findCsrContact    — queries active dealers by country
 *   findAdminDealers  — paginated admin list (all statuses)
 *   findDealerById    — single dealer by ID
 *   createDealer      — inserts new dealer row
 *   updateDealer      — updates dealer fields
 *
 * FINAL OUTPUT:
 *   module.exports = dealersRepository
 *
 * IMPORTED BY:
 *   dealers.service.js
 */

const { Prisma } = require('@prisma/client');
const { prisma } = require('../../config/database');

const dealersRepository = {
  /**
   * findNearest
   * Use Haversine formula in raw SQL to find dealers within radiusKm.
   * Parameterized to prevent SQL injection.
   */
  async findNearest({ lat, lng, type, radiusKm }) {
    // 6371 is the radius of the Earth in km
    let query = Prisma.sql`
      SELECT id, name, type, address, city, state, country, geo_lat, geo_lng, phone, email, has_csr, is_active,
      ( 6371 * acos( cos( radians(${lat}) ) * cos( radians( geo_lat ) ) * cos( radians( geo_lng ) - radians(${lng}) ) + sin( radians(${lat}) ) * sin( radians( geo_lat ) ) ) ) AS distance
      FROM dealers
      WHERE is_active = true
    `;

    if (type) {
      query = Prisma.sql`${query} AND type = ${type}::"DealerType"`;
    }

    query = Prisma.sql`${query} 
      AND ( 6371 * acos( cos( radians(${lat}) ) * cos( radians( geo_lat ) ) * cos( radians( geo_lng ) - radians(${lng}) ) + sin( radians(${lat}) ) * sin( radians( geo_lat ) ) ) ) <= ${radiusKm}
      ORDER BY distance ASC
    `;

    return prisma.$queryRaw(query);
  },

  /**
   * findAllActive
   * Find active dealers filtered by optional type and text search query.
   */
  async findAllActive({ type, query: searchQuery } = {}) {
    const where = { is_active: true };
    if (type) {
      const normalizedType = type === 'DISTRIBUTOR_HUB' ? 'DISTRIBUTOR' : type;
      where.type = normalizedType;
    }
    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { city: { contains: searchQuery, mode: 'insensitive' } },
        { country: { contains: searchQuery, mode: 'insensitive' } },
        { address: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }
    return prisma.dealer.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  },

  /**
   * findCsrContact
   * Find active CSR contacts for a specific country
   */
  async findCsrContact({ country }) {
    return prisma.dealer.findFirst({
      where: {
        country: country,
        has_csr: true,
        is_active: true
      },
      select: {
        id: true,
        name: true,
        type: true,
        city: true,
        country: true,
        phone: true,
        email: true
      }
    });
  },

  /**
   * findAdminDealers
   *
   * USE: Returns paginated list of all dealers for admin, filtered by optional params.
   *
   * HOW IT WORKS:
   *   Builds Prisma where clause from filters. Applies parseSort. Runs count + findMany.
   *
   * @param {object} filters     — { type, country, is_active }
   * @param {object} pagination  — { skip, take, sort }
   * @returns {Promise<{ dealers: Array, total: number }>}
   */
  async findAdminDealers(filters, pagination) {
    const { parseSort } = require('../../core/utils/pagination');
    // Dealer model has no created_at — sort by id, name, country, city, type, is_active only
    const ALLOWED_SORT = ['id', 'name', 'country', 'city', 'type', 'is_active'];
    const where = {};
    if (filters.type) where.type = filters.type;
    if (filters.country) where.country = filters.country;
    if (typeof filters.is_active === 'boolean') where.is_active = filters.is_active;

    const { orderBy } = parseSort(pagination.sort, ALLOWED_SORT, 'id', 'asc');
    const [total, dealers] = await prisma.$transaction([
      prisma.dealer.count({ where }),
      prisma.dealer.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
      }),
    ]);
    return { total, dealers };
  },

  /**
   * findDealerById
   *
   * USE: Fetches a single dealer by primary key (admin view, no is_active filter).
   *
   * @param {number} id — dealer PK
   * @returns {Promise<object|null>}
   */
  async findDealerById(id) {
    return prisma.dealer.findUnique({ where: { id } });
  },

  /**
   * createDealer
   *
   * USE: Inserts a new dealer row into the database.
   *
   * @param {object} data — validated dealer fields
   * @returns {Promise<object>} — created dealer
   */
  async createDealer(data) {
    return prisma.dealer.create({ data });
  },

  /**
   * updateDealer
   *
   * USE: Updates dealer fields by primary key.
   *
   * @param {number} id   — dealer PK
   * @param {object} data — validated update fields
   * @returns {Promise<object>} — updated dealer
   */
  async updateDealer(id, data) {
    return prisma.dealer.update({ where: { id }, data });
  },
};

module.exports = dealersRepository;
