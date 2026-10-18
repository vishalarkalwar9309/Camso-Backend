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
   *
   * 1. USE OF FUNCTION:
   *   Finds active dealers located within a radial boundary (radiusKm) from a geographic coordinate (lat, lng).
   * 2. HOW DOES THE SPECIFIC FUNCTION WORK:
   *   Executes a raw SQL query using PostgreSQL trigonometrics to calculate spherical distance (Haversine formula).
   *   Filters on is_active = true, applies optional type filter or excludes DISTRIBUTOR type when caller lacks business permissions,
   *   filters by distance <= radiusKm, and orders results ascending by distance.
   * 3. CONCEPTS USED IN THE FUNCTION:
   *   Haversine spherical distance formula, SQL parameterization via Prisma.sql to prevent injection, PostgreSQL enum casting.
   * 4. PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
   *   Imported and called by src/modules/dealers/dealers.service.js in getLocator().
   * 5. FINAL OUTPUT OF THE FUNCTION, BEFORE AND AFTER:
   *   Before: Array of raw dealer records within radius.
   *   After: Array of raw dealer records within radius, with DISTRIBUTOR records omitted if excludeDistributor is true and no specific type is requested.
   *
   * @param {object} params — { lat, lng, type, radiusKm, excludeDistributor }
   * @returns {Promise<Array<object>>}
   */
  async findNearest({ lat, lng, type, radiusKm, excludeDistributor = false }) {
    // 6371 is the radius of the Earth in km
    let query = Prisma.sql`
      SELECT id, name, type, address, city, state, country, geo_lat, geo_lng, location_url, phone, email, has_csr, is_active,
      ( 6371 * acos( cos( radians(${lat}) ) * cos( radians( geo_lat ) ) * cos( radians( geo_lng ) - radians(${lng}) ) + sin( radians(${lat}) ) * sin( radians( geo_lat ) ) ) ) AS distance
      FROM dealers
      WHERE is_active = true
    `;

    if (type) {
      query = Prisma.sql`${query} AND type = ${type}::"DealerType"`;
    } else if (excludeDistributor) {
      query = Prisma.sql`${query} AND type != 'DISTRIBUTOR'::"DealerType"`;
    }

    query = Prisma.sql`${query} 
      AND ( 6371 * acos( cos( radians(${lat}) ) * cos( radians( geo_lat ) ) * cos( radians( geo_lng ) - radians(${lng}) ) + sin( radians(${lat}) ) * sin( radians( geo_lat ) ) ) ) <= ${radiusKm}
      ORDER BY distance ASC
    `;

    return prisma.$queryRaw(query);
  },

  /**
   * findAllActive
   *
   * 1. USE OF FUNCTION:
   *   Retrieves all active dealers matching optional type filter and text search query.
   * 2. HOW DOES THE SPECIFIC FUNCTION WORK:
   *   Constructs a Prisma where clause with is_active: true. If type is specified, maps DISTRIBUTOR_HUB to DISTRIBUTOR.
   *   If type is omitted and excludeDistributor is true, excludes DISTRIBUTOR records.
   *   If searchQuery is present, performs case-insensitive OR search on name, city, country, and address.
   *   Executes prisma.dealer.findMany ordered alphabetically by name.
   * 3. CONCEPTS USED IN THE FUNCTION:
   *   Prisma relational query builder, case-insensitive substring search, conditional where-clause construction.
   * 4. PLACES WHERE THIS FUNCTION IS IMPORTED AND USED:
   *   Imported and called by src/modules/dealers/dealers.service.js in getLocator().
   * 5. FINAL OUTPUT OF THE FUNCTION, BEFORE AND AFTER:
   *   Before: Array of active dealer records matching search filters.
   *   After: Array of active dealer records matching search filters, filtering out DISTRIBUTOR rows if caller is not authorized for distributor network data.
   *
   * @param {object} params — { type, query, excludeDistributor }
   * @returns {Promise<Array<object>>}
   */
  async findAllActive({ type, query: searchQuery, excludeDistributor = false } = {}) {
    const where = { is_active: true };
    if (type) {
      const normalizedType = type === 'DISTRIBUTOR_HUB' ? 'DISTRIBUTOR' : type;
      where.type = normalizedType;
    } else if (excludeDistributor) {
      where.type = { not: 'DISTRIBUTOR' };
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
        email: true,
        location_url: true,
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
