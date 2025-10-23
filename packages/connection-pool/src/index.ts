/**
 * @noa/connection-pool
 *
 * Advanced multi-database connection pooling with health checks and load balancing
 */

export {
  ConnectionPoolManager,
  ConnectionPoolConfig,
  PoolStatistics,
  HealthCheckResult,
  ConnectionInfo,
} from './ConnectionPoolManager';

// Strategies
export { AdaptivePooling } from './strategies/AdaptivePooling';
export { PriorityPooling } from './strategies/PriorityPooling';
export { ShardedPooling } from './strategies/ShardedPooling';

// Pools
export { PostgresPool } from './pools/PostgresPool';
export { MongoPool } from './pools/MongoPool';
export { RedisPool } from './pools/RedisPool';
export { MySQLPool } from './pools/MySQLPool';

// Health
export { ConnectionHealthCheck } from './health/ConnectionHealthCheck';

// Monitoring
export { PoolMonitor } from './monitoring/PoolMonitor';

// Re-export for convenience
export default ConnectionPoolManager;
