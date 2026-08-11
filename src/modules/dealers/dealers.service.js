'use strict';

/**
 * src/modules/dealers/dealers.service.js
 *
 * WHAT THIS FILE DOES:
 *   Business logic for dealers locator and CSR contact.
 *
 * OVERALL DESIGN:
 *   Coordinates queries via repository, no raw SQL or DB logic here.
 *
 * ELEMENTS:
 *   getLocator          — orchestrates nearest dealer query
 *   getCsrContact       — orchestrates CSR contact lookup
 *   adminListDealers    — orchestrates admin paginated list
 *   adminGetDealerById  — orchestrates admin single dealer fetch
 *   adminCreateDealer   — orchestrates dealer creation with audit
 *   adminUpdateDealer   — orchestrates dealer update with audit
 *
 * FINAL OUTPUT:
 *   module.exports = dealersService
 *
 * IMPORTED BY:
 *   dealers.controller.js
 */

const dealersRepository = require('./dealers.repository');
const auditService = require('../../core/services/auditService');
const ApiError = require('../../core/utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../../core/utils/pagination');

const dealersService = {
  /**
   * getLocator
   * Retrieves active dealers within a given radius using Haversine calculation.
   */
  async getLocator({ lat, lng, type, radiusKm }) {
    // Validate inputs numerically at service boundary just in case
    const nLat = parseFloat(lat);
    const nLng = parseFloat(lng);
    const nRad = parseFloat(radiusKm);

    return dealersRepository.findNearest({
      lat: nLat,
      lng: nLng,
      type,
      radiusKm: nRad
    });
  },

  /**
   * getCsrContact
   * Retrieves the CSR contact details for a specified country.
   */
  async getCsrContact({ country }) {
    return dealersRepository.findCsrContact({ country });
  },

  /**
   * adminListDealers
   *
   * USE: Returns paginated list of all dealers for admin (includes inactive).
   *
   * HOW IT WORKS:
   *   Parses pagination from query. Applies optional type/country/is_active filters.
   *   Returns dealers list and pagination meta.
   *
   * CONCEPTS: Pagination, allow-list filtering, repository pattern.
   *
   * @param {object} filters — validated filter params (type, country, is_active)
   * @param {object} query   — raw req.query for pagination params
   * @returns {Promise<{ dealers: Array, pagination: object }>}
   */
  async adminListDealers(filters, query) {
    const { page, pageSize, skip, take, sort } = parsePagination(query);
    const { dealers, total } = await dealersRepository.findAdminDealers(filters, { skip, take, sort });
    return {
      dealers,
      pagination: buildPaginationMeta(page, pageSize, total),
    };
  },

  /**
   * adminGetDealerById
   *
   * USE: Returns a single dealer by ID for admin view (regardless of is_active).
   *
   * @param {number} id — dealer primary key
   * @returns {Promise<object>}
   */
  async adminGetDealerById(id) {
    const dealer = await dealersRepository.findDealerById(id);
    if (!dealer) throw ApiError.notFound(`Dealer with ID ${id} not found.`);
    return dealer;
  },

  /**
   * adminCreateDealer
   *
   * USE: Creates a new dealer record and writes a CREATE audit log entry.
   *
   * HOW IT WORKS:
   *   1. Calls repository to persist dealer.
   *   2. Calls auditService.record() with CREATE action.
   *
   * CONCEPTS: Audit logging — auditService called explicitly after mutation.
   *
   * @param {object} data         — validated dealer fields
   * @param {object} auditContext — req.auditContext from auditContext middleware
   * @returns {Promise<object>}   — created dealer
   */
  async adminCreateDealer(data, auditContext) {
    const dealer = await dealersRepository.createDealer(data);
    await auditService.record({
      actorId: auditContext.actorId,
      action: 'CREATE',
      entityType: 'DEALER',
      entityId: dealer.id,
      before: null,
      after: dealer,
      ip: auditContext.ip,
      userAgent: auditContext.userAgent,
    });
    return dealer;
  },

  /**
   * adminUpdateDealer
   *
   * USE: Updates dealer fields (including is_active for soft deactivation) and writes UPDATE audit log.
   *
   * HOW IT WORKS:
   *   1. Fetches current state (before).
   *   2. Applies update via repository.
   *   3. Calls auditService.record() with UPDATE action.
   *
   * CONCEPTS: Before/after state capture for audit. Soft-deactivation via is_active.
   *
   * @param {number} id           — dealer primary key
   * @param {object} data         — validated update fields
   * @param {object} auditContext — req.auditContext
   * @returns {Promise<object>}   — updated dealer
   */
  async adminUpdateDealer(id, data, auditContext) {
    const before = await dealersRepository.findDealerById(id);
    if (!before) throw ApiError.notFound(`Dealer with ID ${id} not found.`);
    const after = await dealersRepository.updateDealer(id, data);
    await auditService.record({
      actorId: auditContext.actorId,
      action: 'UPDATE',
      entityType: 'DEALER',
      entityId: id,
      before,
      after,
      ip: auditContext.ip,
      userAgent: auditContext.userAgent,
    });
    return after;
  },
};

module.exports = dealersService;
