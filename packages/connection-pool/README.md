# @noa/connection-pool

📚 [Master Documentation Index](docs/INDEX.md)


Advanced multi-database connection pooling with health checks, load balancing,
and adaptive sizing.

## Features

- **Multi-Database Support**
  - PostgreSQL with read replicas
  - MongoDB connection pooling
  - MySQL with read replicas
  - Redis connection pooling

- **Advanced Features**
  - Dynamic pool sizing based on load
  - Connection health checking
  - Automatic reconnection
  - Load balancing across replicas
  - Read/write splitting
  - Connection leak detection
  - Connection lifecycle management

- **Monitoring**
  - Real-time pool statistics
  - Connection acquisition latency
  - Active/idle connection tracking
  - Pool saturation alerts

## Installation

```bash
npm install @noa/connection-pool
# or
pnpm add @noa/connection-pool
```

## Quick Start

```typescript
import { ConnectionPoolManager } from '@noa/connection-pool';

const poolManager = new ConnectionPoolManager({
  databases: {
    postgres: {
      enabled: true,
      primary: {
        host: 'primary.postgres.local',
        port: 5432,
        database: 'mydb',
        user: 'postgres',
        password: 'password',
        ssl: false,
      },
      replicas: [
        {
          host: 'replica1.postgres.local',
          port: 5432,
          database: 'mydb',
          user: 'postgres',
          password: 'password',
        },
        {
          host: 'replica2.postgres.local',
          port: 5432,
          database: 'mydb',
          user: 'postgres',
          password: 'password',
        },
      ],
      pool: {
        min: 2,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        statementTimeout: 30000,
      },
    },
    mongodb: {
      enabled: true,
      uri: 'mongodb://localhost:27017/mydb',
      pool: {
        minPoolSize: 2,
        maxPoolSize: 20,
        maxIdleTimeMS: 30000,
        waitQueueTimeoutMS: 5000,
      },
    },
    redis: {
      enabled: true,
      primary: {
        host: 'localhost',
        port: 6379,
        db: 0,
      },
      replicas: [{ host: 'replica1.redis.local', port: 6379, db: 0 }],
    },
  },
  healthCheck: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000,
    retries: 3,
  },
  leakDetection: {
    enabled: true,
    threshold: 30000, // 30 seconds
  },
  adaptivePooling: {
    enabled: true,
    checkInterval: 60000, // 1 minute
    scaleUpThreshold: 0.8, // 80% utilization
    scaleDownThreshold: 0.3, // 30% utilization
  },
});

// PostgreSQL - Write to primary
const client = await poolManager.getPostgresConnection(false);
try {
  await client.query('INSERT INTO users (name) VALUES ($1)', ['John']);
} finally {
  poolManager.releasePostgresConnection(client);
}

// PostgreSQL - Read from replica (load balanced)
const replicaClient = await poolManager.getPostgresConnection(true);
try {
  const result = await replicaClient.query('SELECT * FROM users');
  console.log('Users:', result.rows);
} finally {
  poolManager.releasePostgresConnection(replicaClient);
}

// MongoDB
const db = poolManager.getMongoDatabase('mydb');
const users = await db.collection('users').find({}).toArray();
console.log('MongoDB users:', users);

// Get statistics
const stats = poolManager.getAllStatistics();
for (const [name, stat] of stats.entries()) {
  console.log(`${name}:`, {
    active: stat.active,
    idle: stat.idle,
    total: stat.total,
    peakActive: stat.peakActive,
  });
}

// Health checks
const healthResults = await poolManager.performHealthChecks();
console.log('Health checks:', healthResults);
```

## Configuration

```typescript
interface ConnectionPoolConfig {
  databases: {
    postgres?: {
      enabled: boolean;
      primary?: {
        host: string;
        port: number; // default: 5432
        database: string;
        user: string;
        password: string;
        ssl: boolean; // default: false
      };
      replicas?: Array<{...}>;
      pool: {
        min: number; // default: 2
        max: number; // default: 20
        idleTimeoutMillis: number; // default: 30000
        connectionTimeoutMillis: number; // default: 5000
        statementTimeout: number; // default: 30000
      };
    };
    mongodb?: {
      enabled: boolean;
      uri: string;
      pool: {
        minPoolSize: number; // default: 2
        maxPoolSize: number; // default: 20
        maxIdleTimeMS: number; // default: 30000
        waitQueueTimeoutMS: number; // default: 5000
      };
    };
    mysql?: {
      enabled: boolean;
      primary?: {...};
      replicas?: Array<{...}>;
      pool: {
        connectionLimit: number; // default: 20
        queueLimit: number; // default: 0
        waitForConnections: boolean; // default: true
        connectTimeout: number; // default: 10000
      };
    };
    redis?: {
      enabled: boolean;
      primary?: {
        host: string;
        port: number; // default: 6379
        password?: string;
        db: number; // default: 0
      };
      replicas?: Array<{...}>;
    };
  };
  healthCheck: {
    enabled: boolean; // default: true
    interval: number; // default: 30000ms
    timeout: number; // default: 5000ms
    retries: number; // default: 3
  };
  leakDetection: {
    enabled: boolean; // default: true
    threshold: number; // default: 30000ms
  };
  adaptivePooling: {
    enabled: boolean; // default: true
    checkInterval: number; // default: 60000ms
    scaleUpThreshold: number; // default: 0.8
    scaleDownThreshold: number; // default: 0.3
  };
}
```

## Read/Write Splitting

```typescript
// Automatic read/write splitting
class UserRepository {
  constructor(private poolManager: ConnectionPoolManager) {}

  // Writes go to primary
  async createUser(userData: any) {
    const client = await this.poolManager.getPostgresConnection(false);
    try {
      const result = await client.query(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        [userData.name, userData.email]
      );
      return result.rows[0];
    } finally {
      this.poolManager.releasePostgresConnection(client);
    }
  }

  // Reads from replicas (load balanced)
  async getUsers() {
    const client = await this.poolManager.getPostgresConnection(true);
    try {
      const result = await client.query('SELECT * FROM users');
      return result.rows;
    } finally {
      this.poolManager.releasePostgresConnection(client);
    }
  }

  // Reads requiring consistency go to primary
  async getUserById(id: string) {
    const client = await this.poolManager.getPostgresConnection(false);
    try {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [
        id,
      ]);
      return result.rows[0];
    } finally {
      this.poolManager.releasePostgresConnection(client);
    }
  }
}
```

## Load Balancing

The connection pool manager automatically load balances read requests across
replicas using round-robin:

```typescript
// Request 1: replica1
const client1 = await poolManager.getPostgresConnection(true);

// Request 2: replica2
const client2 = await poolManager.getPostgresConnection(true);

// Request 3: replica1 (round-robin)
const client3 = await poolManager.getPostgresConnection(true);
```

## Health Checks

```typescript
// Perform health check on all databases
const results = await poolManager.performHealthChecks();

for (const result of results) {
  if (result.healthy) {
    console.log(`✓ ${result.database} is healthy (${result.responseTime}ms)`);
  } else {
    console.log(`✗ ${result.database} is unhealthy: ${result.error}`);
    // Send alert
  }
}

// Automatic health checks (configured via healthCheck.interval)
poolManager.on('health-check-completed', (results) => {
  const unhealthy = results.filter((r) => !r.healthy);
  if (unhealthy.length > 0) {
    console.log('Unhealthy databases:', unhealthy);
  }
});
```

## Connection Leak Detection

```typescript
poolManager.on('connection-leak', ({ connId, poolName }) => {
  console.log(`Connection leak detected: ${connId} in ${poolName}`);

  // Send alert
  alerting.send({
    level: 'warning',
    message: `Connection leak detected in ${poolName}`,
    connection: connId,
  });
});

// Connections held longer than threshold (30s default) are flagged as leaks
```

## Adaptive Pool Sizing

The pool manager automatically adjusts pool sizes based on utilization:

```typescript
poolManager.on('scale-up-recommended', ({ pool, utilization, stats }) => {
  console.log(`Pool ${pool} at ${(utilization * 100).toFixed(2)}% utilization`);
  console.log('Consider scaling up:', stats);

  // Automatically increase pool size (or alert ops team)
});

poolManager.on('scale-down-recommended', ({ pool, utilization, stats }) => {
  console.log(`Pool ${pool} at ${(utilization * 100).toFixed(2)}% utilization`);
  console.log('Consider scaling down:', stats);
});
```

## Statistics and Monitoring

```typescript
// Get all pool statistics
const allStats = poolManager.getAllStatistics();

for (const [name, stats] of allStats.entries()) {
  console.log(`Pool: ${name}`);
  console.log('  Type:', stats.type);
  console.log('  Total connections:', stats.total);
  console.log('  Active:', stats.active);
  console.log('  Idle:', stats.idle);
  console.log('  Peak active:', stats.peakActive);
  console.log('  Created:', stats.created);
  console.log('  Destroyed:', stats.destroyed);
  console.log('  Errors:', stats.errors);
  console.log('  Leaks:', stats.leaks);
  console.log('  Avg acquisition time:', stats.averageAcquisitionTime, 'ms');
  console.log('  Avg hold time:', stats.averageHoldTime, 'ms');
}

// Get specific pool statistics
const pgStats = poolManager.getStatistics('postgres-primary');
if (pgStats) {
  console.log('PostgreSQL primary stats:', pgStats);
}
```

## Metrics Export (Prometheus)

```typescript
import { register } from 'prom-client';

// Export metrics for Prometheus
app.get('/metrics', async (req, res) => {
  const stats = poolManager.getAllStatistics();

  // Update Prometheus metrics
  for (const [name, stat] of stats.entries()) {
    poolActiveConnections.set({ pool: name }, stat.active);
    poolIdleConnections.set({ pool: name }, stat.idle);
    poolTotalConnections.set({ pool: name }, stat.total);
    poolAcquisitionTime.set({ pool: name }, stat.averageAcquisitionTime);
  }

  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Best Practices

1. **Set Appropriate Pool Sizes**
   - Min: 2-5 connections for most applications
   - Max: CPU cores \* 2-4 for CPU-bound
   - Max: Higher for I/O-bound operations
   - Monitor and adjust based on metrics

2. **Use Read Replicas**
   - Route read queries to replicas
   - Keep primary for writes and consistent reads
   - Monitor replication lag

3. **Handle Connection Errors**
   - Always release connections in finally blocks
   - Implement retry logic for transient errors
   - Monitor connection errors and alerts

4. **Monitor Pool Health**
   - Track active/idle ratios
   - Monitor acquisition latency
   - Alert on connection leaks
   - Review peak active connections

5. **Optimize Connection Lifecycle**
   - Set appropriate idle timeouts
   - Configure statement timeouts
   - Use connection health checks
   - Implement graceful shutdown

## Connection Patterns

### Transaction Pattern

```typescript
async function transferMoney(fromId: string, toId: string, amount: number) {
  const client = await poolManager.getPostgresConnection(false);

  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromId]
    );

    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    poolManager.releasePostgresConnection(client);
  }
}
```

### Batch Operations

```typescript
async function batchInsert(records: any[]) {
  const client = await poolManager.getPostgresConnection(false);

  try {
    await client.query('BEGIN');

    for (const record of records) {
      await client.query('INSERT INTO records (data) VALUES ($1)', [record]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    poolManager.releasePostgresConnection(client);
  }
}
```

## Troubleshooting

### Pool Exhaustion

- Increase max pool size
- Check for connection leaks
- Review long-running queries
- Implement connection timeouts

### High Acquisition Latency

- Increase pool size
- Optimize query performance
- Check database performance
- Review connection limits

### Connection Leaks

- Enable leak detection
- Review connection release logic
- Use try/finally blocks consistently
- Monitor leak events

### Replica Lag

- Monitor replication lag
- Route time-sensitive reads to primary
- Adjust application logic for eventual consistency

## License

MIT

> Last updated: 2025-11-20
