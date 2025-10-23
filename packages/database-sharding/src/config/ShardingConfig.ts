import { z } from 'zod';
import { ShardInfo, ShardInfoSchema } from '../types';

export interface ShardingConfig {
  strategy: 'hash' | 'range' | 'geographic' | 'consistent-hashing';
  databaseType: 'postgresql' | 'mongodb';
  shards: ShardInfo[];
  replicationFactor: number;
  readPreference: 'primary' | 'secondary' | 'nearest';
  connectionPool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
  };
  healthCheck: {
    interval: number; // milliseconds
    timeout: number; // milliseconds
    retries: number;
  };
  migration: {
    batchSize: number;
    concurrency: number;
    timeout: number;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertThresholds: {
      connectionPoolUsage: number;
      queryLatency: number;
      errorRate: number;
    };
  };
}

export const ShardingConfigSchema = z.object({
  strategy: z.enum(['hash', 'range', 'geographic', 'consistent-hashing']),
  databaseType: z.enum(['postgresql', 'mongodb']),
  shards: z.array(ShardInfoSchema),
  replicationFactor: z.number().min(1),
  readPreference: z.enum(['primary', 'secondary', 'nearest']),
  connectionPool: z.object({
    min: z.number().min(0),
    max: z.number().min(1),
    idleTimeoutMillis: z.number().min(0),
  }),
  healthCheck: z.object({
    interval: z.number().min(1000),
    timeout: z.number().min(100),
    retries: z.number().min(0),
  }),
  migration: z.object({
    batchSize: z.number().min(1),
    concurrency: z.number().min(1),
    timeout: z.number().min(1000),
  }),
  monitoring: z.object({
    enabled: z.boolean(),
    metricsInterval: z.number().min(1000),
    alertThresholds: z.object({
      connectionPoolUsage: z.number().min(0).max(1),
      queryLatency: z.number().min(0),
      errorRate: z.number().min(0).max(1),
    }),
  }),
});

export class ShardingConfigValidator {
  static validate(config: unknown): ShardingConfig {
    return ShardingConfigSchema.parse(config);
  }

  static validatePartial(config: unknown): Partial<ShardingConfig> {
    return ShardingConfigSchema.partial().parse(config);
  }
}
