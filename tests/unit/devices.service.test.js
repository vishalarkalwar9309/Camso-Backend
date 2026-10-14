'use strict';

/**
 * devices.service unit tests.
 *
 * Mocks the devices repository to test business logic, validation,
 * ownership enforcement, and error handling in isolation.
 */

jest.mock('../../src/modules/devices/devices.repository');

const devicesService = require('../../src/modules/devices/devices.service');
const repo = require('../../src/modules/devices/devices.repository');
const ApiError = require('../../src/core/utils/ApiError');

const MOCK_USER_ID = 'user-cuid-123';
const OTHER_USER_ID = 'other-user-cuid-456';

const MOCK_DEVICE = {
  id: 'device-record-cuid-1',
  device_id: 'test-device-uuid',
  user_id: MOCK_USER_ID,
  platform: 'ANDROID',
  app_version: '1.0.4',
  fcm_token: 'fcm-sample-token-abc',
  is_active: true,
  last_seen_at: new Date('2026-10-13T12:00:00Z'),
  created_at: new Date('2026-10-13T10:00:00Z'),
  updated_at: new Date('2026-10-13T12:00:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('devicesService.registerDevice', () => {
  it('registers a device successfully with valid inputs', async () => {
    repo.upsertDevice.mockResolvedValue(MOCK_DEVICE);

    const result = await devicesService.registerDevice(MOCK_USER_ID, {
      device_id: 'test-device-uuid',
      platform: 'ANDROID',
      fcm_token: 'fcm-sample-token-abc',
      app_version: '1.0.4',
    });

    expect(repo.upsertDevice).toHaveBeenCalledWith({
      device_id: 'test-device-uuid',
      user_id: MOCK_USER_ID,
      platform: 'ANDROID',
      fcm_token: 'fcm-sample-token-abc',
      app_version: '1.0.4',
    });

    expect(result).toEqual({
      id: 'device-record-cuid-1',
      device_id: 'test-device-uuid',
      user_id: MOCK_USER_ID,
      platform: 'ANDROID',
      app_version: '1.0.4',
      fcm_token: 'fcm-sample-token-abc',
      is_active: true,
      last_seen_at: MOCK_DEVICE.last_seen_at,
      created_at: MOCK_DEVICE.created_at,
      updated_at: MOCK_DEVICE.updated_at,
    });
  });

  it('normalizes lowercase platform to uppercase before repository call', async () => {
    repo.upsertDevice.mockResolvedValue({
      ...MOCK_DEVICE,
      platform: 'IOS',
    });

    await devicesService.registerDevice(MOCK_USER_ID, {
      device_id: 'test-device-uuid',
      platform: 'ios',
    });

    expect(repo.upsertDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'IOS',
      })
    );
  });

  it('handles repeated registration / duplicate token safely via upsert', async () => {
    const updatedDevice = {
      ...MOCK_DEVICE,
      fcm_token: 'updated-fcm-token',
      last_seen_at: new Date('2026-10-13T13:00:00Z'),
    };
    repo.upsertDevice.mockResolvedValue(updatedDevice);

    const result = await devicesService.registerDevice(MOCK_USER_ID, {
      device_id: 'test-device-uuid',
      platform: 'ANDROID',
      fcm_token: 'updated-fcm-token',
    });

    expect(repo.upsertDevice).toHaveBeenCalledTimes(1);
    expect(result.fcm_token).toBe('updated-fcm-token');
    expect(result.is_active).toBe(true);
  });

  it('throws unauthorized error if userId is missing', async () => {
    await expect(
      devicesService.registerDevice(null, {
        device_id: 'test-device-uuid',
        platform: 'ANDROID',
      })
    ).rejects.toThrow(ApiError);

    expect(repo.upsertDevice).not.toHaveBeenCalled();
  });

  it('propagates repository errors', async () => {
    repo.upsertDevice.mockRejectedValue(new Error('Database error'));

    await expect(
      devicesService.registerDevice(MOCK_USER_ID, {
        device_id: 'test-device-uuid',
        platform: 'ANDROID',
      })
    ).rejects.toThrow('Database error');
  });
});

describe('devicesService.deactivateDevice', () => {
  it('successfully deactivates user own device', async () => {
    repo.findDeviceById.mockResolvedValue(MOCK_DEVICE);
    const deactivatedDevice = {
      ...MOCK_DEVICE,
      is_active: false,
      updated_at: new Date('2026-10-13T14:00:00Z'),
    };
    repo.deactivateDevice.mockResolvedValue(deactivatedDevice);

    const result = await devicesService.deactivateDevice(MOCK_USER_ID, 'device-record-cuid-1');

    expect(repo.findDeviceById).toHaveBeenCalledWith('device-record-cuid-1');
    expect(repo.deactivateDevice).toHaveBeenCalledWith('device-record-cuid-1');
    expect(result.is_active).toBe(false);
  });

  it('returns early if device is already deactivated (idempotent)', async () => {
    const inactiveDevice = {
      ...MOCK_DEVICE,
      is_active: false,
    };
    repo.findDeviceById.mockResolvedValue(inactiveDevice);

    const result = await devicesService.deactivateDevice(MOCK_USER_ID, 'device-record-cuid-1');

    expect(repo.deactivateDevice).not.toHaveBeenCalled();
    expect(result.is_active).toBe(false);
  });

  it('throws 403 Forbidden if attempting to deactivate another user device', async () => {
    const otherUserDevice = {
      ...MOCK_DEVICE,
      user_id: OTHER_USER_ID,
    };
    repo.findDeviceById.mockResolvedValue(otherUserDevice);

    await expect(
      devicesService.deactivateDevice(MOCK_USER_ID, 'device-record-cuid-1')
    ).rejects.toThrow(ApiError);

    try {
      await devicesService.deactivateDevice(MOCK_USER_ID, 'device-record-cuid-1');
    } catch (err) {
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('You can only deactivate your own devices.');
    }

    expect(repo.deactivateDevice).not.toHaveBeenCalled();
  });

  it('throws 404 Not Found if device does not exist', async () => {
    repo.findDeviceById.mockResolvedValue(null);

    await expect(
      devicesService.deactivateDevice(MOCK_USER_ID, 'nonexistent-id')
    ).rejects.toThrow(ApiError);

    try {
      await devicesService.deactivateDevice(MOCK_USER_ID, 'nonexistent-id');
    } catch (err) {
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Device not found.');
    }

    expect(repo.deactivateDevice).not.toHaveBeenCalled();
  });

  it('throws unauthorized error if userId is missing', async () => {
    await expect(
      devicesService.deactivateDevice(null, 'device-record-cuid-1')
    ).rejects.toThrow(ApiError);

    expect(repo.findDeviceById).not.toHaveBeenCalled();
  });
});

describe('devicesService.getUserDevices', () => {
  it('retrieves user devices successfully', async () => {
    repo.findDevicesByUserId.mockResolvedValue([MOCK_DEVICE]);

    const result = await devicesService.getUserDevices(MOCK_USER_ID);

    expect(repo.findDevicesByUserId).toHaveBeenCalledWith(MOCK_USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].device_id).toBe('test-device-uuid');
  });

  it('throws unauthorized error if userId is missing', async () => {
    await expect(devicesService.getUserDevices(null)).rejects.toThrow(ApiError);
  });
});
