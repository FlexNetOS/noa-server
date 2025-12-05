# @noa/database-optimizer

📚 [Master Documentation Index](docs/INDEX.md)


Comprehensive database optimization and query analysis system for PostgreSQL,
MongoDB, and MySQL.

## Features

- **Query Optimization**
  - Analyze query execution plans (EXPLAIN ANALYZE)
  - Identify slow queries (>100ms threshold)
  - Suggest index improvements
  - Detect N+1 query problems
  - Query result caching recommendations
  - Batch query optimization
  - Connection usage analysis

- **Index Management**
  - Automatic index creation based on query patterns
  - Index usage statistics tracking
  - Identify unused indexes
  - Composite index recommendations
  - Partial index suggestions
  - Index maintenance scheduling
  - Index bloat detection and repair

- **Monitoring**
  - Real-time query performance tracking
  - Connection pool monitoring
  - Lock detection and analysis
  - Deadlock prevention
  - Table bloat detection
  - Vacuum scheduling (PostgreSQL)

## Installation

```bash
npm install @noa/database-optimizer
# or
pnpm add @noa/database-optimizer
```

## Quick Start

```typescript
import { QueryOptimizer, IndexManager } from '@noa/database-optimizer';
import { Pool } from 'pg';

// Initialize PostgreSQL pool
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'postgres',
  password: 'password',
});

// Create query optimizer
const optimizer = new QueryOptimizer({
  slowQueryThreshold: 100, // milliseconds
  enableAutoIndexing: false,
  enableQueryCache: true,
  cacheTTL: 300, // seconds
  databases: {
    postgres: {
      enabled: true,
      pool: pool,
    },
  },
  logging: {
    level: 'info',
    format: 'json',
  },
});

// Create index manager
const indexManager = new IndexManager(pool, {
  enableAutoCreation: false,
  minQueryCount: 100,
  unusedIndexThreshold: 30, // days
  maintenanceSchedule: '0 2 * * 0', // Weekly at 2 AM
  enableBloatDetection: true,
});

// Analyze a query
const analysis = await optimizer.analyzePostgresQuery(
  'SELECT * FROM users WHERE email = $1',
  ['user@example.com']
);

console.log('Execution time:', analysis.executionTime, 'ms');
console.log('Recommendations:', analysis.recommendations);
console.log('Suggested indexes:', analysis.suggestedIndexes);

// Execute optimized query (with caching)
const result = await optimizer.executeOptimized(
  'SELECT * FROM users WHERE email = $1',
  ['user@example.com']
);

// Get query statistics
const stats = optimizer.getStatistics();
console.log('Cache hit rate:', (stats.cacheHitRate * 100).toFixed(2) + '%');
console.log('Average execution time:', stats.averageExecutionTime, 'ms');
console.log('P95 execution time:', stats.p95ExecutionTime, 'ms');

// Index management
const indexes = await indexManager.getAllIndexes();
console.log('Total indexes:', indexes.length);

const unusedIndexes = await indexManager.getUnusedIndexes();
console.log('Unused indexes:', unusedIndexes.length);

const recommendations = await indexManager.generateRecommendations();
console.log('Index recommendations:', recommendations.length);

// Auto-create recommended index
if (recommendations.length > 0 && recommendations[0].priority === 'high') {
  await indexManager.createIndex(recommendations[0], true); // concurrent
}

// Perform maintenance
const maintenanceReport = await indexManager.performMaintenance();
console.log('Maintenance completed:', maintenanceReport);
```

## Configuration

### QueryOptimizer Options

```typescript
interface QueryOptimizerConfig {
  slowQueryThreshold: number; // default: 100ms
  enableAutoIndexing: boolean; // default: false
  enableQueryCache: boolean; // default: true
  cacheTTL: number; // default: 300 seconds
  maxCacheSize: number; // default: 1000 entries
  enableExplainAnalyze: boolean; // default: true
  databases: {
    postgres?: {
      enabled: boolean;
      pool: Pool;
    };
    mongodb?: {
      enabled: boolean;
      client: MongoClient;
    };
  };
  redis?: Redis; // for distributed caching
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'simple';
  };
}
```

### IndexManager Options

```typescript
interface IndexManagerConfig {
  enableAutoCreation: boolean; // default: false
  minQueryCount: number; // default: 100
  unusedIndexThreshold: number; // default: 30 days
  maintenanceSchedule: string; // cron format
  maxIndexesPerTable: number; // default: 10
  enableBloatDetection: boolean; // default: true
  bloatThreshold: number; // default: 30%
}
```

## Events

### QueryOptimizer Events

```typescript
optimizer.on('slow-query', (analysis) => {
  console.log('Slow query detected:', analysis.query);
});

optimizer.on('n-plus-one', (analysis) => {
  console.log('N+1 query detected:', analysis.query);
});

optimizer.on('cache-hit', ({ query, cacheKey }) => {
  console.log('Cache hit:', cacheKey);
});

optimizer.on('cache-miss', ({ key }) => {
  console.log('Cache miss:', key);
});
```

### IndexManager Events

```typescript
indexManager.on('index-created', (recommendation) => {
  console.log('Index created:', recommendation.createStatement);
});

indexManager.on('index-dropped', (indexName) => {
  console.log('Index dropped:', indexName);
});

indexManager.on('maintenance-completed', (report) => {
  console.log('Maintenance completed:', report);
});
```

## Query Analysis

### Execution Plan Analysis

The optimizer analyzes PostgreSQL `EXPLAIN ANALYZE` output to provide:

- Sequential scan detection on large tables
- Nested loop join identification
- Planning time vs execution time ratio
- Buffer cache hit rate
- Index usage patterns

### Recommendations

Recommendations include:

1. **Index Recommendations**
   - Priority: low, medium, high, critical
   - Estimated improvement: percentage
   - Implementation cost: low, medium, high
   - CREATE INDEX statement

2. **Query Rewrite Suggestions**
   - Join optimization
   - WHERE clause improvements
   - Subquery optimization

3. **Caching Recommendations**
   - Cacheable queries
   - Optimal TTL
   - Invalidation strategy

## Index Management

### Automatic Index Detection

The IndexManager detects:

- Missing indexes on frequently queried columns
- Unused indexes (low scan count)
- Bloated indexes (> threshold percentage)
- Duplicate indexes
- Redundant indexes

### Index Types Supported

- **B-Tree**: Default, good for most queries
- **Hash**: Equality comparisons only
- **GiST**: Geometric data types
- **GIN**: Full-text search, arrays
- **BRIN**: Very large tables with natural ordering

### Composite Indexes

The system recommends composite indexes for:

- Multiple column WHERE clauses
- JOIN conditions
- ORDER BY clauses

### Partial Indexes

Recommends partial indexes for:

- Common WHERE conditions (e.g., status = 'active')
- Date ranges
- Boolean flags

## Performance Metrics

### Query Statistics

```typescript
interface QueryStatistics {
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
```

### Index Statistics

```typescript
interface IndexUsageStats {
  indexName: string;
  tableName: string;
  totalScans: number;
  tuplesRead: number;
  tuplesReturned: number;
  indexSize: string;
  lastUsed: Date | null;
  usageRatio: number;
  recommendation: 'keep' | 'monitor' | 'consider-dropping' | 'drop';
}
```

## Best Practices

1. **Start with Analysis**
   - Run query optimizer on production workload
   - Identify top slow queries
   - Review recommendations before implementing

2. **Test Index Changes**
   - Create indexes on staging environment first
   - Use `CONCURRENTLY` to avoid locking
   - Monitor query performance after changes

3. **Regular Maintenance**
   - Schedule weekly maintenance jobs
   - Monitor index bloat
   - Vacuum tables regularly
   - Update statistics

4. **Cache Strategy**
   - Cache frequently accessed, rarely changed data
   - Set appropriate TTLs
   - Implement cache invalidation on writes

5. **Monitor Performance**
   - Track cache hit rates
   - Monitor slow query count
   - Set up alerts for performance degradation

## Troubleshooting

### High Memory Usage

- Reduce `maxCacheSize`
- Decrease `cacheTTL`
- Implement cache eviction policies

### Slow Index Creation

- Use `CREATE INDEX CONCURRENTLY`
- Schedule during low-traffic periods
- Monitor table locks

### N+1 Query Problems

- Use JOINs instead of loops
- Implement batch loading
- Use query result caching

## API Reference

See [API Documentation](./docs/api.md) for detailed API reference.

## License

MIT

## Support

- GitHub Issues: https://github.com/noa-server/database-optimizer/issues
- Documentation: https://docs.noa-server.com/database-optimizer

> Last updated: 2025-11-20
