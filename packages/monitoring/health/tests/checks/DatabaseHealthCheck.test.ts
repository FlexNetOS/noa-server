/**
 * Database Health Check Tests
 */

import { DatabaseHealthCheck } from '../../src/checks/DatabaseHealthCheck';
import { HealthStatus } from '../../src/types';
import { Pool } from 'pg';

// Mock pg Pool
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [{ health_check: 1 }] }),
    release: jest.fn(),
  };

  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0,
  };

  return {
    Pool: jest.fn(() => mockPool),
  };
});

describe('DatabaseHealthCheck', () => {
  let pool: Pool;
  let healthCheck: DatabaseHealthCheck;

  beforeEach(() => {
    pool = new Pool();
    healthCheck = new DatabaseHealthCheck({ pool });
  });

  it('should return healthy status for successful check', async () => {
    const result = await healthCheck.check();

    expect(result.status).toBe(HealthStatus.HEALTHY);
    expect(result.name).toBe('database');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should include metrics in result', async () => {
    const result = await healthCheck.check();

    expect(result.metadata).toBeDefined();
    expect(result.metadata?.metrics).toBeDefined();
  });

  it('should be healthy when isHealthy is called', async () => {
    const isHealthy = await healthCheck.isHealthy();
    expect(isHealthy).toBe(true);
  });

  it('should cache last result', async () => {
    await healthCheck.check();
    const lastResult = healthCheck.getLastResult();

    expect(lastResult).not.toBeNull();
    expect(lastResult?.name).toBe('database');
  });

  it('should handle errors gracefully', async () => {
    const errorPool = new Pool();
    (errorPool.connect as jest.Mock).mockRejectedValue(new Error('Connection failed'));

    const errorCheck = new DatabaseHealthCheck({ pool: errorPool });
    const result = await errorCheck.check();

    expect(result.status).toBe(HealthStatus.UNHEALTHY);
    expect(result.error).toBe('Connection failed');
  });
});
