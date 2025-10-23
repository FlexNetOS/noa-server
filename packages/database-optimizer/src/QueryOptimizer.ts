/**
 * QueryOptimizer - Main query optimization and analysis engine
 *
 * Features:
 * - Analyze query execution plans (EXPLAIN ANALYZE)
 * - Identify slow queries (>100ms)
 * - Suggest index improvements
 * - Detect N+1 query problems
 * - Query result caching recommendations
 * - Batch query optimization
 * - Connection usage analysis
 */

import { EventEmitter } from 'events';

import { Redis } from 'ioredis';
import { MongoClient, Db } from 'mongodb';
import { Pool, PoolClient, QueryResult } from 'pg';
import winston from 'winston';
import { z } from 'zod';

// Configuration Schema
export const QueryOptimizerConfigSchema = z.object({
  slowQueryThreshold: z.number().default(100), // milliseconds
  enableAutoIndexing: z.boolean().default(false),
  enableQueryCache: z.boolean().default(true),
  cacheTTL: z.number().default(300), // seconds
  maxCacheSize: z.number().default(1000),
  enableExplainAnalyze: z.boolean().default(true),
  databases: z.object({
    postgres: z
      .object({
        enabled: z.boolean().default(false),
        pool: z.any().optional(),
      })
      .optional(),
    mongodb: z
      .object({
        enabled: z.boolean().default(false),
        client: z.any().optional(),
      })
      .optional(),
  }),
  redis: z.any().optional(),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'simple']).default('json'),
  }),
});

export type QueryOptimizerConfig = z.infer<typeof QueryOptimizerConfigSchema>;

// Query Analysis Result
export interface QueryAnalysis {
  query: string;
  executionTime: number;
  planningTime: number;
  executionPlan: any;
  recommendations: Recommendation[];
  isSlowQuery: boolean;
  isPotentialNPlusOne: boolean;
  suggestedIndexes: IndexSuggestion[];
  cacheability: CacheabilityAnalysis;
  timestamp: Date;
}

export interface Recommendation {
  type: 'index' | 'query-rewrite' | 'cache' | 'batch' | 'partition';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: string;
  estimatedImprovement: string;
  implementationCost: 'low' | 'medium' | 'high';
}

export interface IndexSuggestion {
  tableName: string;
  columns: string[];
  indexType: 'btree' | 'hash' | 'gist' | 'gin' | 'brin' | 'partial';
  condition?: string; // For partial indexes
  estimatedImprovement: number; // percentage
  createStatement: string;
}

export interface CacheabilityAnalysis {
  isCacheable: boolean;
  reason: string;
  suggestedTTL: number;
  cacheKey: string;
  invalidationStrategy: 'ttl' | 'event-based' | 'manual';
}

// Query Statistics
export interface QueryStatistics {
  totalQueries: number;
  slowQueries: number;
  averageExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  cacheHitRate: number;
  mostFrequentQueries: Array<{
    query: string;
    count: number;
    avgTime: number;
  }>;
  slowestQueries: Array<{
    query: string;
    maxTime: number;
    count: number;
  }>;
}

/**
 * Main Query Optimizer Class
 */
export class QueryOptimizer extends EventEmitter {
  private config: QueryOptimizerConfig;
  private logger: winston.Logger;
  private pgPool?: Pool;
  private mongoDb?: Db;
  private redis?: Redis;
  private queryCache: Map<string, { result: any; timestamp: number; hits: number }>;
  private queryStats: Map<string, { times: number[]; count: number }>;
  private analysisHistory: QueryAnalysis[];
  private isMonitoring: boolean = false;

  constructor(config: Partial<QueryOptimizerConfig> = {}) {
    super();
    this.config = QueryOptimizerConfigSchema.parse(config);
    this.logger = this.initializeLogger();
    this.queryCache = new Map();
    this.queryStats = new Map();
    this.analysisHistory = [];

    // Initialize database connections
    if (this.config.databases?.postgres?.enabled && this.config.databases.postgres.pool) {
      this.pgPool = this.config.databases.postgres.pool;
    }

    if (this.config.databases?.mongodb?.enabled && this.config.databases.mongodb.client) {
      this.mongoDb = this.config.databases.mongodb.client;
    }

    if (this.config.redis) {
      this.redis = this.config.redis;
    }

    this.logger.info('QueryOptimizer initialized', {
      slowQueryThreshold: this.config.slowQueryThreshold,
      enableAutoIndexing: this.config.enableAutoIndexing,
      enableQueryCache: this.config.enableQueryCache,
    });
  }

  /**
   * Initialize Winston logger
   */
  private initializeLogger(): winston.Logger {
    const format =
      this.config.logging.format === 'json' ? winston.format.json() : winston.format.simple();

    return winston.createLogger({
      level: this.config.logging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        format
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'query-optimizer-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'query-optimizer.log' }),
      ],
    });
  }

  /**
   * Analyze a PostgreSQL query
   */
  async analyzePostgresQuery(query: string, params?: any[]): Promise<QueryAnalysis> {
    if (!this.pgPool) {
      throw new Error('PostgreSQL pool not configured');
    }

    const startTime = Date.now();
    let client: PoolClient | undefined;

    try {
      client = await this.pgPool.connect();

      // Get execution plan with EXPLAIN ANALYZE
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const explainResult = await client.query(explainQuery, params);
      const executionPlan = explainResult.rows[0]['QUERY PLAN'][0];

      const executionTime = executionPlan['Execution Time'];
      const planningTime = executionPlan['Planning Time'];

      // Analyze the plan for recommendations
      const recommendations = this.generateRecommendations(executionPlan, query);
      const suggestedIndexes = this.suggestIndexes(executionPlan, query);
      const cacheability = this.analyzeCacheability(query, executionPlan);

      // Check if it's a slow query
      const isSlowQuery = executionTime > this.config.slowQueryThreshold;

      // Check for potential N+1 problems
      const isPotentialNPlusOne = this.detectNPlusOnePattern(query);

      const analysis: QueryAnalysis = {
        query,
        executionTime,
        planningTime,
        executionPlan,
        recommendations,
        isSlowQuery,
        isPotentialNPlusOne,
        suggestedIndexes,
        cacheability,
        timestamp: new Date(),
      };

      // Update statistics
      this.updateQueryStatistics(query, executionTime);

      // Store in history
      this.analysisHistory.push(analysis);
      if (this.analysisHistory.length > 1000) {
        this.analysisHistory.shift();
      }

      // Emit events
      if (isSlowQuery) {
        this.emit('slow-query', analysis);
        this.logger.warn('Slow query detected', {
          query: query.substring(0, 100),
          executionTime,
          threshold: this.config.slowQueryThreshold,
        });
      }

      if (isPotentialNPlusOne) {
        this.emit('n-plus-one', analysis);
        this.logger.warn('Potential N+1 query detected', {
          query: query.substring(0, 100),
        });
      }

      return analysis;
    } catch (error) {
      this.logger.error('Error analyzing query', { error, query: query.substring(0, 100) });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Execute query with caching and optimization
   */
  async executeOptimized(query: string, params?: any[]): Promise<QueryResult> {
    if (!this.pgPool) {
      throw new Error('PostgreSQL pool not configured');
    }

    const cacheKey = this.generateCacheKey(query, params);

    // Check cache first
    if (this.config.enableQueryCache && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey)!;
      const age = Date.now() - cached.timestamp;

      if (age < this.config.cacheTTL * 1000) {
        cached.hits++;
        this.emit('cache-hit', { query, cacheKey });
        this.logger.debug('Query cache hit', { cacheKey, hits: cached.hits });
        return cached.result;
      } else {
        // Expired cache
        this.queryCache.delete(cacheKey);
      }
    }

    // Execute query
    const startTime = Date.now();
    const result = await this.pgPool.query(query, params);
    const executionTime = Date.now() - startTime;

    // Update statistics
    this.updateQueryStatistics(query, executionTime);

    // Cache result if appropriate
    if (this.shouldCacheQuery(query, result)) {
      this.cacheQueryResult(cacheKey, result);
    }

    // Analyze if slow
    if (executionTime > this.config.slowQueryThreshold) {
      this.analyzePostgresQuery(query, params).catch((err) => {
        this.logger.error('Error in background query analysis', { error: err });
      });
    }

    return result;
  }

  /**
   * Generate recommendations based on execution plan
   */
  private generateRecommendations(plan: any, query: string): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check for sequential scans on large tables
    if (plan['Plan']['Node Type'] === 'Seq Scan') {
      const rows = plan['Plan']['Plan Rows'];
      if (rows > 1000) {
        recommendations.push({
          type: 'index',
          severity: 'high',
          message: 'Sequential scan detected on large table',
          details: `Table has ${rows} rows. Consider adding an index to improve performance.`,
          estimatedImprovement: '50-90% faster',
          implementationCost: 'low',
        });
      }
    }

    // Check for nested loops
    if (plan['Plan']['Node Type'] === 'Nested Loop') {
      recommendations.push({
        type: 'query-rewrite',
        severity: 'medium',
        message: 'Nested loop join detected',
        details:
          'Consider using hash join or merge join for better performance with large datasets.',
        estimatedImprovement: '20-50% faster',
        implementationCost: 'medium',
      });
    }

    // Check execution time vs planning time ratio
    const execTime = plan['Execution Time'];
    const planTime = plan['Planning Time'];
    if (planTime > execTime * 0.5) {
      recommendations.push({
        type: 'cache',
        severity: 'low',
        message: 'High planning time ratio',
        details: 'Consider using prepared statements or query caching.',
        estimatedImprovement: '10-30% faster',
        implementationCost: 'low',
      });
    }

    // Check buffer usage
    if (plan['Plan']['Shared Hit Blocks'] && plan['Plan']['Shared Read Blocks']) {
      const hitRate =
        plan['Plan']['Shared Hit Blocks'] /
        (plan['Plan']['Shared Hit Blocks'] + plan['Plan']['Shared Read Blocks']);

      if (hitRate < 0.9) {
        recommendations.push({
          type: 'cache',
          severity: 'medium',
          message: 'Low buffer cache hit rate',
          details: `Hit rate: ${(hitRate * 100).toFixed(2)}%. Consider increasing shared_buffers.`,
          estimatedImprovement: '15-40% faster',
          implementationCost: 'low',
        });
      }
    }

    return recommendations;
  }

  /**
   * Suggest indexes based on execution plan
   */
  private suggestIndexes(plan: any, query: string): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];

    // Parse query to identify tables and columns
    const tableMatches = query.match(/FROM\s+(\w+)/gi);
    const whereMatches = query.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/gi);

    if (plan['Plan']['Node Type'] === 'Seq Scan' && whereMatches) {
      const tableName = plan['Plan']['Relation Name'];
      const columns = this.extractColumnsFromWhere(whereMatches[0]);

      suggestions.push({
        tableName,
        columns,
        indexType: 'btree',
        estimatedImprovement: 70,
        createStatement: `CREATE INDEX idx_${tableName}_${columns.join('_')} ON ${tableName}(${columns.join(', ')});`,
      });
    }

    return suggestions;
  }

  /**
   * Extract columns from WHERE clause
   */
  private extractColumnsFromWhere(whereClause: string): string[] {
    const columns: string[] = [];
    const matches = whereClause.match(/(\w+)\s*[=<>]/g);

    if (matches) {
      matches.forEach((match) => {
        const col = match.replace(/\s*[=<>].*/, '').trim();
        if (!columns.includes(col)) {
          columns.push(col);
        }
      });
    }

    return columns;
  }

  /**
   * Analyze if query results are cacheable
   */
  private analyzeCacheability(query: string, plan: any): CacheabilityAnalysis {
    const queryLower = query.toLowerCase();

    // Don't cache writes
    if (
      queryLower.includes('insert') ||
      queryLower.includes('update') ||
      queryLower.includes('delete')
    ) {
      return {
        isCacheable: false,
        reason: 'Write operation',
        suggestedTTL: 0,
        cacheKey: '',
        invalidationStrategy: 'manual',
      };
    }

    // Don't cache queries with NOW(), RANDOM(), etc.
    if (
      queryLower.includes('now()') ||
      queryLower.includes('random()') ||
      queryLower.includes('current_timestamp')
    ) {
      return {
        isCacheable: false,
        reason: 'Non-deterministic function',
        suggestedTTL: 0,
        cacheKey: '',
        invalidationStrategy: 'manual',
      };
    }

    // Cacheable query
    const suggestedTTL = this.calculateOptimalTTL(query, plan);
    const cacheKey = this.generateCacheKey(query);

    return {
      isCacheable: true,
      reason: 'Deterministic SELECT query',
      suggestedTTL,
      cacheKey,
      invalidationStrategy: suggestedTTL > 300 ? 'event-based' : 'ttl',
    };
  }

  /**
   * Calculate optimal cache TTL
   */
  private calculateOptimalTTL(query: string, plan: any): number {
    const executionTime = plan['Execution Time'];

    // Longer TTL for slower queries
    if (executionTime > 1000) {
      return 3600;
    } // 1 hour
    if (executionTime > 500) {
      return 900;
    } // 15 minutes
    if (executionTime > 100) {
      return 300;
    } // 5 minutes

    return 60; // 1 minute
  }

  /**
   * Detect N+1 query pattern
   */
  private detectNPlusOnePattern(query: string): boolean {
    // Simple heuristic: queries in loops often have similar structure
    const recentQueries = this.analysisHistory.slice(-10).map((a) => a.query);

    const similarQueries = recentQueries.filter((q) => this.querySimilarity(q, query) > 0.8);

    return similarQueries.length > 3;
  }

  /**
   * Calculate query similarity (0-1)
   */
  private querySimilarity(q1: string, q2: string): number {
    // Normalize queries by removing parameter values
    const normalize = (q: string) =>
      q
        .replace(/\$\d+/g, '?')
        .replace(/\d+/g, 'N')
        .replace(/['"]\w+['"]/g, 'S')
        .toLowerCase()
        .trim();

    const n1 = normalize(q1);
    const n2 = normalize(q2);

    if (n1 === n2) {
      return 1.0;
    }

    // Simple Levenshtein-based similarity
    const longer = n1.length > n2.length ? n1 : n2;
    const shorter = n1.length > n2.length ? n2 : n1;

    if (longer.length === 0) {
      return 1.0;
    }

    return (longer.length - this.levenshteinDistance(longer, shorter)) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: string, params?: any[]): string {
    const normalized = query.trim().toLowerCase();
    const paramStr = params ? JSON.stringify(params) : '';
    return `query:${Buffer.from(normalized + paramStr).toString('base64')}`;
  }

  /**
   * Update query statistics
   */
  private updateQueryStatistics(query: string, executionTime: number): void {
    const normalized = this.normalizeQuery(query);

    if (!this.queryStats.has(normalized)) {
      this.queryStats.set(normalized, { times: [], count: 0 });
    }

    const stats = this.queryStats.get(normalized)!;
    stats.times.push(executionTime);
    stats.count++;

    // Keep only last 100 execution times
    if (stats.times.length > 100) {
      stats.times.shift();
    }
  }

  /**
   * Normalize query for statistics
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '?')
      .replace(/\d+/g, 'N')
      .replace(/['"]\w+['"]/g, 'S')
      .toLowerCase()
      .trim();
  }

  /**
   * Check if query should be cached
   */
  private shouldCacheQuery(query: string, result: QueryResult): boolean {
    if (!this.config.enableQueryCache) {
      return false;
    }
    if (this.queryCache.size >= this.config.maxCacheSize) {
      return false;
    }

    const queryLower = query.toLowerCase();
    if (
      queryLower.includes('insert') ||
      queryLower.includes('update') ||
      queryLower.includes('delete')
    ) {
      return false;
    }

    // Cache small to medium result sets
    return result.rows.length > 0 && result.rows.length < 10000;
  }

  /**
   * Cache query result
   */
  private cacheQueryResult(cacheKey: string, result: QueryResult): void {
    this.queryCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      hits: 0,
    });

    // Evict oldest entries if cache is full
    if (this.queryCache.size > this.config.maxCacheSize) {
      const oldest = Array.from(this.queryCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0];

      this.queryCache.delete(oldest[0]);
    }
  }

  /**
   * Get query statistics
   */
  getStatistics(): QueryStatistics {
    const allTimes: number[] = [];
    const queryFrequency: Map<string, number> = new Map();

    this.queryStats.forEach((stats, query) => {
      allTimes.push(...stats.times);
      queryFrequency.set(query, stats.count);
    });

    const totalQueries = allTimes.length;
    const slowQueries = allTimes.filter((t) => t > this.config.slowQueryThreshold).length;
    const averageExecutionTime = allTimes.reduce((a, b) => a + b, 0) / totalQueries || 0;

    // Calculate percentiles
    const sortedTimes = allTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    const p95ExecutionTime = sortedTimes[p95Index] || 0;
    const p99ExecutionTime = sortedTimes[p99Index] || 0;

    // Cache hit rate
    let totalCacheHits = 0;
    this.queryCache.forEach((cached) => {
      totalCacheHits += cached.hits;
    });
    const cacheHitRate = totalCacheHits / (totalQueries + totalCacheHits) || 0;

    // Most frequent queries
    const mostFrequentQueries = Array.from(queryFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({
        query: query.substring(0, 100),
        count,
        avgTime: this.queryStats.get(query)!.times.reduce((a, b) => a + b, 0) / count,
      }));

    // Slowest queries
    const slowestQueries = Array.from(this.queryStats.entries())
      .map(([query, stats]) => ({
        query: query.substring(0, 100),
        maxTime: Math.max(...stats.times),
        count: stats.count,
      }))
      .sort((a, b) => b.maxTime - a.maxTime)
      .slice(0, 10);

    return {
      totalQueries,
      slowQueries,
      averageExecutionTime,
      p95ExecutionTime,
      p99ExecutionTime,
      cacheHitRate,
      mostFrequentQueries,
      slowestQueries,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.queryCache.clear();
    this.logger.info('Query cache cleared');
    this.emit('cache-cleared');
  }

  /**
   * Clear statistics
   */
  clearStatistics(): void {
    this.queryStats.clear();
    this.analysisHistory = [];
    this.logger.info('Query statistics cleared');
  }

  /**
   * Get analysis history
   */
  getAnalysisHistory(limit: number = 100): QueryAnalysis[] {
    return this.analysisHistory.slice(-limit);
  }

  /**
   * Shutdown optimizer
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down QueryOptimizer');
    this.isMonitoring = false;
    this.removeAllListeners();
  }
}

export default QueryOptimizer;
