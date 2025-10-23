/**
 * MCP Tool Performance Benchmarks
 *
 * Tests MCP server tool performance including:
 * - Tool execution times
 * - Data processing speed
 * - Cross-server operations
 * - Resource utilization
 */

import { BenchmarkRunner, BenchmarkSuite } from './benchmark';

/**
 * Mock MCP tool operations
 */
class MockMCPTools {
  private operationDelay: number;

  constructor(operationDelay: number = 5) {
    this.operationDelay = operationDelay;
  }

  // Filesystem operations
  async readFile(path: string): Promise<string> {
    await this.delay();
    return 'file content';
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.delay();
  }

  async listDirectory(path: string): Promise<string[]> {
    await this.delay();
    return ['file1.txt', 'file2.txt', 'dir1'];
  }

  async deleteFile(path: string): Promise<void> {
    await this.delay();
  }

  // SQLite operations
  async executeQuery(sql: string): Promise<any[]> {
    await this.delay();
    return [{ id: 1, data: 'result' }];
  }

  async createTable(name: string, schema: any): Promise<void> {
    await this.delay();
  }

  async insertRecord(table: string, data: any): Promise<number> {
    await this.delay();
    return Date.now();
  }

  // GitHub operations
  async getRepository(owner: string, repo: string): Promise<any> {
    await this.delay();
    return { id: 123, name: repo, owner };
  }

  async listIssues(owner: string, repo: string): Promise<any[]> {
    await this.delay();
    return [{ number: 1, title: 'Issue 1' }];
  }

  async createIssue(owner: string, repo: string, data: any): Promise<any> {
    await this.delay();
    return { number: 2, ...data };
  }

  private async delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.operationDelay));
  }
}

/**
 * MCP benchmark suites
 */
const mcpBenchmarkSuites: BenchmarkSuite[] = [
  {
    name: 'Filesystem MCP Operations',
    tests: [
      {
        name: 'Read file',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          await mcp.readFile('/test/file.txt');
        },
        iterations: 500,
      },
      {
        name: 'Write file',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          await mcp.writeFile('/test/file.txt', 'content');
        },
        iterations: 500,
      },
      {
        name: 'List directory',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          await mcp.listDirectory('/test');
        },
        iterations: 500,
      },
      {
        name: 'Delete file',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          await mcp.deleteFile('/test/file.txt');
        },
        iterations: 500,
      },
      {
        name: 'Bulk file operations',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          for (let i = 0; i < 10; i++) {
            await mcp.writeFile(`/test/file${i}.txt`, `content${i}`);
          }
        },
        iterations: 100,
      },
    ],
  },
  {
    name: 'SQLite MCP Operations',
    tests: [
      {
        name: 'Execute SELECT query',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          await mcp.executeQuery('SELECT * FROM users WHERE id = 1');
        },
        iterations: 500,
      },
      {
        name: 'Execute INSERT query',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          await mcp.insertRecord('users', { name: 'Test', email: 'test@example.com' });
        },
        iterations: 500,
      },
      {
        name: 'Create table',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          await mcp.createTable('test_table', {
            id: 'INTEGER PRIMARY KEY',
            name: 'TEXT',
          });
        },
        iterations: 200,
      },
      {
        name: 'Batch insert operations',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          for (let i = 0; i < 10; i++) {
            await mcp.insertRecord('users', { name: `User${i}` });
          }
        },
        iterations: 100,
      },
      {
        name: 'Complex query execution',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          await mcp.executeQuery(`
            SELECT u.*, COUNT(p.id) as post_count
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            GROUP BY u.id
          `);
        },
        iterations: 200,
      },
    ],
  },
  {
    name: 'GitHub MCP Operations',
    tests: [
      {
        name: 'Get repository',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          await mcp.getRepository('owner', 'repo');
        },
        iterations: 500,
      },
      {
        name: 'List issues',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          await mcp.listIssues('owner', 'repo');
        },
        iterations: 500,
      },
      {
        name: 'Create issue',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          await mcp.createIssue('owner', 'repo', {
            title: 'New issue',
            body: 'Issue description',
          });
        },
        iterations: 200,
      },
      {
        name: 'Batch issue creation',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          for (let i = 0; i < 5; i++) {
            await mcp.createIssue('owner', 'repo', {
              title: `Issue ${i}`,
              body: `Description ${i}`,
            });
          }
        },
        iterations: 50,
      },
    ],
  },
  {
    name: 'Cross-Server Operations',
    tests: [
      {
        name: 'Filesystem to Database',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          const content = await mcp.readFile('/data/users.json');
          await mcp.insertRecord('users', { data: content });
        },
        iterations: 200,
      },
      {
        name: 'Database to Filesystem',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          const data = await mcp.executeQuery('SELECT * FROM users');
          await mcp.writeFile('/export/users.json', JSON.stringify(data));
        },
        iterations: 200,
      },
      {
        name: 'GitHub to Database',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          const issues = await mcp.listIssues('owner', 'repo');
          for (const issue of issues) {
            await mcp.insertRecord('github_issues', issue);
          }
        },
        iterations: 100,
      },
      {
        name: 'Database to GitHub',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          const bugs = await mcp.executeQuery('SELECT * FROM bugs WHERE status = "new"');
          for (const bug of bugs) {
            await mcp.createIssue('owner', 'repo', {
              title: bug.title,
              body: bug.description,
            });
          }
        },
        iterations: 50,
      },
    ],
  },
  {
    name: 'Data Processing',
    tests: [
      {
        name: 'JSON parsing',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          const content = await mcp.readFile('/data/large.json');
          const data = { parsed: true, items: Array.from({ length: 100 }, (_, i) => i) };
          JSON.stringify(data);
        },
        iterations: 500,
      },
      {
        name: 'CSV processing',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          const csv = 'name,email\nJohn,john@example.com\nJane,jane@example.com';
          const lines = csv.split('\n');
          const records = lines.slice(1).map((line) => {
            const [name, email] = line.split(',');
            return { name, email };
          });
        },
        iterations: 500,
      },
      {
        name: 'Data transformation',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          const data = Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: `User${i}`,
            email: `user${i}@example.com`,
          }));
          const transformed = data.map((u) => ({
            user_id: u.id,
            username: u.name.toLowerCase(),
            email_address: u.email,
          }));
        },
        iterations: 500,
      },
    ],
  },
  {
    name: 'Concurrent Operations',
    tests: [
      {
        name: 'Parallel file reads (10)',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          const reads = Array.from({ length: 10 }, (_, i) => mcp.readFile(`/test/file${i}.txt`));
          await Promise.all(reads);
        },
        iterations: 100,
      },
      {
        name: 'Parallel database queries (10)',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          const queries = Array.from({ length: 10 }, () =>
            mcp.executeQuery('SELECT * FROM users LIMIT 10')
          );
          await Promise.all(queries);
        },
        iterations: 100,
      },
      {
        name: 'Mixed parallel operations',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          await Promise.all([
            mcp.readFile('/test/file.txt'),
            mcp.executeQuery('SELECT * FROM users'),
            mcp.getRepository('owner', 'repo'),
            mcp.listDirectory('/test'),
            mcp.listIssues('owner', 'repo'),
          ]);
        },
        iterations: 100,
      },
    ],
  },
  {
    name: 'Error Handling',
    tests: [
      {
        name: 'Handle file not found',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          try {
            await mcp.readFile('/nonexistent/file.txt');
          } catch (error) {
            // Handle error
          }
        },
        iterations: 500,
      },
      {
        name: 'Handle database errors',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          try {
            await mcp.executeQuery('INVALID SQL');
          } catch (error) {
            // Handle error
          }
        },
        iterations: 500,
      },
      {
        name: 'Handle API errors',
        fn: async () => {
          const mcp = new MockMCPTools(2);
          try {
            await mcp.getRepository('nonexistent', 'repo');
          } catch (error) {
            // Handle error
          }
        },
        iterations: 500,
      },
    ],
  },
  {
    name: 'Resource Management',
    tests: [
      {
        name: 'Memory usage - small data',
        fn: async () => {
          const mcp = new MockMCPTools(1);
          const data = Array.from({ length: 100 }, (_, i) => ({ id: i }));
          await mcp.writeFile('/test/small.json', JSON.stringify(data));
        },
        iterations: 500,
      },
      {
        name: 'Memory usage - medium data',
        fn: async () => {
          const mcp = new MockMCPTools(1);
          const data = Array.from({ length: 1000 }, (_, i) => ({ id: i, data: 'x'.repeat(100) }));
          await mcp.writeFile('/test/medium.json', JSON.stringify(data));
        },
        iterations: 200,
      },
      {
        name: 'Memory usage - large data',
        fn: async () => {
          const mcp = new MockMCPTools(1);
          const data = Array.from({ length: 10000 }, (_, i) => ({ id: i, data: 'x'.repeat(100) }));
          await mcp.writeFile('/test/large.json', JSON.stringify(data));
        },
        iterations: 50,
      },
    ],
  },
];

/**
 * Run MCP benchmarks
 */
async function main() {
  console.log('Starting MCP Tool Performance Benchmarks...\n');

  const runner = new BenchmarkRunner();

  for (const suite of mcpBenchmarkSuites) {
    await runner.runSuite(suite);
  }

  runner.printSummary();
  await runner.generateReport();

  console.log('\n✅ MCP benchmarks completed\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ MCP benchmark failed:', error);
    process.exit(1);
  });
}

export { mcpBenchmarkSuites };
