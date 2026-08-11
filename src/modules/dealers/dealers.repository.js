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
 *   findNearest — executes raw SQL locator query
 *   findCsrContact — queries active dealers by country
 *
 * FINAL OUTPUT:
 *   module.exports = dealersRepository
 *
 * IMPORTED BY:
 *   dealers.service.js
 */

const { Prisma } = require('@prisma/client');
const prisma = require('../../config/database');

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
  }
};

module.exports = dealersRepository;
