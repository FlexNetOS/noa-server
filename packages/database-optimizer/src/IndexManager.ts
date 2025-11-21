/**
 * IndexManager - Automatic index management and optimization
 *
 * Features:
 * - Automatic index creation based on query patterns
 * - Index usage statistics tracking
 * - Identify unused indexes
 * - Composite index recommendations
 * - Partial index suggestions
 * - Index maintenance scheduling
 * - Index bloat detection
 */

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import winston from 'winston';
import cron from 'node-cron';
import { z } from 'zod';

// Configuration Schema
export const IndexManagerConfigSchema = z.object({
  enableAutoCreation: z.boolean().default(false),
  minQueryCount: z.number().default(100), // Minimum queries before suggesting index
  unusedIndexThreshold: z.number().default(30), // days
  maintenanceSchedule: z.string().default('0 2 * * 0'), // Weekly at 2 AM on Sunday
  maxIndexesPerTable: z.number().default(10),
  enableBloatDetection: z.boolean().default(true),
  bloatThreshold: z.number().default(30), // percentage
});

export type IndexManagerConfig = z.infer<typeof IndexManagerConfigSchema>;

// Index Information
export interface IndexInfo {
  schemaName: string;
  tableName: string;
  indexName: string;
  indexDef: string;
  indexType: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
  sizeBytes: number;
  scanCount: number;
  tupleReadCount: number;
  lastUsed?: Date;
  bloatPercentage: number;
  isPartial: boolean;
  condition?: string;
}

// Index Recommendation
export interface IndexRecommendation {
  tableName: string;
  columns: string[];
  indexType: 'btree' | 'hash' | 'gist' | 'gin' | 'brin';
  reason: string;
  queryPattern: string;
  estimatedBenefit: number; // 0-100
  estimatedCost: number; // MB
  priority: 'low' | 'medium' | 'high' | 'critical';
  createStatement: string;
  isComposite: boolean;
  isPartial: boolean;
  partialCondition?: string;
}

// Index Usage Statistics
export interface IndexUsageStats {
  indexName: string;
  tableName: string;
  totalScans: number;
  tuplesRead: number;
  tuplesReturned: number;
  indexSize: string;
  lastUsed: Date | null;
  usageRatio: number; // scans / total queries on table
  recommendation: 'keep' | 'monitor' | 'consider-dropping' | 'drop';
}

// Index Maintenance Report
export interface MaintenanceReport {
  timestamp: Date;
  reindexedIndexes: string[];
  vacuumedTables: string[];
  bloatedIndexes: IndexInfo[];
  droppedIndexes: string[];
  createdIndexes: string[];
  totalDuration: number; // milliseconds
  errors: Array<{ index: string; error: string }>;
}

/**
 * IndexManager Class
 */
export class IndexManager extends EventEmitter {
  private config: IndexManagerConfig;
  private logger: winston.Logger;
  private pool: Pool;
  private maintenanceJob?: cron.ScheduledTask;
  private indexCache: Map<string, IndexInfo>;
  private queryPatterns: Map<string, Set<string>>;
  private isMonitoring: boolean = false;

  constructor(pool: Pool, config: Partial<IndexManagerConfig> = {}) {
    super();
    this.pool = pool;
    this.config = IndexManagerConfigSchema.parse(config);
    this.logger = this.initializeLogger();
    this.indexCache = new Map();
    this.queryPatterns = new Map();

    this.logger.info('IndexManager initialized', {
      enableAutoCreation: this.config.enableAutoCreation,
      maintenanceSchedule: this.config.maintenanceSchedule,
    });

    // Schedule maintenance if configured
    if (this.config.maintenanceSchedule) {
      this.scheduleMaintenance();
    }
  }

  /**
   * Initialize logger
   */
  private initializeLogger(): winston.Logger {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'index-manager-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'index-manager.log' }),
      ],
    });
  }

  /**
   * Get all indexes for a database
   */
  async getAllIndexes(refresh: boolean = false): Promise<IndexInfo[]> {
    if (!refresh && this.indexCache.size > 0) {
      return Array.from(this.indexCache.values());
    }

    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          schemaname,
          tablename,
          indexname,
          indexdef,
          pg_relation_size(indexrelid) as size_bytes,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_indexes
        JOIN pg_stat_user_indexes USING (schemaname, tablename, indexname)
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY schemaname, tablename, indexname;
      `;

      const result = await client.query(query);
      const indexes: IndexInfo[] = [];

      for (const row of result.rows) {
        const bloatPercentage = await this.calculateIndexBloat(row.indexname);

        const indexInfo: IndexInfo = {
          schemaName: row.schemaname,
          tableName: row.tablename,
          indexName: row.indexname,
          indexDef: row.indexdef,
          indexType: this.extractIndexType(row.indexdef),
          columns: this.extractColumns(row.indexdef),
          isUnique: row.indexdef.includes('UNIQUE'),
          isPrimary: row.indexname.endsWith('_pkey'),
          sizeBytes: parseInt(row.size_bytes),
          scanCount: parseInt(row.idx_scan),
          tupleReadCount: parseInt(row.idx_tup_read),
          bloatPercentage,
          isPartial: row.indexdef.includes('WHERE'),
          condition: this.extractPartialCondition(row.indexdef),
        };

        indexes.push(indexInfo);
        this.indexCache.set(indexInfo.indexName, indexInfo);
      }

      this.logger.info(`Retrieved ${indexes.length} indexes`);
      return indexes;
    } catch (error) {
      this.logger.error('Error fetching indexes', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Extract index type from definition
   */
  private extractIndexType(indexDef: string): string {
    if (indexDef.includes('USING btree')) return 'btree';
    if (indexDef.includes('USING hash')) return 'hash';
    if (indexDef.includes('USING gist')) return 'gist';
    if (indexDef.includes('USING gin')) return 'gin';
    if (indexDef.includes('USING brin')) return 'brin';
    return 'btree'; // default
  }

  /**
   * Extract columns from index definition
   */
  private extractColumns(indexDef: string): string[] {
    const match = indexDef.match(/\(([^)]+)\)/);
    if (!match) return [];

    return match[1]
      .split(',')
      .map((col) => col.trim().replace(/\(.*\)/, ''))
      .filter((col) => col.length > 0);
  }

  /**
   * Extract partial index condition
   */
  private extractPartialCondition(indexDef: string): string | undefined {
    const match = indexDef.match(/WHERE (.+)$/);
    return match ? match[1] : undefined;
  }

  /**
   * Calculate index bloat percentage
   */
  private async calculateIndexBloat(indexName: string): Promise<number> {
    if (!this.config.enableBloatDetection) return 0;

    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          current_database() AS db,
          schemaname,
          tablename,
          ROUND(
            CASE
              WHEN otta = 0 OR sml.relpages = 0 OR sml.relpages = otta THEN 0.0
              ELSE sml.relpages / otta::numeric
            END,
            1
          ) AS tbloat,
          CASE
            WHEN relpages < otta THEN 0
            ELSE relpages::bigint - otta
          END AS wastedpages,
          CASE
            WHEN relpages < otta THEN 0
            ELSE bs * (sml.relpages - otta)::bigint
          END AS wastedbytes,
          CASE
            WHEN relpages < otta THEN '0 bytes'::text
            ELSE pg_size_pretty((bs * (relpages - otta))::bigint)
          END AS wastedsize,
          iname,
          ROUND(
            CASE
              WHEN iotta = 0 OR ipages = 0 OR ipages = iotta THEN 0.0
              ELSE ipages / iotta::numeric
            END,
            1
          ) AS ibloat,
          CASE
            WHEN ipages < iotta THEN 0
            ELSE ipages::bigint - iotta
          END AS wastedipages,
          CASE
            WHEN ipages < iotta THEN 0
            ELSE bs * (ipages - iotta)
          END AS wastedibytes,
          CASE
            WHEN ipages < iotta THEN '0 bytes'
            ELSE pg_size_pretty((bs * (ipages - iotta))::bigint)
          END AS wastedisize
        FROM (
          SELECT
            schemaname,
            tablename,
            cc.relpages,
            bs,
            CEIL((cc.reltuples * ((datahdr + ma - (CASE WHEN datahdr % ma = 0 THEN ma ELSE datahdr % ma END)) + nullhdr2 + 4)) / (bs - 20::float)) AS otta,
            COALESCE(c2.relname, '?') AS iname,
            COALESCE(c2.reltuples, 0) AS ituples,
            COALESCE(c2.relpages, 0) AS ipages,
            COALESCE(CEIL((c2.reltuples * (datahdr - 12)) / (bs - 20::float)), 0) AS iotta
          FROM (
            SELECT
              ma,
              bs,
              schemaname,
              tablename,
              (datawidth + (hdr + ma - (CASE WHEN hdr % ma = 0 THEN ma ELSE hdr % ma END)))::numeric AS datahdr,
              (maxfracsum * (nullhdr + ma - (CASE WHEN nullhdr % ma = 0 THEN ma ELSE nullhdr % ma END))) AS nullhdr2
            FROM (
              SELECT
                schemaname,
                tablename,
                hdr,
                ma,
                bs,
                SUM((1 - null_frac) * avg_width) AS datawidth,
                MAX(null_frac) AS maxfracsum,
                hdr + (
                  SELECT 1 + count(*) / 8
                  FROM pg_stats s2
                  WHERE null_frac <> 0 AND s2.schemaname = s.schemaname AND s2.tablename = s.tablename
                ) AS nullhdr
              FROM pg_stats s,
              (
                SELECT
                  (SELECT current_setting('block_size')::numeric) AS bs,
                  CASE WHEN substring(v, 12, 3) IN ('8.0', '8.1', '8.2') THEN 27 ELSE 23 END AS hdr,
                  CASE WHEN v ~ 'mingw32' THEN 8 ELSE 4 END AS ma
                FROM (SELECT version() AS v) AS foo
              ) AS constants
              GROUP BY 1, 2, 3, 4, 5
            ) AS foo
          ) AS rs
          JOIN pg_class cc ON cc.relname = rs.tablename
          JOIN pg_namespace nn ON cc.relnamespace = nn.oid AND nn.nspname = rs.schemaname
          LEFT JOIN pg_index i ON indrelid = cc.oid
          LEFT JOIN pg_class c2 ON c2.oid = i.indexrelid
        ) AS sml
        WHERE sml.iname = $1;
      `;

      const result = await client.query(query, [indexName]);

      if (result.rows.length > 0) {
        const bloat = parseFloat(result.rows[0].ibloat) || 0;
        return Math.max(0, (bloat - 1) * 100);
      }

      return 0;
    } catch (error) {
      this.logger.debug('Error calculating bloat for index', { indexName, error });
      return 0;
    } finally {
      client.release();
    }
  }

  /**
   * Get unused indexes
   */
  async getUnusedIndexes(): Promise<IndexUsageStats[]> {
    const indexes = await this.getAllIndexes(true);
    const unusedIndexes: IndexUsageStats[] = [];

    for (const index of indexes) {
      // Skip primary keys and unique constraints
      if (index.isPrimary || index.isUnique) continue;

      const usageStats = await this.getIndexUsageStats(index.indexName);

      if (
        usageStats.recommendation === 'consider-dropping' ||
        usageStats.recommendation === 'drop'
      ) {
        unusedIndexes.push(usageStats);
      }
    }

    this.logger.info(`Found ${unusedIndexes.length} potentially unused indexes`);
    return unusedIndexes;
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsageStats(indexName: string): Promise<IndexUsageStats> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          s.indexrelname,
          s.relname,
          s.idx_scan,
          s.idx_tup_read,
          s.idx_tup_fetch,
          pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size,
          CASE
            WHEN s.idx_scan = 0 THEN 'drop'
            WHEN s.idx_scan < 10 THEN 'consider-dropping'
            WHEN s.idx_scan < 100 THEN 'monitor'
            ELSE 'keep'
          END as recommendation
        FROM pg_stat_user_indexes s
        WHERE s.indexrelname = $1;
      `;

      const result = await client.query(query, [indexName]);

      if (result.rows.length === 0) {
        throw new Error(`Index ${indexName} not found`);
      }

      const row = result.rows[0];

      return {
        indexName: row.indexrelname,
        tableName: row.relname,
        totalScans: parseInt(row.idx_scan),
        tuplesRead: parseInt(row.idx_tup_read),
        tuplesReturned: parseInt(row.idx_tup_fetch),
        indexSize: row.index_size,
        lastUsed: null, // PostgreSQL doesn't track this
        usageRatio: 0, // Would need table stats to calculate
        recommendation: row.recommendation,
      };
    } catch (error) {
      this.logger.error('Error fetching index usage stats', { indexName, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate index recommendations based on query patterns
   */
  async generateRecommendations(tableName?: string): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    // Get tables with missing indexes from pg_stat_statements
    const client = await this.pool.connect();

    try {
      // This requires pg_stat_statements extension
      const query = `
        SELECT
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
          ${tableName ? 'AND tablename = $1' : ''}
        AND n_distinct > 100
        ORDER BY n_distinct DESC
        LIMIT 50;
      `;

      const params = tableName ? [tableName] : [];
      const result = await client.query(query, params);

      for (const row of result.rows) {
        const recommendation: IndexRecommendation = {
          tableName: row.tablename,
          columns: [row.attname],
          indexType: 'btree',
          reason: `High cardinality column (${row.n_distinct} distinct values) with good correlation`,
          queryPattern: 'Unknown',
          estimatedBenefit: Math.min(95, Math.abs(row.correlation) * 100),
          estimatedCost: 5, // MB estimate
          priority: Math.abs(row.correlation) > 0.8 ? 'high' : 'medium',
          createStatement: `CREATE INDEX idx_${row.tablename}_${row.attname} ON ${row.tablename}(${row.attname});`,
          isComposite: false,
          isPartial: false,
        };

        recommendations.push(recommendation);
      }

      this.logger.info(`Generated ${recommendations.length} index recommendations`);
      return recommendations;
    } catch (error) {
      this.logger.error('Error generating recommendations', { error });
      return recommendations;
    } finally {
      client.release();
    }
  }

  /**
   * Create index
   */
  async createIndex(
    recommendation: IndexRecommendation,
    concurrent: boolean = true
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      const statement = concurrent
        ? recommendation.createStatement.replace('CREATE INDEX', 'CREATE INDEX CONCURRENTLY')
        : recommendation.createStatement;

      this.logger.info('Creating index', {
        statement,
        concurrent,
      });

      await client.query(statement);

      this.emit('index-created', recommendation);
      this.logger.info('Index created successfully', {
        indexName: `idx_${recommendation.tableName}_${recommendation.columns.join('_')}`,
      });

      // Refresh cache
      await this.getAllIndexes(true);
    } catch (error) {
      this.logger.error('Error creating index', { recommendation, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Drop unused index
   */
  async dropIndex(indexName: string, concurrent: boolean = true): Promise<void> {
    const client = await this.pool.connect();

    try {
      const statement = concurrent
        ? `DROP INDEX CONCURRENTLY ${indexName};`
        : `DROP INDEX ${indexName};`;

      this.logger.info('Dropping index', { indexName, concurrent });

      await client.query(statement);

      this.emit('index-dropped', indexName);
      this.logger.info('Index dropped successfully', { indexName });

      // Remove from cache
      this.indexCache.delete(indexName);
    } catch (error) {
      this.logger.error('Error dropping index', { indexName, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reindex
   */
  async reindex(indexName: string, concurrent: boolean = true): Promise<void> {
    const client = await this.pool.connect();

    try {
      const statement = concurrent
        ? `REINDEX INDEX CONCURRENTLY ${indexName};`
        : `REINDEX INDEX ${indexName};`;

      this.logger.info('Reindexing', { indexName, concurrent });

      await client.query(statement);

      this.emit('index-reindexed', indexName);
      this.logger.info('Index reindexed successfully', { indexName });
    } catch (error) {
      this.logger.error('Error reindexing', { indexName, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Perform index maintenance
   */
  async performMaintenance(): Promise<MaintenanceReport> {
    this.logger.info('Starting index maintenance');
    const startTime = Date.now();

    const report: MaintenanceReport = {
      timestamp: new Date(),
      reindexedIndexes: [],
      vacuumedTables: [],
      bloatedIndexes: [],
      droppedIndexes: [],
      createdIndexes: [],
      totalDuration: 0,
      errors: [],
    };

    try {
      // Get all indexes
      const indexes = await this.getAllIndexes(true);

      // Find bloated indexes
      for (const index of indexes) {
        if (index.bloatPercentage > this.config.bloatThreshold) {
          report.bloatedIndexes.push(index);

          try {
            await this.reindex(index.indexName, true);
            report.reindexedIndexes.push(index.indexName);
          } catch (error: any) {
            report.errors.push({
              index: index.indexName,
              error: error.message,
            });
          }
        }
      }

      // Vacuum tables
      const tables = new Set(indexes.map((idx) => idx.tableName));
      for (const tableName of tables) {
        try {
          await this.pool.query(`VACUUM ANALYZE ${tableName};`);
          report.vacuumedTables.push(tableName);
        } catch (error: any) {
          report.errors.push({
            index: tableName,
            error: error.message,
          });
        }
      }

      report.totalDuration = Date.now() - startTime;

      this.logger.info('Index maintenance completed', {
        duration: report.totalDuration,
        reindexed: report.reindexedIndexes.length,
        vacuumed: report.vacuumedTables.length,
        errors: report.errors.length,
      });

      this.emit('maintenance-completed', report);
      return report;
    } catch (error) {
      this.logger.error('Error during maintenance', { error });
      throw error;
    }
  }

  /**
   * Schedule maintenance
   */
  private scheduleMaintenance(): void {
    this.maintenanceJob = cron.schedule(this.config.maintenanceSchedule, async () => {
      try {
        await this.performMaintenance();
      } catch (error) {
        this.logger.error('Scheduled maintenance failed', { error });
      }
    });

    this.logger.info('Maintenance scheduled', {
      schedule: this.config.maintenanceSchedule,
    });
  }

  /**
   * Shutdown manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down IndexManager');

    if (this.maintenanceJob) {
      this.maintenanceJob.stop();
    }

    this.removeAllListeners();
  }
}

export default IndexManager;
