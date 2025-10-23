/**
 * API Performance Benchmarks
 *
 * Tests API endpoint performance including:
 * - Request throughput
 * - Response times
 * - Concurrent requests
 * - Payload sizes
 */

import { BenchmarkRunner, BenchmarkSuite } from './benchmark';

/**
 * Mock HTTP client for benchmarking
 */
class MockAPIClient {
  private latency: number;

  constructor(latency: number = 10) {
    this.latency = latency;
  }

  async get(path: string): Promise<any> {
    await this.simulateNetworkLatency();
    return { status: 200, data: { path } };
  }

  async post(path: string, data: any): Promise<any> {
    await this.simulateNetworkLatency();
    return { status: 201, data: { path, ...data } };
  }

  async put(path: string, data: any): Promise<any> {
    await this.simulateNetworkLatency();
    return { status: 200, data: { path, ...data } };
  }

  async delete(path: string): Promise<any> {
    await this.simulateNetworkLatency();
    return { status: 204, data: null };
  }

  private async simulateNetworkLatency(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.latency));
  }
}

/**
 * API benchmark suites
 */
const apiBenchmarkSuites: BenchmarkSuite[] = [
  {
    name: 'Basic HTTP Operations',
    tests: [
      {
        name: 'GET request',
        fn: async () => {
          const client = new MockAPIClient(1);
          await client.get('/api/users');
        },
        iterations: 1000,
      },
      {
        name: 'POST request',
        fn: async () => {
          const client = new MockAPIClient(1);
          await client.post('/api/users', { name: 'Test', email: 'test@example.com' });
        },
        iterations: 1000,
      },
      {
        name: 'PUT request',
        fn: async () => {
          const client = new MockAPIClient(1);
          await client.put('/api/users/1', { name: 'Updated' });
        },
        iterations: 1000,
      },
      {
        name: 'DELETE request',
        fn: async () => {
          const client = new MockAPIClient(1);
          await client.delete('/api/users/1');
        },
        iterations: 1000,
      },
    ],
  },
  {
    name: 'Payload Sizes',
    tests: [
      {
        name: 'Small payload (1KB)',
        fn: async () => {
          const client = new MockAPIClient(1);
          const data = { content: 'x'.repeat(1024) };
          await client.post('/api/data', data);
        },
        iterations: 500,
      },
      {
        name: 'Medium payload (10KB)',
        fn: async () => {
          const client = new MockAPIClient(1);
          const data = { content: 'x'.repeat(10 * 1024) };
          await client.post('/api/data', data);
        },
        iterations: 500,
      },
      {
        name: 'Large payload (100KB)',
        fn: async () => {
          const client = new MockAPIClient(1);
          const data = { content: 'x'.repeat(100 * 1024) };
          await client.post('/api/data', data);
        },
        iterations: 100,
      },
    ],
  },
  {
    name: 'Concurrent Requests',
    tests: [
      {
        name: 'Sequential requests',
        fn: async () => {
          const client = new MockAPIClient(1);
          for (let i = 0; i < 10; i++) {
            await client.get('/api/users');
          }
        },
        iterations: 100,
      },
      {
        name: 'Parallel requests (10)',
        fn: async () => {
          const client = new MockAPIClient(1);
          const requests = Array.from({ length: 10 }, () => client.get('/api/users'));
          await Promise.all(requests);
        },
        iterations: 100,
      },
      {
        name: 'Parallel requests (50)',
        fn: async () => {
          const client = new MockAPIClient(1);
          const requests = Array.from({ length: 50 }, () => client.get('/api/users'));
          await Promise.all(requests);
        },
        iterations: 50,
      },
    ],
  },
  {
    name: 'Response Processing',
    tests: [
      {
        name: 'JSON parsing',
        fn: async () => {
          const client = new MockAPIClient(1);
          const response = await client.get('/api/users');
          JSON.stringify(response.data);
        },
        iterations: 1000,
      },
      {
        name: 'Array processing',
        fn: async () => {
          const client = new MockAPIClient(1);
          const users = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `User${i}` }));
          users.map((u) => ({ ...u, processed: true }));
        },
        iterations: 1000,
      },
      {
        name: 'Data filtering',
        fn: async () => {
          const client = new MockAPIClient(1);
          const users = Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: `User${i}`,
            active: i % 2 === 0,
          }));
          users.filter((u) => u.active);
        },
        iterations: 1000,
      },
    ],
  },
  {
    name: 'CRUD Operations',
    tests: [
      {
        name: 'Create user',
        fn: async () => {
          const client = new MockAPIClient(1);
          await client.post('/api/users', {
            name: 'Test User',
            email: 'test@example.com',
            role: 'user',
          });
        },
        iterations: 500,
      },
      {
        name: 'Read user',
        fn: async () => {
          const client = new MockAPIClient(1);
          await client.get('/api/users/1');
        },
        iterations: 1000,
      },
      {
        name: 'Update user',
        fn: async () => {
          const client = new MockAPIClient(1);
          await client.put('/api/users/1', {
            name: 'Updated User',
            email: 'updated@example.com',
          });
        },
        iterations: 500,
      },
      {
        name: 'Delete user',
        fn: async () => {
          const client = new MockAPIClient(1);
          await client.delete('/api/users/1');
        },
        iterations: 500,
      },
      {
        name: 'List users',
        fn: async () => {
          const client = new MockAPIClient(1);
          await client.get('/api/users?page=1&limit=20');
        },
        iterations: 500,
      },
    ],
  },
  {
    name: 'Complex Operations',
    tests: [
      {
        name: 'Nested resource access',
        fn: async () => {
          const client = new MockAPIClient(1);
          await client.get('/api/users/1/posts/5/comments');
        },
        iterations: 500,
      },
      {
        name: 'Batch operations',
        fn: async () => {
          const client = new MockAPIClient(1);
          const users = Array.from({ length: 10 }, (_, i) => ({
            name: `User${i}`,
            email: `user${i}@example.com`,
          }));
          await client.post('/api/users/batch', users);
        },
        iterations: 200,
      },
      {
        name: 'Search with filters',
        fn: async () => {
          const client = new MockAPIClient(1);
          await client.get('/api/users?search=john&role=admin&active=true&sort=created_at');
        },
        iterations: 500,
      },
    ],
  },
  {
    name: 'Error Handling',
    tests: [
      {
        name: 'Handle 404 response',
        fn: async () => {
          const client = new MockAPIClient(1);
          try {
            await client.get('/api/users/999999');
          } catch (error) {
            // Handle error
          }
        },
        iterations: 500,
      },
      {
        name: 'Handle validation errors',
        fn: async () => {
          const client = new MockAPIClient(1);
          try {
            await client.post('/api/users', { invalid: 'data' });
          } catch (error) {
            // Handle error
          }
        },
        iterations: 500,
      },
    ],
  },
];

/**
 * Run API benchmarks
 */
async function main() {
  console.log('Starting API Performance Benchmarks...\n');

  const runner = new BenchmarkRunner();

  for (const suite of apiBenchmarkSuites) {
    await runner.runSuite(suite);
  }

  runner.printSummary();
  await runner.generateReport();

  console.log('\n✅ API benchmarks completed\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ API benchmark failed:', error);
    process.exit(1);
  });
}

export { apiBenchmarkSuites };
