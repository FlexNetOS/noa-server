/**
 * E2E Test Environment Setup
 *
 * Manages the complete test environment including:
 * - Docker container orchestration
 * - Database initialization and seeding
 * - Redis setup for caching/rate limiting
 * - Mock AI provider servers
 * - Test user creation
 * - Cleanup utilities
 */

import { execSync, spawn, ChildProcess } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import pg from 'pg';
import Redis from 'ioredis';

const { Pool } = pg;

interface TestEnvironmentConfig {
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
  };
  mockProviders: {
    openai: { host: string; port: number };
    claude: { host: string; port: number };
    llamacpp: { host: string; port: number };
  };
  rabbitmq: {
    host: string;
    port: number;
    managementPort: number;
    user: string;
    password: string;
  };
}

export const TEST_ENV_CONFIG: TestEnvironmentConfig = {
  postgres: {
    host: 'localhost',
    port: 5433,
    database: 'noa_test',
    user: 'test_user',
    password: 'test_password',
  },
  redis: {
    host: 'localhost',
    port: 6380,
  },
  mockProviders: {
    openai: { host: 'localhost', port: 8081 },
    claude: { host: 'localhost', port: 8082 },
    llamacpp: { host: 'localhost', port: 8083 },
  },
  rabbitmq: {
    host: 'localhost',
    port: 5673,
    managementPort: 15673,
    user: 'test_user',
    password: 'test_password',
  },
};

export class TestEnvironment {
  private postgresPool: pg.Pool | null = null;
  private redisClient: Redis | null = null;
  private dockerComposeProcess: ChildProcess | null = null;

  /**
   * Start all test infrastructure services
   */
  async setup(): Promise<void> {
    console.log('Starting test environment...');

    // Start Docker Compose services
    await this.startDockerServices();

    // Wait for services to be healthy
    await this.waitForServices();

    // Initialize database connection pool
    this.postgresPool = new Pool(TEST_ENV_CONFIG.postgres);

    // Initialize Redis client
    this.redisClient = new Redis(TEST_ENV_CONFIG.redis);

    // Run database migrations (if needed)
    await this.runMigrations();

    // Seed test data
    await this.seedTestData();

    console.log('Test environment ready!');
  }

  /**
   * Cleanup and stop all test infrastructure
   */
  async teardown(): Promise<void> {
    console.log('Tearing down test environment...');

    // Close database connections
    if (this.postgresPool) {
      await this.postgresPool.end();
    }

    // Close Redis connection
    if (this.redisClient) {
      await this.redisClient.quit();
    }

    // Stop Docker services
    await this.stopDockerServices();

    console.log('Test environment stopped.');
  }

  /**
   * Reset test environment between tests
   */
  async reset(): Promise<void> {
    console.log('Resetting test environment...');

    // Clear Redis cache
    if (this.redisClient) {
      await this.redisClient.flushdb();
    }

    // Truncate dynamic tables (preserve seed data)
    if (this.postgresPool) {
      await this.postgresPool.query(`
        TRUNCATE TABLE ai_requests, rate_limits, jobs, metrics CASCADE;
      `);
    }

    console.log('Test environment reset.');
  }

  /**
   * Get database pool for tests
   */
  getPostgresPool(): pg.Pool {
    if (!this.postgresPool) {
      throw new Error('Database pool not initialized');
    }
    return this.postgresPool;
  }

  /**
   * Get Redis client for tests
   */
  getRedisClient(): Redis {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    return this.redisClient;
  }

  /**
   * Start Docker Compose services
   */
  private async startDockerServices(): Promise<void> {
    const dockerComposePath = join(__dirname, 'docker-compose.test.yml');

    if (!existsSync(dockerComposePath)) {
      throw new Error(`Docker Compose file not found: ${dockerComposePath}`);
    }

    try {
      execSync(`docker-compose -f ${dockerComposePath} up -d`, {
        stdio: 'inherit',
      });
    } catch (error) {
      console.error('Failed to start Docker services:', error);
      throw error;
    }
  }

  /**
   * Stop Docker Compose services
   */
  private async stopDockerServices(): Promise<void> {
    const dockerComposePath = join(__dirname, 'docker-compose.test.yml');

    try {
      execSync(`docker-compose -f ${dockerComposePath} down -v`, {
        stdio: 'inherit',
      });
    } catch (error) {
      console.error('Failed to stop Docker services:', error);
    }
  }

  /**
   * Wait for all services to be healthy
   */
  private async waitForServices(): Promise<void> {
    console.log('Waiting for services to be healthy...');

    const maxRetries = 30;
    const retryDelay = 2000; // 2 seconds

    // Wait for PostgreSQL
    await this.waitForPostgres(maxRetries, retryDelay);

    // Wait for Redis
    await this.waitForRedis(maxRetries, retryDelay);

    // Wait for mock providers
    await this.waitForHttpService(
      'Mock OpenAI',
      TEST_ENV_CONFIG.mockProviders.openai.port,
      maxRetries,
      retryDelay
    );
    await this.waitForHttpService(
      'Mock Claude',
      TEST_ENV_CONFIG.mockProviders.claude.port,
      maxRetries,
      retryDelay
    );
    await this.waitForHttpService(
      'llama.cpp',
      TEST_ENV_CONFIG.mockProviders.llamacpp.port,
      maxRetries,
      retryDelay
    );

    console.log('All services are healthy!');
  }

  /**
   * Wait for PostgreSQL to be ready
   */
  private async waitForPostgres(maxRetries: number, retryDelay: number): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const pool = new Pool(TEST_ENV_CONFIG.postgres);
        await pool.query('SELECT 1');
        await pool.end();
        console.log('PostgreSQL is ready!');
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error('PostgreSQL failed to start');
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Wait for Redis to be ready
   */
  private async waitForRedis(maxRetries: number, retryDelay: number): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const redis = new Redis(TEST_ENV_CONFIG.redis);
        await redis.ping();
        await redis.quit();
        console.log('Redis is ready!');
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error('Redis failed to start');
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Wait for HTTP service to be ready
   */
  private async waitForHttpService(
    name: string,
    port: number,
    maxRetries: number,
    retryDelay: number
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`http://localhost:${port}/health`);
        if (response.ok) {
          console.log(`${name} is ready!`);
          return;
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(`${name} failed to start`);
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    // Migrations are handled by init-db.sql in Docker Compose
    console.log('Database migrations applied.');
  }

  /**
   * Seed test data
   */
  private async seedTestData(): Promise<void> {
    console.log('Test data seeded (via init-db.sql).');
  }
}

// Singleton instance for global setup/teardown
let globalTestEnv: TestEnvironment | null = null;

export async function setupGlobalTestEnvironment(): Promise<TestEnvironment> {
  if (!globalTestEnv) {
    globalTestEnv = new TestEnvironment();
    await globalTestEnv.setup();
  }
  return globalTestEnv;
}

export async function teardownGlobalTestEnvironment(): Promise<void> {
  if (globalTestEnv) {
    await globalTestEnv.teardown();
    globalTestEnv = null;
  }
}

export async function resetTestEnvironment(): Promise<void> {
  if (globalTestEnv) {
    await globalTestEnv.reset();
  }
}
