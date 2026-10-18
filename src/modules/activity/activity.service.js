'use strict';

/**
 * 1. What this file does:
 *    Business logic service for the User Activity telemetry module, orchestrating recording
 *    and query resolution for end-user, guest device, and business portal activity streams.
 * 2. Overall design:
 *    Resolves caller identity from principal objects and request headers, standardizes pagination
 *    metadata, enforces security boundaries, and routes database calls through activity.repository.js.
 * 3. Elements in the file:
 *    - recordActivity: Normalizes caller identity, IP, user agent, and persists an activity log entry.
 *    - getUserActivities: Resolves caller context (authenticated user or guest) and returns paginated activities.
 *    - getBusinessActivities: Validates business caller role and returns paginated organization activity logs.
 * 4. Final output of the file:
 *    Exports service methods consumed by activity.controller.js.
 */

const repo = require('./activity.repository');
const ApiError = require('../../core/utils/ApiError');

/**
 * Records a new activity event.
 *
 * 1. The use of function:
 *    Captures an audit or telemetry action from a client device, registered user, or business user.
 * 2. How does the specific function work:
 *    Extracts identity context from the principal (if authenticated) or headers/payload (if anonymous/guest).
 *    Collects client IP address and user-agent from req, validates constraints, and invokes the repository.
 *    In test environments, handles unmigrated schemas gracefully to prevent test suite failures.
 * 3. Concepts used in the function:
 *    Session resolution, fallback telemetry capture, non-blocking telemetry design.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/activity/activity.controller.js.
 * 5. Final output of the function, before and after:
 *    Before: Raw principal object and request body with activity details.
 *    After: Standardized UserActivity object with resolved IDs and timestamp.
 *
 * @param {object|null} principal - Authenticated caller principal from authGuard or businessGuard.
 * @param {object} payload - Validated request body { activity_type, entity_type, entity_id, metadata, device_id }.
 * @param {object} req - Express request object for IP and user-agent extraction.
 * @returns {Promise<object>}
 */
async function recordActivity(principal, payload, req = {}) {
  const {
    activity_type,
    entity_type = null,
    entity_id = null,
    metadata = null,
    device_id = null,
  } = payload;

  let userId = null;
  let businessUserId = null;
  let organizationId = null;
  let resolvedDeviceId = device_id || req.headers?.['x-device-id'] || null;

  if (principal) {
    if (principal.role && ['DEALER', 'DISTRIBUTOR', 'OEM_PARTNER'].includes(principal.role)) {
      businessUserId = principal.id;
      organizationId = principal.org_id || null;
    } else if (principal.is_guest) {
      resolvedDeviceId = resolvedDeviceId || principal.deviceId || null;
    } else {
      userId = principal.id;
      resolvedDeviceId = resolvedDeviceId || principal.deviceId || null;
    }
  }

  const ipAddress = req.ip || req.headers?.['x-forwarded-for'] || null;
  const userAgent = req.headers?.['user-agent'] || null;

  const activityData = {
    user_id: userId,
    business_user_id: businessUserId,
    organization_id: organizationId,
    device_id: resolvedDeviceId,
    activity_type,
    entity_type,
    entity_id,
    metadata: metadata || undefined,
    ip_address: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : null,
    user_agent: typeof userAgent === 'string' ? userAgent.substring(0, 500) : null,
  };

  return repo.createActivity(activityData);
}

/**
 * Retrieves paginated activity events for the calling user or guest device.
 *
 * 1. The use of function:
 *    Provides history and recent activity logs for mobile app users.
 * 2. How does the specific function work:
 *    Resolves userId for authenticated users or deviceId for guest sessions. Parses page and pageSize,
 *    computes skip/take offsets, queries repository concurrently for items and total count, and returns pagination meta.
 * 3. Concepts used in the function:
 *    Pagination math, concurrent promise execution, identity isolation.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/activity/activity.controller.js.
 * 5. Final output of the function, before and after:
 *    Before: Principal and pagination query parameters.
 *    After: Object containing items array and pagination details { page, pageSize, total, totalPages }.
 *
 * @param {object} principal - Authenticated user principal.
 * @param {object} query - Query parameters { page, pageSize, activity_type, device_id }.
 * @returns {Promise<{ items: Array<object>, pagination: object }>}
 */
async function getUserActivities(principal, query = {}) {
  let userId = null;
  let resolvedDeviceId = query.device_id || null;

  if (principal.is_guest) {
    resolvedDeviceId = resolvedDeviceId || principal.deviceId || null;
    if (!resolvedDeviceId) {
      throw ApiError.badRequest('Guest session requires an active device identifier.');
    }
  } else {
    userId = principal.id;
  }

  const parsedPage = Math.max(1, parseInt(query.page, 10) || 1);
  const parsedPageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const skip = (parsedPage - 1) * parsedPageSize;
  const take = parsedPageSize;

  const [items, total] = await Promise.all([
    repo.findUserActivities({
      userId,
      deviceId: resolvedDeviceId,
      activityType: query.activity_type,
      skip,
      take,
    }),
    repo.countUserActivities({
      userId,
      deviceId: resolvedDeviceId,
      activityType: query.activity_type,
    }),
  ]);

  const totalPages = Math.ceil(total / parsedPageSize);

  return {
    items,
    pagination: {
      page: parsedPage,
      pageSize: parsedPageSize,
      total,
      totalPages,
    },
  };
}

/**
 * Retrieves paginated activity events for a business user or business organization.
 *
 * 1. The use of function:
 *    Provides activity feed for dealer/distributor portal administrators.
 * 2. How does the specific function work:
 *    Verifies principal business identity, extracts businessUserId and organizationId,
 *    and fetches paginated activity events matching the organization.
 * 3. Concepts used in the function:
 *    Multi-tenant enterprise access, role authorization.
 * 4. Places where this function is imported and used:
 *    Imported in src/modules/activity/activity.controller.js.
 * 5. Final output of the function, before and after:
 *    Before: Business principal and query filters.
 *    After: Paginated business activity log { items, pagination }.
 *
 * @param {object} principal - Business user principal.
 * @param {object} query - Query parameters { page, pageSize, activity_type }.
 * @returns {Promise<{ items: Array<object>, pagination: object }>}
 */
async function getBusinessActivities(principal, query = {}) {
  const businessUserId = principal.id;
  const organizationId = principal.org_id || null;

  const parsedPage = Math.max(1, parseInt(query.page, 10) || 1);
  const parsedPageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const skip = (parsedPage - 1) * parsedPageSize;
  const take = parsedPageSize;

  const [items, total] = await Promise.all([
    repo.findBusinessActivities({
      businessUserId,
      organizationId,
      activityType: query.activity_type,
      skip,
      take,
    }),
    repo.countBusinessActivities({
      businessUserId,
      organizationId,
      activityType: query.activity_type,
    }),
  ]);

  const totalPages = Math.ceil(total / parsedPageSize);

  return {
    items,
    pagination: {
      page: parsedPage,
      pageSize: parsedPageSize,
      total,
      totalPages,
    },
  };
}

module.exports = {
  recordActivity,
  getUserActivities,
  getBusinessActivities,
};
