'use strict';

/**
 * 1. What this file does:
 *    Unit tests for the User Activity telemetry service, verifying identity association,
 *    multi-tenant business scoping, ownership access boundaries, supported event types,
 *    and Joi validation schemas.
 * 2. Overall design:
 *    Mocks activity.repository.js to verify that service methods correctly resolve caller
 *    identities (end user, business organization, guest device), enforce query constraints,
 *    and isolate private activity feeds so accounts cannot access unauthorized history.
 * 3. Elements in the file:
 *    - describe('Activity Service (Unit Tests)'):
 *      - recordActivity: Verifies identity resolution for users, business accounts, and guest devices.
 *      - Supported event types: Verifies SEARCH, DOCUMENT_DOWNLOAD, BOOKMARK_ADD, BOOKMARK_REMOVE,
 *        CALCULATION_SAVED, FEEDBACK_SUBMITTED, PRODUCT_VIEW, DOCUMENT_VIEW.
 *      - getUserActivities: Verifies strict userId/deviceId filtering (ownership boundary).
 *      - getBusinessActivities: Verifies businessUserId and organizationId multi-tenant isolation.
 *      - Validation schemas: Verifies constraint enforcement and pagination defaults.
 * 4. Final output of the file:
 *    Test execution assertions demonstrating identity association and access isolation.
 */

const service = require('../../src/modules/activity/activity.service');
const repo = require('../../src/modules/activity/activity.repository');
const { recordActivitySchema, listActivitySchema } = require('../../src/modules/activity/activity.validation');

jest.mock('../../src/modules/activity/activity.repository');

describe('Activity Service (Unit Tests)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordActivity — Identity Association', () => {
    it('associates activity with an authenticated registered user', async () => {
      const principal = { id: 'usr-100', is_guest: false, deviceId: 'dev-1' };
      const payload = {
        activity_type: 'PRODUCT_VIEW',
        entity_type: 'PRODUCT',
        entity_id: 'prod-456',
        metadata: { duration_seconds: 15 },
      };
      const req = {
        ip: '192.168.1.50',
        headers: { 'user-agent': 'CamsoMobileApp/1.0.0 (Android)' },
      };

      const mockCreated = {
        id: 'act-001',
        user_id: 'usr-100',
        business_user_id: null,
        organization_id: null,
        device_id: 'dev-1',
        activity_type: 'PRODUCT_VIEW',
        entity_type: 'PRODUCT',
        entity_id: 'prod-456',
        metadata: { duration_seconds: 15 },
        ip_address: '192.168.1.50',
        user_agent: 'CamsoMobileApp/1.0.0 (Android)',
        created_at: new Date().toISOString(),
      };
      repo.createActivity.mockResolvedValue(mockCreated);

      const result = await service.recordActivity(principal, payload, req);

      expect(result).toBeDefined();
      expect(repo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'usr-100',
          business_user_id: null,
          organization_id: null,
          device_id: 'dev-1',
          activity_type: 'PRODUCT_VIEW',
          entity_id: 'prod-456',
          ip_address: '192.168.1.50',
        })
      );
    });

    it('associates activity with a business dealer and organization context', async () => {
      const principal = { id: 'biz-200', role: 'DEALER', org_id: 'org-999' };
      const payload = {
        activity_type: 'DOCUMENT_DOWNLOAD',
        entity_type: 'DOCUMENT',
        entity_id: 'doc-789',
      };
      const req = {
        ip: '10.0.0.1',
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0)' },
      };

      repo.createActivity.mockImplementation((data) => Promise.resolve({ id: 'act-002', ...data }));

      const result = await service.recordActivity(principal, payload, req);

      expect(result).toBeDefined();
      expect(repo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          business_user_id: 'biz-200',
          organization_id: 'org-999',
          activity_type: 'DOCUMENT_DOWNLOAD',
          entity_id: 'doc-789',
        })
      );
    });

    it('associates activity with an anonymous visitor device identifier', async () => {
      const payload = {
        activity_type: 'SEARCH',
        metadata: { query: 'skid steer 12-16.5' },
      };
      const req = {
        headers: {
          'x-device-id': 'dev-anon-555',
          'user-agent': 'CamsoMobileApp/1.0.0 (iOS)',
        },
      };

      repo.createActivity.mockImplementation((data) => Promise.resolve({ id: 'act-003', ...data }));

      const result = await service.recordActivity(null, payload, req);

      expect(result).toBeDefined();
      expect(repo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          business_user_id: null,
          organization_id: null,
          device_id: 'dev-anon-555',
          activity_type: 'SEARCH',
        })
      );
    });
  });

  describe('Supported Event Types in Round 1', () => {
    const eventTypes = [
      'SEARCH',
      'DOCUMENT_DOWNLOAD',
      'BOOKMARK_ADD',
      'BOOKMARK_REMOVE',
      'CALCULATION_SAVED',
      'FEEDBACK_SUBMITTED',
      'PRODUCT_VIEW',
      'DOCUMENT_VIEW',
    ];

    test.each(eventTypes)('records supported event type %s with correct parameters', async (type) => {
      const principal = { id: 'usr-common', is_guest: false };
      const payload = { activity_type: type, entity_type: 'GENERIC', entity_id: 'ent-1' };
      repo.createActivity.mockImplementation((data) => Promise.resolve({ id: `act-${type}`, ...data }));

      const result = await service.recordActivity(principal, payload, {});

      expect(result.activity_type).toBe(type);
      expect(repo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_type: type,
          user_id: 'usr-common',
        })
      );
    });
  });

  describe('getUserActivities — Ownership Boundaries & Access Isolation', () => {
    it('queries user activity strictly scoped to calling user ID, preventing cross-user leakage', async () => {
      const principal = { id: 'usr-owner-100', is_guest: false };
      const query = { page: 1, pageSize: 20, activity_type: 'SEARCH' };

      const mockItems = [
        { id: 'act-1', user_id: 'usr-owner-100', activity_type: 'SEARCH' },
      ];
      repo.findUserActivities.mockResolvedValue(mockItems);
      repo.countUserActivities.mockResolvedValue(1);

      const result = await service.getUserActivities(principal, query);

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(repo.findUserActivities).toHaveBeenCalledWith({
        userId: 'usr-owner-100',
        deviceId: null,
        activityType: 'SEARCH',
        skip: 0,
        take: 20,
      });
      expect(repo.countUserActivities).toHaveBeenCalledWith({
        userId: 'usr-owner-100',
        deviceId: null,
        activityType: 'SEARCH',
      });
    });

    it('queries guest activities strictly scoped to the guest device identifier', async () => {
      const principal = { id: 'guest-session', is_guest: true, deviceId: 'dev-guest-xyz' };
      const query = { page: 1, pageSize: 10 };

      repo.findUserActivities.mockResolvedValue([]);
      repo.countUserActivities.mockResolvedValue(0);

      await service.getUserActivities(principal, query);

      expect(repo.findUserActivities).toHaveBeenCalledWith({
        userId: null,
        deviceId: 'dev-guest-xyz',
        activityType: undefined,
        skip: 0,
        take: 10,
      });
    });

    it('throws 400 BAD_REQUEST if guest session lacks an active device identifier', async () => {
      const principal = { id: 'guest-nodev', is_guest: true, deviceId: null };

      await expect(service.getUserActivities(principal, {})).rejects.toMatchObject({
        statusCode: 400,
        message: 'Guest session requires an active device identifier.',
      });
    });
  });

  describe('getBusinessActivities — Multi-Tenant Organization Boundaries', () => {
    it('scopes business activity queries strictly to calling business user and organization', async () => {
      const businessPrincipal = {
        id: 'biz-usr-alpha',
        role: 'DISTRIBUTOR',
        org_id: 'org-distributor-alpha',
      };
      const query = { page: 2, pageSize: 15 };

      repo.findBusinessActivities.mockResolvedValue([
        { id: 'act-biz-1', organization_id: 'org-distributor-alpha' },
      ]);
      repo.countBusinessActivities.mockResolvedValue(16);

      const result = await service.getBusinessActivities(businessPrincipal, query);

      expect(result).toBeDefined();
      expect(result.pagination.total).toBe(16);
      expect(result.pagination.totalPages).toBe(2);
      expect(repo.findBusinessActivities).toHaveBeenCalledWith({
        businessUserId: 'biz-usr-alpha',
        organizationId: 'org-distributor-alpha',
        activityType: undefined,
        skip: 15,
        take: 15,
      });
      expect(repo.countBusinessActivities).toHaveBeenCalledWith({
        businessUserId: 'biz-usr-alpha',
        organizationId: 'org-distributor-alpha',
        activityType: undefined,
      });
    });
  });

  describe('Validation Schemas', () => {
    it('validates a valid activity payload', () => {
      const { error, value } = recordActivitySchema.validate({
        activity_type: 'BOOKMARK_ADD',
        entity_type: 'PRODUCT',
        entity_id: 'p-1',
      });

      expect(error).toBeUndefined();
      expect(value.activity_type).toBe('BOOKMARK_ADD');
    });

    it('rejects an unsupported activity type', () => {
      const { error } = recordActivitySchema.validate({
        activity_type: 'INVALID_EVENT',
      });

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('activity_type must be one of');
    });

    it('applies default pagination values in listActivitySchema', () => {
      const { error, value } = listActivitySchema.validate({});

      expect(error).toBeUndefined();
      expect(value.page).toBe(1);
      expect(value.pageSize).toBe(20);
    });
  });
});
