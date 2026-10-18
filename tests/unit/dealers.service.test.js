'use strict';

/**
 * 1. What this file does:
 *    Unit tests for the Dealers service module, validating coordinate parsing,
 *    field aliasing, Google Maps location_url generation, and CSR contact retrieval.
 * 2. Overall design:
 *    Mocks the dealers repository and tests getLocator, getCsrContact, and formatDealer
 *    to ensure mathematical stability and schema compliance for mobile mapping widgets.
 * 3. Elements in the file:
 *    - describe('Dealers Service (Unit Tests)'): Main test suite.
 *    - formatDealer tests: Validates float casting, latitude/longitude aliases, and fallback Google Maps URL.
 *    - getLocator tests: Validates query parameter passthrough and list formatting.
 *    - getCsrContact tests: Validates country-based CSR contact formatting.
 * 4. Final output of the file:
 *    Executes unit assertions verifying dealer locator backend behavior.
 */

const dealersService = require('../../src/modules/dealers/dealers.service');
const dealersRepository = require('../../src/modules/dealers/dealers.repository');

jest.mock('../../src/modules/dealers/dealers.repository');

describe('Dealers Service (Unit Tests)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('formatDealer', () => {
    it('correctly converts Decimal/string coordinates to IEEE 754 floats and aliases latitude/longitude', () => {
      const rawDealer = {
        id: 'dlr-1',
        name: 'Midwest Industrial Tire',
        geo_lat: '40.7128000',
        geo_lng: '-74.0060000',
        distance: '12.45',
        phone: '+1-555-0199',
        email: 'sales@midwesttire.com',
      };

      const formatted = dealersService.formatDealer(rawDealer);

      expect(formatted).toBeDefined();
      expect(typeof formatted.latitude).toBe('number');
      expect(typeof formatted.longitude).toBe('number');
      expect(formatted.latitude).toBeCloseTo(40.7128);
      expect(formatted.longitude).toBeCloseTo(-74.006);
      expect(formatted.geo_lat).toBeCloseTo(40.7128);
      expect(formatted.geo_lng).toBeCloseTo(-74.006);
      expect(formatted.distance).toBeCloseTo(12.45);
      expect(formatted.location_url).toBe('https://www.google.com/maps/search/?api=1&query=40.7128,-74.006');
    });

    it('preserves existing location_url if already provided in database', () => {
      const rawDealer = {
        id: 'dlr-2',
        name: 'Custom Location Hub',
        geo_lat: '34.0522',
        geo_lng: '-118.2437',
        location_url: 'https://maps.apple.com/?q=Custom+Hub',
      };

      const formatted = dealersService.formatDealer(rawDealer);

      expect(formatted.location_url).toBe('https://maps.apple.com/?q=Custom+Hub');
      expect(formatted.latitude).toBeCloseTo(34.0522);
      expect(formatted.longitude).toBeCloseTo(-118.2437);
    });

    it('gracefully handles null coordinates without throwing exceptions', () => {
      const rawDealer = {
        id: 'dlr-3',
        name: 'Remote Service Center',
        geo_lat: null,
        geo_lng: null,
      };

      const formatted = dealersService.formatDealer(rawDealer);

      expect(formatted.latitude).toBeNull();
      expect(formatted.longitude).toBeNull();
      expect(formatted.location_url).toBeNull();
    });
  });

  describe('getLocator', () => {
    it('queries repository and returns formatted nearest dealers', async () => {
      dealersRepository.findNearest.mockResolvedValue([
        {
          id: 'dlr-10',
          name: 'Central Dealer Hub',
          geo_lat: '41.8781',
          geo_lng: '-87.6298',
          distance: '5.2',
        },
      ]);

      const results = await dealersService.getLocator({
        lat: 41.8781,
        lng: -87.6298,
        radiusKm: 25,
      });

      expect(dealersRepository.findNearest).toHaveBeenCalledWith({
        lat: 41.8781,
        lng: -87.6298,
        type: undefined,
        radiusKm: 25,
      });
      expect(results).toHaveLength(1);
      expect(results[0].latitude).toBeCloseTo(41.8781);
      expect(results[0].location_url).toBe('https://www.google.com/maps/search/?api=1&query=41.8781,-87.6298');
    });
  });

  describe('getCsrContact', () => {
    it('retrieves and formats active CSR contact for a country', async () => {
      dealersRepository.findCsrContact.mockResolvedValue({
        id: 'csr-1',
        name: 'CAMSO North America CSR',
        city: 'Charlotte',
        country: 'US',
        phone: '+1-800-555-CSR1',
        email: 'csr.na@camso.co',
        geo_lat: '35.2271',
        geo_lng: '-80.8431',
      });

      const contact = await dealersService.getCsrContact({ country: 'US' });

      expect(contact).toBeDefined();
      expect(contact.name).toBe('CAMSO North America CSR');
      expect(contact.latitude).toBeCloseTo(35.2271);
      expect(contact.location_url).toContain('35.2271,-80.8431');
    });
  });
});
