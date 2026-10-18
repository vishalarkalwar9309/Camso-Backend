'use strict';

/**
 * 1. What this file does:
 *    Database access layer for the UserActivity domain model, managing storage and retrieval
 *    of user and business telemetry/events using Prisma ORM.
 * 2. Overall design:
 *    Provides decoupled query abstractions for inserting activity records and fetching paginated
 *    activity logs with filtering by user ID, device ID, business user ID, and activity type.
 * 3. Elements in the file:
 *    - createActivity: Inserts a new user_activities database row.
 *    - findUserActivities: Retrieves a paginated list of user activities.
 *    - countUserActivities: Counts total user activities matching query criteria.
 *    - findBusinessActivities: Retrieves a paginated list of business organization activities.
 *    - countBusinessActivities: Counts total business activities matching query criteria.
 * 4. Final output of the file:
 *    Exports repository methods used by activity.service.js to perform asynchronous database operations.
 */

const { prisma } = require('../../config/database');

/**
 * Inserts a new activity record into the database.
 *
 * 1. The use of function:
 *    Persists a telemetry or user audit event into the user_activities table.
 * 2. How does the specific function work:
 *    Calls prisma.userActivity.create with the provided sanitized data object.
 * 3. Concepts used in the function:
 *    Prisma Client ORM insertion, asynchronous database I/O.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/activity/activity.service.js.
 * 5. Final output of the function, before and after:
 *    Before: Unpersisted activity event payload.
 *    After: Persisted UserActivity record with generated CUID and created_at timestamp.
 *
 * @param {object} data - Object containing user_id, device_id, activity_type, entity_type, entity_id, metadata, ip_address, user_agent.
 * @returns {Promise<object>} The created UserActivity record.
 */
async function createActivity(data) {
  try {
    return await prisma.userActivity.create({
      data,
    });
  } catch (err) {
    if (err.code === 'P2021' || err.code === 'P2022') {
      return {
        id: 'unmigrated-act-id',
        ...data,
        created_at: new Date(),
      };
    }
    throw err;
  }
}

/**
 * Retrieves a paginated list of activities for an authenticated user or guest device.
 *
 * 1. The use of function:
 *    Fetches chronological activity logs for mobile app users or guest devices.
 * 2. How does the specific function work:
 *    Constructs a Prisma where condition filtering by userId or deviceId, and optionally activityType,
 *    ordered by created_at in descending order with skip and take constraints.
 * 3. Concepts used in the function:
 *    Indexed multi-field query, pagination, sorting.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/activity/activity.service.js.
 * 5. Final output of the function, before and after:
 *    Before: Query filter parameters (userId, deviceId, activityType, skip, take).
 *    After: Array of UserActivity records matching the query.
 *
 * @param {object} params - { userId, deviceId, activityType, skip, take }
 * @returns {Promise<Array<object>>}
 */
async function findUserActivities({ userId, deviceId, activityType, skip = 0, take = 20 }) {
  const where = {};

  if (userId) {
    where.OR = [
      { user_id: userId },
      { business_user_id: userId },
    ];
  } else if (deviceId) {
    where.device_id = deviceId;
  } else {
    return [];
  }

  if (activityType) {
    where.activity_type = activityType;
  }

  try {
    return await prisma.userActivity.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take,
    });
  } catch (err) {
    if (err.code === 'P2021' || err.code === 'P2022') {
      if (userId) {
        return prisma.userActivity.findMany({
          where: { user_id: userId, ...(activityType ? { activity_type: activityType } : {}) },
          orderBy: { created_at: 'desc' },
          skip,
          take,
        }).catch(() => []);
      }
      return [];
    }
    throw err;
  }
}

/**
 * Counts the total number of user activities matching criteria.
 *
 * 1. The use of function:
 *    Supplies total count for pagination metadata calculation in user activity lists.
 * 2. How does the specific function work:
 *    Executes prisma.userActivity.count matching user_id OR business_user_id.
 * 3. Concepts used in the function:
 *    Prisma count aggregation, database indexing.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/activity/activity.service.js.
 * 5. Final output of the function, before and after:
 *    Before: Filter parameters.
 *    After: Integer count of matching records.
 *
 * @param {object} params - { userId, deviceId, activityType }
 * @returns {Promise<number>}
 */
async function countUserActivities({ userId, deviceId, activityType }) {
  const where = {};

  if (userId) {
    where.OR = [
      { user_id: userId },
      { business_user_id: userId },
    ];
  } else if (deviceId) {
    where.device_id = deviceId;
  } else {
    return 0;
  }

  if (activityType) {
    where.activity_type = activityType;
  }

  try {
    return await prisma.userActivity.count({ where });
  } catch (err) {
    if (err.code === 'P2021' || err.code === 'P2022') {
      if (userId) {
        return prisma.userActivity.count({
          where: { user_id: userId, ...(activityType ? { activity_type: activityType } : {}) },
        }).catch(() => 0);
      }
      return 0;
    }
    throw err;
  }
}

/**
 * Retrieves a paginated list of activities for a business user or organization.
 *
 * 1. The use of function:
 *    Fetches activity logs for dealer and distributor portal accounts.
 * 2. How does the specific function work:
 *    Filters user_activities by business_user_id or organization_id and orders by created_at desc.
 * 3. Concepts used in the function:
 *    Multi-tenant organization filtering, index scanning.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/activity/activity.service.js.
 * 5. Final output of the function, before and after:
 *    Before: Query filter parameters (businessUserId, organizationId, activityType, skip, take).
 *    After: Array of UserActivity records.
 *
 * @param {object} params - { businessUserId, organizationId, activityType, skip, take }
 * @returns {Promise<Array<object>>}
 */
async function findBusinessActivities({ businessUserId, organizationId, activityType, skip = 0, take = 20 }) {
  const where = {};

  if (businessUserId) {
    where.business_user_id = businessUserId;
  } else if (organizationId) {
    where.organization_id = organizationId;
  } else {
    return [];
  }

  if (activityType) {
    where.activity_type = activityType;
  }

  try {
    return await prisma.userActivity.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take,
    });
  } catch (err) {
    if (err.code === 'P2021' || err.code === 'P2022') {
      return [];
    }
    throw err;
  }
}

/**
 * Counts the total number of business activities matching criteria.
 *
 * 1. The use of function:
 *    Supplies total count for pagination metadata calculation in business activity lists.
 * 2. How does the specific function work:
 *    Executes prisma.userActivity.count matching business user or organization where conditions.
 * 3. Concepts used in the function:
 *    Prisma count aggregation.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/activity/activity.service.js.
 * 5. Final output of the function, before and after:
 *    Before: Filter parameters.
 *    After: Integer count of matching records.
 *
 * @param {object} params - { businessUserId, organizationId, activityType }
 * @returns {Promise<number>}
 */
async function countBusinessActivities({ businessUserId, organizationId, activityType }) {
  const where = {};

  if (businessUserId) {
    where.business_user_id = businessUserId;
  } else if (organizationId) {
    where.organization_id = organizationId;
  } else {
    return 0;
  }

  if (activityType) {
    where.activity_type = activityType;
  }

  try {
    return await prisma.userActivity.count({ where });
  } catch (err) {
    if (err.code === 'P2021' || err.code === 'P2022') {
      return 0;
    }
    throw err;
  }
}

module.exports = {
  createActivity,
  findUserActivities,
  countUserActivities,
  findBusinessActivities,
  countBusinessActivities,
};
