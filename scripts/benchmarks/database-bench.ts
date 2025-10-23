/**
 * Database Performance Benchmarks
 *
 * Tests database performance including:
 * - Query execution times
 * - Transaction performance
 * - Connection pooling
 * - Index efficiency
 */

import { BenchmarkRunner, BenchmarkSuite } from './benchmark';

/**
 * Mock database client for benchmarking
 */
class MockDatabaseClient {
  private queryDelay: number;

  constructor(queryDelay: number = 2) {
    this.queryDelay = queryDelay;
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    await this.simulateQueryExecution();
    return [{ id: 1, data: 'mock' }];
  }

  async insert(table: string, data: any): Promise<any> {
    await this.simulateQueryExecution();
    return { id: Date.now(), ...data };
  }

  async update(table: string, id: number, data: any): Promise<any> {
    await this.simulateQueryExecution();
    return { id, ...data };
  }

  async delete(table: string, id: number): Promise<void> {
    await this.simulateQueryExecution();
  }

  async transaction(fn: () => Promise<void>): Promise<void> {
    await this.simulateQueryExecution();
    await fn();
    await this.simulateQueryExecution();
  }

  private async simulateQueryExecution(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.queryDelay));
  }
}

/**
 * Database benchmark suites
 */
const databaseBenchmarkSuites: BenchmarkSuite[] = [
  {
    name: 'Basic Query Operations',
    tests: [
      {
        name: 'Simple SELECT query',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query('SELECT * FROM users WHERE id = ?', [1]);
        },
        iterations: 1000,
      },
      {
        name: 'SELECT with JOIN',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query(
            `
            SELECT u.*, p.title
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            WHERE u.id = ?
          `,
            [1]
          );
        },
        iterations: 500,
      },
      {
        name: 'SELECT with multiple WHERE clauses',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query(
            `
            SELECT * FROM users
            WHERE active = ? AND role = ? AND created_at > ?
          `,
            [true, 'admin', '2025-01-01']
          );
        },
        iterations: 500,
      },
      {
        name: 'SELECT with ORDER BY and LIMIT',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query(`
            SELECT * FROM users
            ORDER BY created_at DESC
            LIMIT 10
          `);
        },
        iterations: 500,
      },
    ],
  },
  {
    name: 'Insert Operations',
    tests: [
      {
        name: 'Single INSERT',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.insert('users', {
            name: 'Test User',
            email: 'test@example.com',
          });
        },
        iterations: 500,
      },
      {
        name: 'Batch INSERT (10 records)',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          const records = Array.from({ length: 10 }, (_, i) => ({
            name: `User${i}`,
            email: `user${i}@example.com`,
          }));

          for (const record of records) {
            await db.insert('users', record);
          }
        },
        iterations: 100,
      },
      {
        name: 'Batch INSERT (100 records)',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          const records = Array.from({ length: 100 }, (_, i) => ({
            name: `User${i}`,
            email: `user${i}@example.com`,
          }));

          for (const record of records) {
            await db.insert('users', record);
          }
        },
        iterations: 10,
      },
    ],
  },
  {
    name: 'Update Operations',
    tests: [
      {
        name: 'Single UPDATE',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.update('users', 1, { name: 'Updated Name' });
        },
        iterations: 500,
      },
      {
        name: 'Bulk UPDATE (10 records)',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          for (let i = 1; i <= 10; i++) {
            await db.update('users', i, { updated_at: new Date().toISOString() });
          }
        },
        iterations: 100,
      },
      {
        name: 'UPDATE with complex WHERE',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query(
            `
            UPDATE users
            SET last_login = ?
            WHERE active = ? AND role = ?
          `,
            [new Date().toISOString(), true, 'user']
          );
        },
        iterations: 500,
      },
    ],
  },
  {
    name: 'Delete Operations',
    tests: [
      {
        name: 'Single DELETE',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.delete('users', 1);
        },
        iterations: 500,
      },
      {
        name: 'Bulk DELETE (10 records)',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          for (let i = 1; i <= 10; i++) {
            await db.delete('users', i);
          }
        },
        iterations: 100,
      },
      {
        name: 'DELETE with WHERE clause',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query('DELETE FROM users WHERE created_at < ?', ['2024-01-01']);
        },
        iterations: 500,
      },
    ],
  },
  {
    name: 'Transaction Performance',
    tests: [
      {
        name: 'Simple transaction',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.transaction(async () => {
            await db.insert('users', { name: 'User1', email: 'user1@example.com' });
          });
        },
        iterations: 200,
      },
      {
        name: 'Transaction with multiple operations',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.transaction(async () => {
            await db.insert('users', { name: 'User1', email: 'user1@example.com' });
            await db.insert('posts', { user_id: 1, title: 'Post 1' });
            await db.update('users', 1, { post_count: 1 });
          });
        },
        iterations: 100,
      },
      {
        name: 'Nested transactions',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.transaction(async () => {
            await db.insert('users', { name: 'User1', email: 'user1@example.com' });
            await db.transaction(async () => {
              await db.insert('posts', { user_id: 1, title: 'Post 1' });
            });
          });
        },
        iterations: 100,
      },
    ],
  },
  {
    name: 'Complex Queries',
    tests: [
      {
        name: 'Aggregation query',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query(`
            SELECT
              COUNT(*) as total,
              AVG(age) as avg_age,
              MIN(created_at) as first_user,
              MAX(created_at) as last_user
            FROM users
          `);
        },
        iterations: 500,
      },
      {
        name: 'GROUP BY query',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query(`
            SELECT role, COUNT(*) as count
            FROM users
            GROUP BY role
            HAVING count > 10
          `);
        },
        iterations: 500,
      },
      {
        name: 'Subquery',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query(`
            SELECT * FROM users
            WHERE id IN (
              SELECT user_id FROM posts
              WHERE published = true
              GROUP BY user_id
              HAVING COUNT(*) > 5
            )
          `);
        },
        iterations: 200,
      },
      {
        name: 'Multiple JOINs',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query(`
            SELECT
              u.name,
              p.title,
              c.content
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            LEFT JOIN comments c ON p.id = c.post_id
            WHERE u.active = true
          `);
        },
        iterations: 200,
      },
    ],
  },
  {
    name: 'Index Performance',
    tests: [
      {
        name: 'Query with indexed column',
        fn: async () => {
          const db = new MockDatabaseClient(0.5);
          await db.query('SELECT * FROM users WHERE email = ?', ['test@example.com']);
        },
        iterations: 1000,
      },
      {
        name: 'Query without index',
        fn: async () => {
          const db = new MockDatabaseClient(2);
          await db.query('SELECT * FROM users WHERE description LIKE ?', ['%test%']);
        },
        iterations: 500,
      },
      {
        name: 'Composite index query',
        fn: async () => {
          const db = new MockDatabaseClient(0.5);
          await db.query('SELECT * FROM users WHERE role = ? AND active = ?', ['admin', true]);
        },
        iterations: 1000,
      },
    ],
  },
  {
    name: 'Data Volume Tests',
    tests: [
      {
        name: 'Query 100 records',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query('SELECT * FROM users LIMIT 100');
        },
        iterations: 200,
      },
      {
        name: 'Query 1000 records',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query('SELECT * FROM users LIMIT 1000');
        },
        iterations: 100,
      },
      {
        name: 'Query 10000 records',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query('SELECT * FROM users LIMIT 10000');
        },
        iterations: 50,
      },
    ],
  },
  {
    name: 'Connection Management',
    tests: [
      {
        name: 'Single connection query',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query('SELECT 1');
        },
        iterations: 1000,
      },
      {
        name: 'Sequential connections',
        fn: async () => {
          for (let i = 0; i < 10; i++) {
            const db = new MockDatabaseClient(1);
            await db.query('SELECT 1');
          }
        },
        iterations: 100,
      },
      {
        name: 'Parallel connections (10)',
        fn: async () => {
          const queries = Array.from({ length: 10 }, async () => {
            const db = new MockDatabaseClient(1);
            return db.query('SELECT 1');
          });
          await Promise.all(queries);
        },
        iterations: 100,
      },
    ],
  },
  {
    name: 'Full-Text Search',
    tests: [
      {
        name: 'Simple LIKE query',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query('SELECT * FROM posts WHERE content LIKE ?', ['%search%']);
        },
        iterations: 500,
      },
      {
        name: 'Multi-column search',
        fn: async () => {
          const db = new MockDatabaseClient(1);
          await db.query(
            `
            SELECT * FROM posts
            WHERE title LIKE ? OR content LIKE ?
          `,
            ['%keyword%', '%keyword%']
          );
        },
        iterations: 200,
      },
    ],
  },
];

/**
 * Run database benchmarks
 */
async function main() {
  console.log('Starting Database Performance Benchmarks...\n');

  const runner = new BenchmarkRunner();

  for (const suite of databaseBenchmarkSuites) {
    await runner.runSuite(suite);
  }

  runner.printSummary();
  await runner.generateReport();

  console.log('\n✅ Database benchmarks completed\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Database benchmark failed:', error);
    process.exit(1);
  });
}

export { databaseBenchmarkSuites };
