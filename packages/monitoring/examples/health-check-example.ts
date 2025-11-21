/**
 * Health Check Example
 * Demonstrates comprehensive health monitoring setup
 */

import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import {
  HealthCheckManager,
  DatabaseHealthCheck,
  CacheHealthCheck,
  MemoryHealthCheck,
  DiskHealthCheck,
  ServiceHealthCheck,
  HealthEndpoints,
} from '../health/src';

// Initialize Express
const app = express();

// Initialize database pool
const dbPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'noa',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
});

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

// Initialize Health Check Manager
const healthManager = new HealthCheckManager({
  enableAutoRefresh: true,
  refreshInterval: 30000, // 30 seconds
  parallelExecution: true,
});

// Register Database Health Check
healthManager.register(
  new DatabaseHealthCheck(
    {
      pool: dbPool,
      queryTimeout: 3000,
      warningLatency: 100,
      criticalLatency: 500,
    },
    'database'
  )
);

// Register Cache Health Check
healthManager.register(
  new CacheHealthCheck(
    {
      client: redis,
      warningHitRate: 70,
      criticalHitRate: 50,
      warningLatency: 50,
    },
    'cache'
  )
);

// Register Memory Health Check
healthManager.register(
  new MemoryHealthCheck(
    {
      warningThreshold: 80,
      criticalThreshold: 90,
      checkHeapMemory: true,
    },
    'memory'
  )
);

// Register Disk Health Check
healthManager.register(
  new DiskHealthCheck(
    {
      paths: ['/tmp', process.cwd()],
      warningThreshold: 80,
      criticalThreshold: 90,
      testWrite: true,
    },
    'disk'
  )
);

// Register External Service Health Check
healthManager.register(
  new ServiceHealthCheck(
    {
      url: 'https://api.example.com/health',
      method: 'GET',
      expectedStatus: [200, 204],
      warningResponseTime: 1000,
      maxConsecutiveFailures: 3,
      timeout: 5000,
    },
    'external-api'
  )
);

// Setup health endpoints
app.use(
  '/health',
  HealthEndpoints.createMiddleware(healthManager, {
    basePath: '/health',
    enableDetailedErrors: process.env.NODE_ENV !== 'production',
    enableMetrics: true,
  })
);

// Example API endpoint
app.get('/api/data', async (req, res) => {
  try {
    // Check if system is healthy
    const isHealthy = await healthManager.isHealthy();
    if (!isHealthy) {
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }

    // Your business logic
    const data = { message: 'Hello World' };
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log('Shutting down gracefully...');

  // Stop health check auto-refresh
  healthManager.destroy();

  // Close database pool
  await dbPool.end();

  // Close Redis connection
  redis.disconnect();

  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health endpoints:`);
  console.log(`  - GET http://localhost:${PORT}/health`);
  console.log(`  - GET http://localhost:${PORT}/health/live`);
  console.log(`  - GET http://localhost:${PORT}/health/ready`);
  console.log(`  - GET http://localhost:${PORT}/health/startup`);
  console.log(`  - GET http://localhost:${PORT}/health/metrics`);
});

// Monitor health status
setInterval(async () => {
  const metrics = await healthManager.getMetrics();
  console.log(`Health Score: ${metrics.healthScore.toFixed(2)}%`);
  console.log(`Checks: ${metrics.checksHealthy}/${metrics.checksTotal} healthy`);
  console.log(`Avg Duration: ${metrics.averageCheckDuration.toFixed(2)}ms`);
}, 60000);
