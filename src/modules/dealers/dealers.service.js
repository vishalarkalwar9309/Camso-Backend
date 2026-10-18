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

/**
 * Formats dealer records for API consumption:
 * - Parses Decimal geo_lat and geo_lng into IEEE 754 floating-point numbers.
 * - Provides latitude and longitude field aliases for mobile client double deserializers.
 * - Computes default Google Maps navigation links when location_url is unspecified.
 * - Provides safe null handling for contact attributes.
 *
 * @param {object} d
 * @returns {object}
 */
function formatDealer(d) {
  if (!d) return null;
  const latNum = d.geo_lat != null ? parseFloat(d.geo_lat) : null;
  const lngNum = d.geo_lng != null ? parseFloat(d.geo_lng) : null;
  const distanceNum = d.distance != null ? parseFloat(d.distance) : undefined;
  const defaultLocationUrl = (latNum !== null && lngNum !== null)
    ? `https://www.google.com/maps/search/?api=1&query=${latNum},${lngNum}`
    : null;

  return {
    ...d,
    geo_lat: latNum,
    geo_lng: lngNum,
    latitude: latNum,
    longitude: lngNum,
    distance: distanceNum,
    location_url: d.location_url || defaultLocationUrl,
    phone: d.phone || null,
    email: d.email || null,
  };
}

const dealersService = {
  /**
   * getLocator
   * Retrieves active dealers within a given radius using Haversine calculation.
   */
  async getLocator({ lat, lng, type, radiusKm, query, q }, callerPrincipal = null) {
    const isAuthorizedForDistributor =
      callerPrincipal &&
      ['DEALER', 'DISTRIBUTOR', 'ADMIN', 'SUPER_ADMIN', 'CONTENT_ADMIN'].includes(callerPrincipal.role);

    const normalizedType = type === 'DISTRIBUTOR_HUB' ? 'DISTRIBUTOR' : type;

    // Enforce server-side authorization for distributor network
    if (normalizedType === 'DISTRIBUTOR') {
      if (!isAuthorizedForDistributor) {
        if (!callerPrincipal || callerPrincipal.is_guest) {
          throw ApiError.unauthorized('Authentication required to access distributor network data.');
        }
        throw ApiError.forbidden('Access denied to distributor network data.');
      }
    }

    const searchQuery = query || q;
    const shouldExcludeDistributor = !isAuthorizedForDistributor && !normalizedType;
    let dealers;

    if (lat !== undefined && lng !== undefined && lat !== null && lng !== null && String(lat).trim() !== '' && String(lng).trim() !== '') {
      const nLat = parseFloat(lat);
      const nLng = parseFloat(lng);
      const nRad = parseFloat(radiusKm || 1000);

      dealers = await dealersRepository.findNearest({
        lat: nLat,
        lng: nLng,
        type: normalizedType,
        radiusKm: nRad,
        excludeDistributor: shouldExcludeDistributor,
      });
    } else {
      dealers = await dealersRepository.findAllActive({
        type: normalizedType,
        query: searchQuery,
        excludeDistributor: shouldExcludeDistributor,
      });
    }

    return (dealers || []).map(formatDealer);
  },

  /**
   * getCsrContact
   * Retrieves the CSR contact details for a specified country.
   */
  async getCsrContact({ country }) {
    const csr = await dealersRepository.findCsrContact({ country });
    return csr ? formatDealer(csr) : null;
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
  formatDealer,
};

dealersService.formatDealer = formatDealer;
module.exports = dealersService;
