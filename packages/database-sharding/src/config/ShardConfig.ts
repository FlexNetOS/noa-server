import { z } from 'zod';
import { MongoDBShardConfig, PostgreSQLShardConfig } from '../types';

export interface ShardConfig {
  id: string;
  databaseType: 'postgresql' | 'mongodb';
  connection: PostgreSQLShardConfig | MongoDBShardConfig;
  weight: number;
  region?: string;
  tags: string[];
  metadata: Record<string, any>;
}

export const ShardConfigSchema = z.object({
  id: z.string(),
  databaseType: z.enum(['postgresql', 'mongodb']),
  connection: z.union([
    z.object({
      host: z.string(),
      port: z.number(),
      database: z.string(),
      user: z.string(),
      password: z.string(),
      ssl: z.boolean().optional(),
      connectionTimeoutMillis: z.number().optional(),
      query_timeout: z.number().optional(),
      statement_timeout: z.number().optional(),
    }),
    z.object({
      uri: z.string(),
      database: z.string(),
      replicaSet: z.string().optional(),
      readPreference: z
        .enum(['primary', 'primaryPreferred', 'secondary', 'secondaryPreferred', 'nearest'])
        .optional(),
      maxPoolSize: z.number().optional(),
      minPoolSize: z.number().optional(),
      maxIdleTimeMS: z.number().optional(),
    }),
  ]),
  weight: z.number().min(0).max(1),
  region: z.string().optional(),
  tags: z.array(z.string()),
  metadata: z.record(z.any()),
});

export class ShardConfigValidator {
  static validate(config: unknown): ShardConfig {
    return ShardConfigSchema.parse(config);
  }

  static validatePartial(config: unknown): Partial<ShardConfig> {
    return ShardConfigSchema.partial().parse(config);
  }
}

export class ShardConfigBuilder {
  private config: Partial<ShardConfig> = {
    tags: [],
    metadata: {},
  };

  withId(id: string): ShardConfigBuilder {
    this.config.id = id;
    return this;
  }

  withPostgreSQL(connection: PostgreSQLShardConfig): ShardConfigBuilder {
    this.config.databaseType = 'postgresql';
    this.config.connection = connection;
    return this;
  }

  withMongoDB(connection: MongoDBShardConfig): ShardConfigBuilder {
    this.config.databaseType = 'mongodb';
    this.config.connection = connection;
    return this;
  }

  withWeight(weight: number): ShardConfigBuilder {
    this.config.weight = weight;
    return this;
  }

  withRegion(region: string): ShardConfigBuilder {
    this.config.region = region;
    return this;
  }

  withTags(tags: string[]): ShardConfigBuilder {
    this.config.tags = tags;
    return this;
  }

  withMetadata(metadata: Record<string, any>): ShardConfigBuilder {
    this.config.metadata = metadata;
    return this;
  }

  build(): ShardConfig {
    return ShardConfigValidator.validate(this.config);
  }
}
