// Database Sharding Framework
// Main entry point for horizontal scaling capabilities

export { ShardManager } from './ShardManager';
export { ShardRouter } from './ShardRouter';

// Sharding Strategies
export { ConsistentHashingStrategy } from './strategies/ConsistentHashingStrategy';
export { GeographicShardingStrategy } from './strategies/GeographicShardingStrategy';
export { HashShardingStrategy } from './strategies/HashShardingStrategy';
export { RangeShardingStrategy } from './strategies/RangeShardingStrategy';

// Migration Tools
// export { ShardMigrationManager } from './migration/ShardMigrationManager';
// export { DataMigrationCoordinator } from './migration/DataMigrationCoordinator';

// Configuration
export { ShardConfig } from './config/ShardConfig';
export { ShardingConfig } from './config/ShardingConfig';

// Database Adapters
export { MongoDBShardAdapter } from './mongodb/MongoDBShardAdapter';
export { PostgreSQLShardAdapter } from './postgres/PostgreSQLShardAdapter';

// Monitoring
export { ShardingHealthChecker } from './monitoring/ShardingHealthChecker';
export { ShardingMetricsCollector } from './monitoring/ShardingMetricsCollector';
export { ShardingMonitor } from './monitoring/ShardingMonitor';

// Types
export type {
    MigrationPlan, ShardInfo, ShardKey, ShardMetrics, ShardRange, ShardingStrategy
} from './types';
