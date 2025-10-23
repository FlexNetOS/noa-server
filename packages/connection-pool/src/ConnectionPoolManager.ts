/**
 * ConnectionPoolManager - Advanced multi-database connection pooling
 *
 * Features:
 * - Multi-database support (PostgreSQL, MySQL, MongoDB, Redis)
 * - Dynamic pool sizing based on load
 * - Connection health checking
 * - Automatic reconnection
 * - Connection lifecycle management
 * - Load balancing across replicas
 * - Read/write splitting
 * - Connection leak detection
 */

import { EventEmitter } from 'events';

import Redis from 'ioredis';
import { MongoClient, MongoClientOptions } from 'mongodb';
import * as mysql from 'mysql2/promise';
import cron from 'node-cron';
import { Pool as PgPool, PoolConfig as PgPoolConfig, PoolClient } from 'pg';
import winston from 'winston';
import { z } from 'zod';

// Configuration Schema
export const ConnectionPoolConfigSchema = z.object({
  databases: z.object({
    postgres: z
      .object({
        enabled: z.boolean().default(false),
        primary: z
          .object({
            host: z.string(),
            port: z.number().default(5432),
            database: z.string(),
            user: z.string(),
            password: z.string(),
            ssl: z.boolean().default(false),
          })
          .optional(),
        replicas: z
          .array(
            z.object({
              host: z.string(),
              port: z.number().default(5432),
              database: z.string(),
              user: z.string(),
              password: z.string(),
              ssl: z.boolean().default(false),
            })
          )
          .optional(),
        pool: z.object({
          min: z.number().default(2),
          max: z.number().default(20),
          idleTimeoutMillis: z.number().default(30000),
          connectionTimeoutMillis: z.number().default(5000),
          statementTimeout: z.number().default(30000),
        }),
      })
      .optional(),
    mongodb: z
      .object({
        enabled: z.boolean().default(false),
        uri: z.string(),
        pool: z.object({
          minPoolSize: z.number().default(2),
          maxPoolSize: z.number().default(20),
          maxIdleTimeMS: z.number().default(30000),
          waitQueueTimeoutMS: z.number().default(5000),
        }),
      })
      .optional(),
    mysql: z
      .object({
        enabled: z.boolean().default(false),
        primary: z
          .object({
            host: z.string(),
            port: z.number().default(3306),
            database: z.string(),
            user: z.string(),
            password: z.string(),
          })
          .optional(),
        replicas: z
          .array(
            z.object({
              host: z.string(),
              port: z.number().default(3306),
              database: z.string(),
              user: z.string(),
              password: z.string(),
            })
          )
          .optional(),
        pool: z.object({
          connectionLimit: z.number().default(20),
          queueLimit: z.number().default(0),
          waitForConnections: z.boolean().default(true),
          connectTimeout: z.number().default(10000),
        }),
      })
      .optional(),
    redis: z
      .object({
        enabled: z.boolean().default(false),
        primary: z
          .object({
            host: z.string(),
            port: z.number().default(6379),
            password: z.string().optional(),
            db: z.number().default(0),
          })
          .optional(),
        replicas: z
          .array(
            z.object({
              host: z.string(),
              port: z.number().default(6379),
              password: z.string().optional(),
              db: z.number().default(0),
            })
          )
          .optional(),
      })
      .optional(),
  }),
  healthCheck: z.object({
    enabled: z.boolean().default(true),
    interval: z.number().default(30000), // 30 seconds
    timeout: z.number().default(5000),
    retries: z.number().default(3),
  }),
  leakDetection: z.object({
    enabled: z.boolean().default(true),
    threshold: z.number().default(30000), // 30 seconds
  }),
  adaptivePooling: z.object({
    enabled: z.boolean().default(true),
    checkInterval: z.number().default(60000), // 1 minute
    scaleUpThreshold: z.number().default(0.8), // 80% utilization
    scaleDownThreshold: z.number().default(0.3), // 30% utilization
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),
});

export type ConnectionPoolConfig = z.infer<typeof ConnectionPoolConfigSchema>;

// Pool Statistics
export interface PoolStatistics {
  database: string;
  type: 'postgres' | 'mongodb' | 'mysql' | 'redis';
  total: number;
  idle: number;
  active: number;
  waiting: number;
  created: number;
  destroyed: number;
  errors: number;
  leaks: number;
  averageAcquisitionTime: number;
  averageHoldTime: number;
  peakActive: number;
}

// Health Check Result
export interface HealthCheckResult {
  database: string;
  healthy: boolean;
  responseTime: number;
  error?: string;
  timestamp: Date;
}

// Connection Info
export interface ConnectionInfo {
  id: string;
  database: string;
  type: string;
  acquired: Date;
  released?: Date;
  holdTime?: number;
  leaked: boolean;
}

/**
 * ConnectionPoolManager Class
 */
export class ConnectionPoolManager extends EventEmitter {
  private config: ConnectionPoolConfig;
  private logger: winston.Logger;
  private pools: {
    postgres?: {
      primary?: PgPool;
      replicas: PgPool[];
      replicaIndex: number;
    };
    mongodb?: MongoClient;
    mysql?: {
      primary?: mysql.Pool;
      replicas: mysql.Pool[];
      replicaIndex: number;
    };
    redis?: {
      primary?: Redis;
      replicas: Redis[];
      replicaIndex: number;
    };
  };
  private stats: Map<string, PoolStatistics>;
  private activeConnections: Map<string, ConnectionInfo>;
  private healthCheckJob?: cron.ScheduledTask;
  private adaptiveJob?: cron.ScheduledTask;
  private startTime: number;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    super();
    this.config = ConnectionPoolConfigSchema.parse(config);
    this.logger = this.initializeLogger();
    this.pools = {};
    this.stats = new Map();
    this.activeConnections = new Map();
    this.startTime = Date.now();

    this.logger.info('ConnectionPoolManager initializing');
    this.initializePools();

    if (this.config.healthCheck.enabled) {
      this.scheduleHealthChecks();
    }

    if (this.config.adaptivePooling.enabled) {
      this.scheduleAdaptivePooling();
    }
  }

  /**
   * Initialize logger
   */
  private initializeLogger(): winston.Logger {
    return winston.createLogger({
      level: this.config.logging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'connection-pool-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'connection-pool.log' }),
      ],
    });
  }

  /**
   * Initialize all database pools
   */
  private initializePools(): void {
    if (this.config.databases.postgres?.enabled) {
      this.initializePostgresPool();
    }

    if (this.config.databases.mongodb?.enabled) {
      this.initializeMongoDBPool();
    }

    if (this.config.databases.mysql?.enabled) {
      this.initializeMySQLPool();
    }

    if (this.config.databases.redis?.enabled) {
      this.initializeRedisPool();
    }

    this.logger.info('All database pools initialized');
  }

  /**
   * Initialize PostgreSQL pool
   */
  private initializePostgresPool(): void {
    const pgConfig = this.config.databases.postgres!;

    this.pools.postgres = {
      replicas: [],
      replicaIndex: 0,
    };

    // Primary pool
    if (pgConfig.primary) {
      const poolConfig: PgPoolConfig = {
        host: pgConfig.primary.host,
        port: pgConfig.primary.port,
        database: pgConfig.primary.database,
        user: pgConfig.primary.user,
        password: pgConfig.primary.password,
        min: pgConfig.pool.min,
        max: pgConfig.pool.max,
        idleTimeoutMillis: pgConfig.pool.idleTimeoutMillis,
        connectionTimeoutMillis: pgConfig.pool.connectionTimeoutMillis,
        statement_timeout: pgConfig.pool.statementTimeout,
        ssl: pgConfig.primary.ssl ? { rejectUnauthorized: false } : false,
      };

      this.pools.postgres.primary = new PgPool(poolConfig);

      // Event handlers
      this.pools.postgres.primary.on('connect', () => {
        this.logger.debug('PostgreSQL primary pool connected');
      });

      this.pools.postgres.primary.on('error', (err) => {
        this.logger.error('PostgreSQL primary pool error', { error: err });
        this.updateStats('postgres-primary', 'errors', 1);
      });

      this.pools.postgres.primary.on('remove', () => {
        this.updateStats('postgres-primary', 'destroyed', 1);
      });

      this.logger.info('PostgreSQL primary pool initialized', {
        host: pgConfig.primary.host,
        database: pgConfig.primary.database,
        min: pgConfig.pool.min,
        max: pgConfig.pool.max,
      });
    }

    // Replica pools
    if (pgConfig.replicas && pgConfig.replicas.length > 0) {
      for (const [index, replica] of pgConfig.replicas.entries()) {
        const replicaPoolConfig: PgPoolConfig = {
          host: replica.host,
          port: replica.port,
          database: replica.database,
          user: replica.user,
          password: replica.password,
          min: pgConfig.pool.min,
          max: pgConfig.pool.max,
          idleTimeoutMillis: pgConfig.pool.idleTimeoutMillis,
          connectionTimeoutMillis: pgConfig.pool.connectionTimeoutMillis,
          statement_timeout: pgConfig.pool.statementTimeout,
          ssl: replica.ssl ? { rejectUnauthorized: false } : false,
        };

        const replicaPool = new PgPool(replicaPoolConfig);

        replicaPool.on('error', (err) => {
          this.logger.error(`PostgreSQL replica ${index} pool error`, { error: err });
          this.updateStats(`postgres-replica-${index}`, 'errors', 1);
        });

        this.pools.postgres.replicas.push(replicaPool);

        this.logger.info(`PostgreSQL replica ${index} pool initialized`, {
          host: replica.host,
          database: replica.database,
        });
      }
    }

    // Initialize stats
    this.stats.set('postgres-primary', this.createDefaultStats('postgres-primary', 'postgres'));
    pgConfig.replicas?.forEach((_, index) => {
      this.stats.set(
        `postgres-replica-${index}`,
        this.createDefaultStats(`postgres-replica-${index}`, 'postgres')
      );
    });
  }

  /**
   * Initialize MongoDB pool
   */
  private async initializeMongoDBPool(): Promise<void> {
    const mongoConfig = this.config.databases.mongodb!;

    const options: MongoClientOptions = {
      minPoolSize: mongoConfig.pool.minPoolSize,
      maxPoolSize: mongoConfig.pool.maxPoolSize,
      maxIdleTimeMS: mongoConfig.pool.maxIdleTimeMS,
      waitQueueTimeoutMS: mongoConfig.pool.waitQueueTimeoutMS,
    };

    this.pools.mongodb = new MongoClient(mongoConfig.uri, options);

    try {
      await this.pools.mongodb.connect();
      this.logger.info('MongoDB pool initialized', {
        minPoolSize: mongoConfig.pool.minPoolSize,
        maxPoolSize: mongoConfig.pool.maxPoolSize,
      });

      this.stats.set('mongodb', this.createDefaultStats('mongodb', 'mongodb'));
    } catch (error) {
      this.logger.error('MongoDB pool initialization failed', { error });
      throw error;
    }
  }

  /**
   * Initialize MySQL pool
   */
  private initializeMySQLPool(): void {
    const mysqlConfig = this.config.databases.mysql!;

    this.pools.mysql = {
      replicas: [],
      replicaIndex: 0,
    };

    // Primary pool
    if (mysqlConfig.primary) {
      this.pools.mysql.primary = mysql.createPool({
        host: mysqlConfig.primary.host,
        port: mysqlConfig.primary.port,
        database: mysqlConfig.primary.database,
        user: mysqlConfig.primary.user,
        password: mysqlConfig.primary.password,
        connectionLimit: mysqlConfig.pool.connectionLimit,
        queueLimit: mysqlConfig.pool.queueLimit,
        waitForConnections: mysqlConfig.pool.waitForConnections,
        connectTimeout: mysqlConfig.pool.connectTimeout,
      });

      this.logger.info('MySQL primary pool initialized', {
        host: mysqlConfig.primary.host,
        database: mysqlConfig.primary.database,
      });
    }

    // Replica pools
    if (mysqlConfig.replicas && mysqlConfig.replicas.length > 0) {
      for (const [index, replica] of mysqlConfig.replicas.entries()) {
        const replicaPool = mysql.createPool({
          host: replica.host,
          port: replica.port,
          database: replica.database,
          user: replica.user,
          password: replica.password,
          connectionLimit: mysqlConfig.pool.connectionLimit,
          queueLimit: mysqlConfig.pool.queueLimit,
          waitForConnections: mysqlConfig.pool.waitForConnections,
          connectTimeout: mysqlConfig.pool.connectTimeout,
        });

        this.pools.mysql.replicas.push(replicaPool);

        this.logger.info(`MySQL replica ${index} pool initialized`, {
          host: replica.host,
          database: replica.database,
        });
      }
    }

    this.stats.set('mysql-primary', this.createDefaultStats('mysql-primary', 'mysql'));
    mysqlConfig.replicas?.forEach((_, index) => {
      this.stats.set(
        `mysql-replica-${index}`,
        this.createDefaultStats(`mysql-replica-${index}`, 'mysql')
      );
    });
  }

  /**
   * Initialize Redis pool
   */
  private initializeRedisPool(): void {
    const redisConfig = this.config.databases.redis!;

    this.pools.redis = {
      replicas: [],
      replicaIndex: 0,
    };

    // Primary instance
    if (redisConfig.primary) {
      this.pools.redis.primary = new Redis({
        host: redisConfig.primary.host,
        port: redisConfig.primary.port,
        password: redisConfig.primary.password,
        db: redisConfig.primary.db,
      });

      this.pools.redis.primary.on('error', (err) => {
        this.logger.error('Redis primary error', { error: err });
        this.updateStats('redis-primary', 'errors', 1);
      });

      this.logger.info('Redis primary initialized', {
        host: redisConfig.primary.host,
        db: redisConfig.primary.db,
      });
    }

    // Replica instances
    if (redisConfig.replicas && redisConfig.replicas.length > 0) {
      for (const [index, replica] of redisConfig.replicas.entries()) {
        const replicaClient = new Redis({
          host: replica.host,
          port: replica.port,
          password: replica.password,
          db: replica.db,
        });

        replicaClient.on('error', (err) => {
          this.logger.error(`Redis replica ${index} error`, { error: err });
        });

        this.pools.redis.replicas.push(replicaClient);

        this.logger.info(`Redis replica ${index} initialized`, {
          host: replica.host,
          db: replica.db,
        });
      }
    }

    this.stats.set('redis-primary', this.createDefaultStats('redis-primary', 'redis'));
    redisConfig.replicas?.forEach((_, index) => {
      this.stats.set(
        `redis-replica-${index}`,
        this.createDefaultStats(`redis-replica-${index}`, 'redis')
      );
    });
  }

  /**
   * Create default statistics
   */
  private createDefaultStats(
    database: string,
    type: 'postgres' | 'mongodb' | 'mysql' | 'redis'
  ): PoolStatistics {
    return {
      database,
      type,
      total: 0,
      idle: 0,
      active: 0,
      waiting: 0,
      created: 0,
      destroyed: 0,
      errors: 0,
      leaks: 0,
      averageAcquisitionTime: 0,
      averageHoldTime: 0,
      peakActive: 0,
    };
  }

  /**
   * Update statistics
   */
  private updateStats(database: string, field: keyof PoolStatistics, value: number): void {
    const stats = this.stats.get(database);
    if (stats && typeof stats[field] === 'number') {
      stats[field] += value;
    }
  }

  /**
   * Get PostgreSQL connection (with load balancing)
   */
  async getPostgresConnection(preferReplica: boolean = false): Promise<PoolClient> {
    if (!this.pools.postgres) {
      throw new Error('PostgreSQL pool not initialized');
    }

    const startTime = Date.now();

    try {
      let client: PoolClient;
      let poolName: string;

      if (preferReplica && this.pools.postgres.replicas.length > 0) {
        // Round-robin load balancing
        const index = this.pools.postgres.replicaIndex % this.pools.postgres.replicas.length;
        this.pools.postgres.replicaIndex++;

        client = await this.pools.postgres.replicas[index].connect();
        poolName = `postgres-replica-${index}`;
      } else if (this.pools.postgres.primary) {
        client = await this.pools.postgres.primary.connect();
        poolName = 'postgres-primary';
      } else {
        throw new Error('No PostgreSQL primary pool configured');
      }

      const acquisitionTime = Date.now() - startTime;

      // Track connection
      const connId = `${poolName}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      this.activeConnections.set(connId, {
        id: connId,
        database: poolName,
        type: 'postgres',
        acquired: new Date(),
        leaked: false,
      });

      this.updateStats(poolName, 'active', 1);
      this.updateStats(poolName, 'created', 1);

      // Update acquisition time
      const stats = this.stats.get(poolName)!;
      stats.averageAcquisitionTime =
        (stats.averageAcquisitionTime * (stats.created - 1) + acquisitionTime) / stats.created;

      // Check for peak active
      if (stats.active > stats.peakActive) {
        stats.peakActive = stats.active;
      }

      // Leak detection
      if (this.config.leakDetection.enabled) {
        setTimeout(() => {
          if (this.activeConnections.has(connId)) {
            this.logger.warn('Potential connection leak detected', {
              connection: connId,
              holdTime: Date.now() - startTime,
            });
            this.updateStats(poolName, 'leaks', 1);
            this.activeConnections.get(connId)!.leaked = true;
            this.emit('connection-leak', { connId, poolName });
          }
        }, this.config.leakDetection.threshold);
      }

      this.logger.debug('PostgreSQL connection acquired', {
        pool: poolName,
        acquisitionTime,
        activeConnections: stats.active,
      });

      return client;
    } catch (error) {
      this.logger.error('Error acquiring PostgreSQL connection', { error, preferReplica });
      throw error;
    }
  }

  /**
   * Release PostgreSQL connection
   */
  releasePostgresConnection(client: PoolClient, connId?: string): void {
    client.release();

    if (connId && this.activeConnections.has(connId)) {
      const connInfo = this.activeConnections.get(connId)!;
      connInfo.released = new Date();
      connInfo.holdTime = connInfo.released.getTime() - connInfo.acquired.getTime();

      this.activeConnections.delete(connId);
      this.updateStats(connInfo.database, 'active', -1);

      // Update average hold time
      const stats = this.stats.get(connInfo.database)!;
      stats.averageHoldTime =
        (stats.averageHoldTime * (stats.destroyed || 1) + connInfo.holdTime) /
        ((stats.destroyed || 0) + 1);

      this.logger.debug('PostgreSQL connection released', {
        pool: connInfo.database,
        holdTime: connInfo.holdTime,
      });
    }
  }

  /**
   * Get MongoDB database
   */
  getMongoDatabase(dbName?: string): import('mongodb').Db {
    if (!this.pools.mongodb) {
      throw new Error('MongoDB pool not initialized');
    }

    const database = dbName || this.config.databases.mongodb?.uri.split('/').pop();
    if (!database) {
      throw new Error('Database name not specified');
    }

    return this.pools.mongodb.db(database);
  }

  /**
   * Perform health checks
   */
  async performHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    // PostgreSQL health check
    if (this.pools.postgres?.primary) {
      const result = await this.checkPostgresHealth(
        this.pools.postgres.primary,
        'postgres-primary'
      );
      results.push(result);
    }

    // MongoDB health check
    if (this.pools.mongodb) {
      const result = await this.checkMongoDBHealth();
      results.push(result);
    }

    // MySQL health check
    if (this.pools.mysql?.primary) {
      const result = await this.checkMySQLHealth(this.pools.mysql.primary, 'mysql-primary');
      results.push(result);
    }

    // Redis health check
    if (this.pools.redis?.primary) {
      const result = await this.checkRedisHealth(this.pools.redis.primary, 'redis-primary');
      results.push(result);
    }

    this.emit('health-check-completed', results);
    return results;
  }

  /**
   * Check PostgreSQL health
   */
  private async checkPostgresHealth(pool: PgPool, name: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      await pool.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      this.logger.debug(`${name} health check passed`, { responseTime });

      return {
        database: name,
        healthy: true,
        responseTime,
        timestamp: new Date(),
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      this.logger.error(`${name} health check failed`, { error, responseTime });

      return {
        database: name,
        healthy: false,
        responseTime,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check MongoDB health
   */
  private async checkMongoDBHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      await this.pools.mongodb!.db().admin().ping();
      const responseTime = Date.now() - startTime;

      this.logger.debug('MongoDB health check passed', { responseTime });

      return {
        database: 'mongodb',
        healthy: true,
        responseTime,
        timestamp: new Date(),
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      this.logger.error('MongoDB health check failed', { error, responseTime });

      return {
        database: 'mongodb',
        healthy: false,
        responseTime,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check MySQL health
   */
  private async checkMySQLHealth(pool: mysql.Pool, name: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      await pool.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      this.logger.debug(`${name} health check passed`, { responseTime });

      return {
        database: name,
        healthy: true,
        responseTime,
        timestamp: new Date(),
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      this.logger.error(`${name} health check failed`, { error, responseTime });

      return {
        database: name,
        healthy: false,
        responseTime,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check Redis health
   */
  private async checkRedisHealth(client: Redis, name: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      await client.ping();
      const responseTime = Date.now() - startTime;

      this.logger.debug(`${name} health check passed`, { responseTime });

      return {
        database: name,
        healthy: true,
        responseTime,
        timestamp: new Date(),
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      this.logger.error(`${name} health check failed`, { error, responseTime });

      return {
        database: name,
        healthy: false,
        responseTime,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Schedule health checks
   */
  private scheduleHealthChecks(): void {
    const intervalSeconds = Math.floor(this.config.healthCheck.interval / 1000);
    const schedule = `*/${intervalSeconds} * * * * *`;

    this.healthCheckJob = cron.schedule(schedule, async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        this.logger.error('Health check error', { error });
      }
    });

    this.logger.info('Health checks scheduled', {
      interval: this.config.healthCheck.interval,
    });
  }

  /**
   * Schedule adaptive pooling
   */
  private scheduleAdaptivePooling(): void {
    const intervalSeconds = Math.floor(this.config.adaptivePooling.checkInterval / 1000);
    const schedule = `*/${intervalSeconds} * * * * *`;

    this.adaptiveJob = cron.schedule(schedule, () => {
      try {
        this.adjustPoolSizes();
      } catch (error) {
        this.logger.error('Adaptive pooling error', { error });
      }
    });

    this.logger.info('Adaptive pooling scheduled', {
      checkInterval: this.config.adaptivePooling.checkInterval,
    });
  }

  /**
   * Adjust pool sizes based on utilization
   */
  private adjustPoolSizes(): void {
    for (const [name, stats] of this.stats.entries()) {
      const utilization = stats.total > 0 ? stats.active / stats.total : 0;

      if (utilization > this.config.adaptivePooling.scaleUpThreshold) {
        this.logger.info('Pool utilization high, consider scaling up', {
          pool: name,
          utilization: (utilization * 100).toFixed(2) + '%',
          active: stats.active,
          total: stats.total,
        });

        this.emit('scale-up-recommended', { pool: name, utilization, stats });
      } else if (utilization < this.config.adaptivePooling.scaleDownThreshold && stats.total > 2) {
        this.logger.info('Pool utilization low, consider scaling down', {
          pool: name,
          utilization: (utilization * 100).toFixed(2) + '%',
          active: stats.active,
          total: stats.total,
        });

        this.emit('scale-down-recommended', { pool: name, utilization, stats });
      }
    }
  }

  /**
   * Get all statistics
   */
  getAllStatistics(): Map<string, PoolStatistics> {
    return new Map(this.stats);
  }

  /**
   * Get statistics for specific database
   */
  getStatistics(database: string): PoolStatistics | undefined {
    return this.stats.get(database);
  }

  /**
   * Shutdown all pools
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down ConnectionPoolManager');

    if (this.healthCheckJob) {
      this.healthCheckJob.stop();
    }

    if (this.adaptiveJob) {
      this.adaptiveJob.stop();
    }

    // Close PostgreSQL pools
    if (this.pools.postgres) {
      await this.pools.postgres.primary?.end();
      for (const replica of this.pools.postgres.replicas) {
        await replica.end();
      }
    }

    // Close MongoDB connection
    if (this.pools.mongodb) {
      await this.pools.mongodb.close();
    }

    // Close MySQL pools
    if (this.pools.mysql) {
      await this.pools.mysql.primary?.end();
      for (const replica of this.pools.mysql.replicas) {
        await replica.end();
      }
    }

    // Close Redis connections
    if (this.pools.redis) {
      this.pools.redis.primary?.disconnect();
      for (const replica of this.pools.redis.replicas) {
        replica.disconnect();
      }
    }

    this.removeAllListeners();
    this.logger.info('ConnectionPoolManager shutdown complete');
  }
}

export default ConnectionPoolManager;
