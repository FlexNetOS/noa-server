import { Pool, PoolConfig, QueryResult } from 'pg';
import { Logger } from 'winston';
import { PostgreSQLShardConfig } from '../types';

export interface PostgreSQLShardAdapterOptions {
  config: PostgreSQLShardConfig;
  poolConfig?: Partial<PoolConfig>;
  logger: Logger;
}

export class PostgreSQLShardAdapter {
  private config: PostgreSQLShardConfig;
  private poolConfig: PoolConfig;
  private pool: Pool | null = null;
  private logger: Logger;
  private isConnected = false;

  constructor(options: PostgreSQLShardAdapterOptions) {
    this.config = options.config;
    this.logger = options.logger;

    // Default pool configuration
    this.poolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl || false,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis || 10000,
      query_timeout: this.config.query_timeout || 30000,
      statement_timeout: this.config.statement_timeout || 30000,
      min: 1,
      max: 10,
      idleTimeoutMillis: 30000,
      allowExitOnIdle: true,
      ...options.poolConfig,
    };
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing PostgreSQL shard adapter', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
      });

      this.pool = new Pool(this.poolConfig);

      // Set up event handlers
      this.pool.on('connect', (client) => {
        this.logger.debug('New client connected to PostgreSQL shard');
      });

      this.pool.on('error', (err, client) => {
        this.logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
      });

      this.pool.on('remove', (client) => {
        this.logger.debug('Client removed from PostgreSQL pool');
      });

      // Test connection
      await this.ping();

      this.isConnected = true;
      this.logger.info('PostgreSQL shard adapter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize PostgreSQL shard adapter', { error });
      throw error;
    }
  }

  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }

    this.logger.info('Closing PostgreSQL shard adapter');

    try {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      this.logger.info('PostgreSQL shard adapter closed successfully');
    } catch (error) {
      this.logger.error('Error closing PostgreSQL shard adapter', { error });
      throw error;
    }
  }

  async ping(): Promise<void> {
    if (!this.pool) {
      throw new Error('Adapter not initialized');
    }

    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  async execute<T = any>(operation: (connection: any) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Adapter not initialized');
    }

    const client = await this.pool.connect();
    const startTime = Date.now();

    try {
      const result = await operation(client);
      const duration = Date.now() - startTime;

      this.logger.debug('Query executed successfully', {
        duration,
        operation: operation.name || 'anonymous',
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Query execution failed', {
        duration,
        error: error.message,
        operation: operation.name || 'anonymous',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async executeTransaction<T = any>(operation: (connection: any) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Adapter not initialized');
    }

    const client = await this.pool.connect();
    const startTime = Date.now();

    try {
      await client.query('BEGIN');

      const result = await operation(client);

      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      this.logger.debug('Transaction completed successfully', {
        duration,
        operation: operation.name || 'anonymous',
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Transaction failed, rolling back', {
        duration,
        error: error.message,
        operation: operation.name || 'anonymous',
      });

      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        this.logger.error('Rollback failed', { rollbackError });
      }

      throw error;
    } finally {
      client.release();
    }
  }

  // Query methods
  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    return this.execute(async (client) => {
      const startTime = Date.now();
      const result = await client.query(sql, params);
      const duration = Date.now() - startTime;

      this.logger.debug('SQL query executed', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        paramCount: params?.length || 0,
        rowCount: result.rowCount,
        duration,
      });

      return result;
    });
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async queryMany<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.query<T>(sql, params);
    return result.rows;
  }

  // Bulk operations
  async insert(
    tableName: string,
    data: Record<string, any> | Record<string, any>[]
  ): Promise<QueryResult> {
    const records = Array.isArray(data) ? data : [data];

    if (records.length === 0) {
      throw new Error('No data provided for insert');
    }

    const columns = Object.keys(records[0]);
    const placeholders = records
      .map((_, i) => `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`)
      .join(', ');

    const values = records.flatMap((record) => columns.map((col) => record[col]));

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`;

    return this.query(sql, values);
  }

  async update(
    tableName: string,
    data: Record<string, any>,
    where: Record<string, any>
  ): Promise<QueryResult> {
    const setColumns = Object.keys(data);
    const whereColumns = Object.keys(where);

    const setClause = setColumns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    const whereClause = whereColumns
      .map((col, i) => `${col} = $${setColumns.length + i + 1}`)
      .join(' AND ');

    const values = [
      ...setColumns.map((col) => data[col]),
      ...whereColumns.map((col) => where[col]),
    ];

    const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;

    return this.query(sql, values);
  }

  async delete(tableName: string, where: Record<string, any>): Promise<QueryResult> {
    const whereColumns = Object.keys(where);
    const whereClause = whereColumns.map((col, i) => `${col} = $${i + 1}`).join(' AND ');
    const values = whereColumns.map((col) => where[col]);

    const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;

    return this.query(sql, values);
  }

  // Schema operations
  async createTable(tableName: string, schema: Record<string, string>): Promise<void> {
    const columns = Object.entries(schema)
      .map(([col, type]) => `${col} ${type}`)
      .join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;

    await this.query(sql);
    this.logger.info(`Table ${tableName} created or already exists`);
  }

  async dropTable(tableName: string): Promise<void> {
    const sql = `DROP TABLE IF EXISTS ${tableName}`;
    await this.query(sql);
    this.logger.info(`Table ${tableName} dropped`);
  }

  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.queryOne(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      )
    `,
      [tableName]
    );

    return result?.exists || false;
  }

  async getTableSchema(tableName: string): Promise<Record<string, any>[]> {
    const result = await this.query(
      `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      ORDER BY ordinal_position
    `,
      [tableName]
    );

    return result.rows;
  }

  // Connection pool management
  getPoolStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    if (!this.pool) {
      return { totalCount: 0, idleCount: 0, waitingCount: 0 };
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  // Health check
  async healthCheck(): Promise<{
    isHealthy: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.ping();
      const latency = Date.now() - startTime;
      return { isHealthy: true, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      return { isHealthy: false, latency, error: error.message };
    }
  }

  // Configuration
  updatePoolConfig(config: Partial<PoolConfig>): void {
    if (this.pool) {
      this.logger.warn('Cannot update pool config after initialization');
      return;
    }

    this.poolConfig = { ...this.poolConfig, ...config };
    this.logger.info('Pool configuration updated');
  }

  getConfig(): PostgreSQLShardConfig {
    return { ...this.config };
  }

  isInitialized(): boolean {
    return this.isConnected && this.pool !== null;
  }
}
