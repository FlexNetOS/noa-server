import { z } from 'zod';

// Core sharding types
export interface ShardKey {
  value: string | number;
  type: 'string' | 'number' | 'uuid';
}

export interface ShardRange {
  min: ShardKey;
  max: ShardKey;
  shardId: string;
}

export interface ShardInfo {
  id: string;
  host: string;
  port: number;
  database: string;
  weight: number;
  status: 'active' | 'inactive' | 'maintenance';
  region?: string;
  capacity: {
    connections: number;
    storage: number; // GB
    readOps: number;
    writeOps: number;
  };
  metrics: {
    connectionCount: number;
    queryLatency: number;
    errorRate: number;
    lastHealthCheck: Date;
  };
}

export type ShardHealthStatus = 'healthy' | 'unhealthy' | 'unreachable';

export interface ShardingStrategy {
  getShardId(key: ShardKey): string;
  getShardIds(): string[];
  addShard(shardId: string, range?: ShardRange): void;
  removeShard(shardId: string): void;
  rebalance(): Promise<void>;
}

export interface MigrationPlan {
  id: string;
  sourceShard: string;
  targetShard: string;
  tableName: string;
  keyRange: ShardRange;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  estimatedRows: number;
  actualRows?: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface ShardMetrics {
  shardId: string;
  timestamp: Date;
  connections: number;
  queriesPerSecond: number;
  latencyMs: number;
  errorCount: number;
  storageUsed: number;
  replicationLag?: number;
}

// Configuration schemas
export const ShardKeySchema = z.object({
  value: z.union([z.string(), z.number()]),
  type: z.enum(['string', 'number', 'uuid']),
});

export const ShardRangeSchema = z.object({
  min: ShardKeySchema,
  max: ShardKeySchema,
  shardId: z.string(),
});

export const ShardInfoSchema = z.object({
  id: z.string(),
  host: z.string(),
  port: z.number(),
  database: z.string(),
  weight: z.number().min(0).max(1),
  status: z.enum(['active', 'inactive', 'maintenance']),
  region: z.string().optional(),
  capacity: z.object({
    connections: z.number(),
    storage: z.number(),
    readOps: z.number(),
    writeOps: z.number(),
  }),
  metrics: z.object({
    connectionCount: z.number(),
    queryLatency: z.number(),
    errorRate: z.number(),
    lastHealthCheck: z.date(),
  }),
});

export const MigrationPlanSchema = z.object({
  id: z.string(),
  sourceShard: z.string(),
  targetShard: z.string(),
  tableName: z.string(),
  keyRange: ShardRangeSchema,
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  estimatedRows: z.number(),
  actualRows: z.number().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  error: z.string().optional(),
});

// Database-specific types
export interface PostgreSQLShardConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  connectionTimeoutMillis?: number;
  query_timeout?: number;
  statement_timeout?: number;
}

export interface MongoDBShardConfig {
  uri: string;
  database: string;
  replicaSet?: string;
  readPreference?: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest';
  maxPoolSize?: number;
  minPoolSize?: number;
  maxIdleTimeMS?: number;
}

// Strategy-specific types
export interface HashShardingConfig {
  virtualNodes: number;
  hashFunction: 'md5' | 'sha256' | 'murmur3';
}

export interface RangeShardingConfig {
  ranges: ShardRange[];
  autoRebalance: boolean;
  rebalanceThreshold: number;
}

export interface GeographicShardingConfig {
  regions: Array<{
    name: string;
    shards: string[];
    priority: number;
  }>;
  failoverRegions: string[];
}

export interface ConsistentHashingConfig {
  virtualNodesPerShard: number;
  hashFunction: 'md5' | 'sha256' | 'murmur3';
  loadBalancing: boolean;
}
