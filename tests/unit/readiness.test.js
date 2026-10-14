'use strict';

jest.mock('../../src/config/database', () => ({
  $queryRaw: jest.fn(),
}));

const prisma = require('../../src/config/database');
const { checkReadiness } = require('../../src/core/services/readinessService');

describe('readinessService', () => {
  const origFirebaseId = process.env.FIREBASE_PROJECT_ID;
  const origFirebaseKey = process.env.FIREBASE_PRIVATE_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_PRIVATE_KEY;
  });

  afterAll(() => {
    if (origFirebaseId) process.env.FIREBASE_PROJECT_ID = origFirebaseId;
    if (origFirebaseKey) process.env.FIREBASE_PRIVATE_KEY = origFirebaseKey;
  });

  it('returns 200 ready when database responds', async () => {
    prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

    const { isReady, statusCode, result } = await checkReadiness();

    expect(isReady).toBe(true);
    expect(statusCode).toBe(200);
    expect(result.status).toBe('ready');
    expect(result.checks.database).toBe('connected');
    expect(result.checks.firebase).toBe('unconfigured');
    expect(JSON.stringify(result)).not.toContain('password');
    expect(JSON.stringify(result)).not.toContain('postgresql://');
  });

  it('returns 503 not_ready when database connection fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

    const { isReady, statusCode, result } = await checkReadiness();

    expect(isReady).toBe(false);
    expect(statusCode).toBe(503);
    expect(result.status).toBe('not_ready');
    expect(result.checks.database).toBe('disconnected');
    expect(JSON.stringify(result)).not.toContain('Connection refused');
  });

  it('does not claim Firebase is ready when unconfigured', async () => {
    prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

    const { result } = await checkReadiness();

    expect(result.checks.firebase).toBe('unconfigured');
  });
});
