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
 *   getLocator — orchestrates nearest dealer query
 *   getCsrContact — orchestrates CSR contact lookup
 *
 * FINAL OUTPUT:
 *   module.exports = dealersService
 *
 * IMPORTED BY:
 *   dealers.controller.js
 */

const dealersRepository = require('./dealers.repository');

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
  }
};

module.exports = dealersService;
