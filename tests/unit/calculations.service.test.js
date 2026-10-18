'use strict';

/**
 * 1. What this file does:
 *    Unit tests for the User Calculations service and validation schemas.
 * 2. Overall design:
 *    Exercises saveCalculation, getCalculations, getCalculationById, deleteCalculation,
 *    and Joi validation schemas for engineering calculator features.
 * 3. Elements in the file:
 *    - describe('Calculations Service (Unit Tests)'): Main test suite.
 *    - saveCalculation tests: Verifies input/output persistence and owner mapping.
 *    - getCalculations tests: Verifies pagination handling.
 *    - getCalculationById tests: Verifies retrieval.
 *    - deleteCalculation tests: Verifies deletion.
 *    - validation tests: Verifies schema constraints for calculation_type, inputs, and results.
 * 4. Final output of the file:
 *    Test assertions verifying calculator backend business logic.
 */

const service = require('../../src/modules/calculations/calculations.service');
const {
  createCalculationSchema,
  listCalculationsSchema,
  calculationIdParamSchema,
} = require('../../src/modules/calculations/calculations.validation');

describe('Calculations Service (Unit Tests)', () => {
  describe('saveCalculation', () => {
    it('saves a calculation for an authenticated registered user', async () => {
      const principal = { id: 'usr-1', is_guest: false };
      const payload = {
        calculation_type: 'TIRE_LOAD_PRESSURE',
        title: 'Front Axle 12-16.5 Recommendation',
        inputs: { axle_load_kg: 3200, speed_kmh: 25, tire_size: '12-16.5' },
        results: { recommended_pressure_psi: 65, load_index: 140 },
        notes: 'Calculated for warehouse asphalt duty',
      };

      const result = await service.saveCalculation(principal, payload);

      expect(result).toBeDefined();
      expect(result.user_id).toBe('usr-1');
      expect(result.calculation_type).toBe('TIRE_LOAD_PRESSURE');
      expect(result.inputs).toEqual(payload.inputs);
      expect(result.results).toEqual(payload.results);
    });

    it('saves a calculation for a guest session with deviceId', async () => {
      const principal = { id: 'guest-1', is_guest: true, deviceId: 'dev-guest-99' };
      const payload = {
        calculation_type: 'PAYBACK_ROI',
        inputs: { current_tire_cost: 400, expected_life_hours: 800 },
        results: { hours_gain_pct: 35, cost_per_hour_reduction: 0.15 },
      };

      const result = await service.saveCalculation(principal, payload);

      expect(result).toBeDefined();
      expect(result.device_id).toBe('dev-guest-99');
      expect(result.calculation_type).toBe('PAYBACK_ROI');
    });

    it('throws 400 BAD_REQUEST if guest has no device identifier', async () => {
      const principal = { id: 'guest-1', is_guest: true, deviceId: null };
      const payload = {
        calculation_type: 'TIRE_LOAD_PRESSURE',
        inputs: {},
        results: {},
      };

      await expect(service.saveCalculation(principal, payload)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Guest session requires an active device identifier.',
      });
    });
  });

  describe('getCalculations', () => {
    it('returns paginated items for authenticated caller', async () => {
      const principal = { id: 'usr-1', is_guest: false };
      const query = { page: 1, pageSize: 20 };

      const result = await service.getCalculations(principal, query);

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.pagination).toMatchObject({
        page: 1,
        pageSize: 20,
      });
    });
  });

  describe('getCalculationById', () => {
    it('retrieves calculation by ID in test environment', async () => {
      const principal = { id: 'usr-1', is_guest: false };

      const result = await service.getCalculationById(principal, 'calc-100');

      expect(result).toBeDefined();
      expect(result.id).toBe('calc-100');
      expect(result.user_id).toBe('usr-1');
    });
  });

  describe('deleteCalculation', () => {
    it('returns success message when deleting calculation', async () => {
      const principal = { id: 'usr-1', is_guest: false };

      const result = await service.deleteCalculation(principal, 'calc-100');

      expect(result).toMatchObject({
        message: 'Calculation deleted successfully.',
      });
    });
  });

  describe('Validation Schemas', () => {
    it('validates a complete calculation payload', () => {
      const { error, value } = createCalculationSchema.validate({
        calculation_type: 'TIRE_LOAD_PRESSURE',
        title: 'Skid Steer Pressure',
        inputs: { axle_weight: 4500 },
        results: { cold_inflation_psi: 70 },
      });

      expect(error).toBeUndefined();
      expect(value.calculation_type).toBe('TIRE_LOAD_PRESSURE');
    });

    it('rejects payload missing inputs object', () => {
      const { error } = createCalculationSchema.validate({
        calculation_type: 'TIRE_LOAD_PRESSURE',
        results: { cold_inflation_psi: 70 },
      });

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('inputs object is required');
    });

    it('rejects payload missing results object', () => {
      const { error } = createCalculationSchema.validate({
        calculation_type: 'TIRE_LOAD_PRESSURE',
        inputs: { axle_weight: 4500 },
      });

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('results object is required');
    });

    it('validates valid calculation ID param', () => {
      const { error, value } = calculationIdParamSchema.validate({ id: 'c-12345' });

      expect(error).toBeUndefined();
      expect(value.id).toBe('c-12345');
    });
  });
});
