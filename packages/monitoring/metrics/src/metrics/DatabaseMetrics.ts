import { MetricsCollector } from '../MetricsCollector.js';

/**
 * Database-specific metrics collector
 */
export class DatabaseMetrics {
  private collector: MetricsCollector;

  constructor(collector: MetricsCollector) {
    this.collector = collector;
    this.initializeMetrics();
  }

  /**
   * Initialize database metrics
   */
  private initializeMetrics(): void {
    // Query counter
    this.collector.counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labels: ['operation', 'table', 'status'],
    });

    // Query duration histogram
    this.collector.histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labels: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    // Connection pool gauge
    this.collector.gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      labels: ['pool'],
    });

    this.collector.gauge({
      name: 'db_connections_idle',
      help: 'Number of idle database connections',
      labels: ['pool'],
    });

    this.collector.gauge({
      name: 'db_connections_waiting',
      help: 'Number of waiting connection requests',
      labels: ['pool'],
    });

    // Transaction counter
    this.collector.counter({
      name: 'db_transactions_total',
      help: 'Total number of database transactions',
      labels: ['status'],
    });

    // Row counter
    this.collector.counter({
      name: 'db_rows_affected_total',
      help: 'Total number of rows affected by queries',
      labels: ['operation', 'table'],
    });

    // Error counter
    this.collector.counter({
      name: 'db_errors_total',
      help: 'Total number of database errors',
      labels: ['operation', 'error_type'],
    });

    // Deadlock counter
    this.collector.counter({
      name: 'db_deadlocks_total',
      help: 'Total number of database deadlocks',
      labels: ['table'],
    });
  }

  /**
   * Record a database query
   */
  public recordQuery(
    operation: string,
    table: string,
    duration: number,
    status: 'success' | 'error',
    rowsAffected?: number
  ): void {
    this.collector.incrementCounter('db_queries_total', { operation, table, status });
    this.collector.observeHistogram('db_query_duration_seconds', duration, { operation, table });

    if (rowsAffected !== undefined) {
      this.collector.incrementCounter('db_rows_affected_total', { operation, table }, rowsAffected);
    }
  }

  /**
   * Time a database query
   */
  public async timeQuery<T>(operation: string, table: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = (Date.now() - start) / 1000;
      this.recordQuery(operation, table, duration, 'success');
      return result;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      this.recordQuery(operation, table, duration, 'error');
      this.recordError(operation, error instanceof Error ? error.name : 'Unknown');
      throw error;
    }
  }

  /**
   * Update connection pool metrics
   */
  public updateConnectionPool(
    pool: string,
    active: number,
    idle: number,
    waiting: number = 0
  ): void {
    this.collector.setGauge('db_connections_active', active, { pool });
    this.collector.setGauge('db_connections_idle', idle, { pool });
    this.collector.setGauge('db_connections_waiting', waiting, { pool });
  }

  /**
   * Record a transaction
   */
  public recordTransaction(status: 'committed' | 'rolled_back'): void {
    this.collector.incrementCounter('db_transactions_total', { status });
  }

  /**
   * Record a database error
   */
  public recordError(operation: string, errorType: string): void {
    this.collector.incrementCounter('db_errors_total', { operation, error_type: errorType });
  }

  /**
   * Record a deadlock
   */
  public recordDeadlock(table: string): void {
    this.collector.incrementCounter('db_deadlocks_total', { table });
  }
}
