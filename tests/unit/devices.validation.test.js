'use strict';

/**
 * devices.validation unit tests.
 *
 * Verifies Joi schema rules and middleware behavior for device endpoints.
 */

const {
  registerDeviceSchema,
  deviceIdParamSchema,
  validate,
} = require('../../src/modules/devices/devices.validation');

describe('devices.validation — registerDeviceSchema', () => {
  it('passes with all valid fields (ANDROID)', () => {
    const input = {
      device_id: 'test-device-uuid',
      platform: 'ANDROID',
      fcm_token: 'fcm-sample-token-abc',
      app_version: '1.0.4',
    };
    const { error, value } = registerDeviceSchema.validate(input);
    expect(error).toBeUndefined();
    expect(value.device_id).toBe('test-device-uuid');
    expect(value.platform).toBe('ANDROID');
    expect(value.fcm_token).toBe('fcm-sample-token-abc');
    expect(value.app_version).toBe('1.0.4');
  });

  it('passes and normalizes lowercase platform to uppercase (ios -> IOS)', () => {
    const input = {
      device_id: 'test-device-uuid',
      platform: 'ios',
    };
    const { error, value } = registerDeviceSchema.validate(input);
    expect(error).toBeUndefined();
    expect(value.platform).toBe('IOS');
  });

  it('fails when platform is invalid (e.g. WINDOWS)', () => {
    const input = {
      device_id: 'test-device-uuid',
      platform: 'WINDOWS',
    };
    const { error } = registerDeviceSchema.validate(input);
    expect(error).toBeDefined();
    expect(error.details[0].message).toMatch(/"platform" must be one of \[ANDROID, IOS\]/);
  });

  it('fails when device_id is missing or empty', () => {
    const input = {
      platform: 'ANDROID',
    };
    const { error } = registerDeviceSchema.validate(input);
    expect(error).toBeDefined();
    expect(error.details[0].message).toMatch(/"device_id" is required/);
  });

  it('allows null or empty fcm_token and app_version', () => {
    const input = {
      device_id: 'test-device-uuid',
      platform: 'ANDROID',
      fcm_token: null,
      app_version: null,
    };
    const { error, value } = registerDeviceSchema.validate(input);
    expect(error).toBeUndefined();
    expect(value.fcm_token).toBeNull();
    expect(value.app_version).toBeNull();
  });
});

describe('devices.validation — deviceIdParamSchema', () => {
  it('passes with valid id string', () => {
    const { error, value } = deviceIdParamSchema.validate({ id: 'cuid-123' });
    expect(error).toBeUndefined();
    expect(value.id).toBe('cuid-123');
  });

  it('fails when id is missing or empty', () => {
    const { error } = deviceIdParamSchema.validate({});
    expect(error).toBeDefined();
  });
});

describe('devices.validation — validate middleware', () => {
  it('calls next() with stripped unknown fields on valid payload', () => {
    const middleware = validate(registerDeviceSchema, 'body');
    const req = {
      body: {
        device_id: 'device-123',
        platform: 'ANDROID',
        malicious_user_id: 'hacker-id',
      },
    };
    const res = {};
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body.device_id).toBe('device-123');
    expect(req.body.malicious_user_id).toBeUndefined();
  });

  it('calls next with ApiError on validation failure', () => {
    const middleware = validate(registerDeviceSchema, 'body');
    const req = { body: {} };
    const res = {};
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        type: 'VALIDATION_ERROR',
      })
    );
  });
});
