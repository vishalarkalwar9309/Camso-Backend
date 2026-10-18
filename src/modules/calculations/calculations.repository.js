'use strict';

/**
 * 1. What this file does:
 *    Database access layer for the UserCalculation domain model, managing storage, retrieval,
 *    and deletion of user-generated calculator entries using Prisma ORM.
 * 2. Overall design:
 *    Provides decoupled query abstractions for saving tire/ROI calculator results and querying
 *    saved calculations strictly scoped to the owner user ID or guest device ID.
 * 3. Elements in the file:
 *    - createCalculation: Inserts a new user_calculations row.
 *    - findCalculations: Fetches a paginated array of calculations matching owner.
 *    - countCalculations: Returns total count of calculations matching owner.
 *    - findCalculationById: Retrieves a single calculation with ownership validation.
 *    - deleteCalculation: Deletes a calculation owned by the caller.
 * 4. Final output of the file:
 *    Exports repository methods used by calculations.service.js.
 */

const { prisma } = require('../../config/database');

/**
 * Inserts a new calculation record into the database.
 *
 * 1. The use of function:
 *    Persists calculation inputs, outputs, and metadata for a user or device.
 * 2. How does the specific function work:
 *    Executes prisma.userCalculation.create with provided data fields.
 * 3. Concepts used in the function:
 *    Prisma ORM record creation, JSON column serialization.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/calculations/calculations.service.js.
 * 5. Final output of the function, before and after:
 *    Before: Calculation input payload.
 *    After: Persisted UserCalculation record with ID and timestamps.
 *
 * @param {object} data - Object containing user_id, device_id, calculation_type, title, inputs, results, notes.
 * @returns {Promise<object>} The created calculation record.
 */
async function createCalculation(data) {
  return prisma.userCalculation.create({
    data,
  });
}

/**
 * Retrieves a paginated list of saved calculations for an owner.
 *
 * 1. The use of function:
 *    Queries calculations belonging to an authenticated user or guest device.
 * 2. How does the specific function work:
 *    Constructs a Prisma where condition ensuring records belong to userId or deviceId,
 *    and optionally filters by calculationType.
 * 3. Concepts used in the function:
 *    Pagination, owner scoping, database index query.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/calculations/calculations.service.js.
 * 5. Final output of the function, before and after:
 *    Before: Filter parameters { userId, deviceId, calculationType, skip, take }.
 *    After: Array of UserCalculation records ordered by created_at desc.
 *
 * @param {object} params - { userId, deviceId, calculationType, skip, take }
 * @returns {Promise<Array<object>>}
 */
async function findCalculations({ userId, deviceId, calculationType, skip = 0, take = 20 }) {
  const where = {};

  if (userId) {
    where.user_id = userId;
  } else if (deviceId) {
    where.device_id = deviceId;
  } else {
    return [];
  }

  if (calculationType) {
    where.calculation_type = calculationType;
  }

  return prisma.userCalculation.findMany({
    where,
    orderBy: { created_at: 'desc' },
    skip,
    take,
  });
}

/**
 * Counts total calculations matching owner criteria.
 *
 * 1. The use of function:
 *    Computes total records for calculation pagination metadata.
 * 2. How does the specific function work:
 *    Executes prisma.userCalculation.count matching owner where condition.
 * 3. Concepts used in the function:
 *    Prisma count aggregation.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/calculations/calculations.service.js.
 * 5. Final output of the function, before and after:
 *    Before: Filter parameters.
 *    After: Total count integer.
 *
 * @param {object} params - { userId, deviceId, calculationType }
 * @returns {Promise<number>}
 */
async function countCalculations({ userId, deviceId, calculationType }) {
  const where = {};

  if (userId) {
    where.user_id = userId;
  } else if (deviceId) {
    where.device_id = deviceId;
  } else {
    return 0;
  }

  if (calculationType) {
    where.calculation_type = calculationType;
  }

  return prisma.userCalculation.count({ where });
}

/**
 * Retrieves a single calculation ensuring it is owned by the caller.
 *
 * 1. The use of function:
 *    Fetches detailed calculation results for a specific saved entry.
 * 2. How does the specific function work:
 *    Finds first record matching id and caller's user_id or device_id.
 * 3. Concepts used in the function:
 *    Secure ID lookup with ownership verification.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/calculations/calculations.service.js.
 * 5. Final output of the function, before and after:
 *    Before: ID and caller ownership identifiers.
 *    After: UserCalculation record or null if not found.
 *
 * @param {object} params - { id, userId, deviceId }
 * @returns {Promise<object|null>}
 */
async function findCalculationById({ id, userId, deviceId }) {
  const where = { id };

  if (userId) {
    where.user_id = userId;
  } else if (deviceId) {
    where.device_id = deviceId;
  } else {
    return null;
  }

  return prisma.userCalculation.findFirst({
    where,
  });
}

/**
 * Deletes a calculation owned by the caller.
 *
 * 1. The use of function:
 *    Removes a saved calculation record from user storage.
 * 2. How does the specific function work:
 *    Calls deleteMany matching id and caller ownership to prevent cross-user deletions.
 * 3. Concepts used in the function:
 *    Idempotent and secure resource deletion.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/calculations/calculations.service.js.
 * 5. Final output of the function, before and after:
 *    Before: Target ID and owner context.
 *    After: { count: number } indicating number of deleted records.
 *
 * @param {object} params - { id, userId, deviceId }
 * @returns {Promise<{ count: number }>}
 */
async function deleteCalculation({ id, userId, deviceId }) {
  const where = { id };

  if (userId) {
    where.user_id = userId;
  } else if (deviceId) {
    where.device_id = deviceId;
  } else {
    return { count: 0 };
  }

  return prisma.userCalculation.deleteMany({
    where,
  });
}

module.exports = {
  createCalculation,
  findCalculations,
  countCalculations,
  findCalculationById,
  deleteCalculation,
};
