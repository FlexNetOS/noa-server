#!/usr/bin/env node
/**
 * Noa Server Initialization Test Suite
 * Version: 1.0.0
 * Generated: 2025-10-22
 *
 * Comprehensive test suite for the initialization system
 * covering unit tests, integration tests, and end-to-end tests
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const http = require('http');

// =============================================================================
// TEST FRAMEWORK
// =============================================================================

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
    };
    this.startTime = null;
    this.endTime = null;
  }

  addTest(name, testFn, options = {}) {
    this.tests.push({
      name,
      fn: testFn,
      options: { timeout: 30000, ...options },
    });
  }

  async run() {
    console.log('🚀 Starting Noa Server Initialization Test Suite\n');

    this.startTime = Date.now();
    this.results.total = this.tests.length;

    for (const test of this.tests) {
      try {
        console.log(`Running: ${test.name}`);
        await this.runTest(test);
      } catch (error) {
        await this.recordFailure(test.name, error);
      }
    }

    this.endTime = Date.now();
    this.printResults();
  }

  async runTest(test) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test timeout')), test.options.timeout);
    });

    try {
      await Promise.race([test.fn(), timeoutPromise]);
      await this.recordSuccess(test.name);
    } catch (error) {
      await this.recordFailure(test.name, error);
    }
  }

  async recordSuccess(name) {
    console.log(`✅ ${name}`);
    this.results.passed++;
  }

  async recordFailure(name, error) {
    console.log(`❌ ${name}: ${error.message}`);
    this.results.failed++;
  }

  printResults() {
    const duration = this.endTime - this.startTime;
    const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);

    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Skipped: ${this.results.skipped}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Duration: ${duration}ms`);
    console.log('='.repeat(50));

    if (this.results.failed > 0) {
      console.log('\n❌ Some tests failed. Check logs for details.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
    }
  }
}

// =============================================================================
// TEST UTILITIES
// =============================================================================

class TestUtils {
  static async createTempDir(prefix = 'noa-test-') {
    const tempDir = path.join(require('os').tmpdir(), prefix + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  static async cleanupTempDir(dir) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  static async waitForPort(port, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkPort = () => {
        const client = http.get(`http://localhost:${port}/health`, (res) => {
          if (res.statusCode === 200) {
            resolve(true);
          } else {
            checkAgain();
          }
        });

        client.on('error', () => checkAgain());
      };

      const checkAgain = () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Port ${port} not available within ${timeout}ms`));
        } else {
          setTimeout(checkPort, 500);
        }
      };

      checkPort();
    });
  }

  static async killProcessOnPort(port) {
    try {
      const result = execSync(`lsof -ti:${port}`, { encoding: 'utf8' });
      const pids = result.trim().split('\n').filter(Boolean);

      for (const pid of pids) {
        try {
          process.kill(parseInt(pid), 'SIGTERM');
        } catch (error) {
          // Process might already be dead
        }
      }

      // Wait a bit for process to die
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      // No process on port
    }
  }

  static async mockService(port, response = { status: 'ok' }) {
    return new Promise((resolve) => {
      const server = http.createServer((req, res) => {
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      server.listen(port, () => {
        resolve({
          server,
          close: () => new Promise((resolve) => server.close(resolve)),
        });
      });
    });
  }
}

// =============================================================================
// UNIT TESTS
// =============================================================================

class UnitTests {
  static run(runner) {
    // Logger tests
    runner.addTest('Logger - Info logging', async () => {
      const { Logger } = require('./init-controller');
      const tempDir = await TestUtils.createTempDir();
      const logFile = path.join(tempDir, 'test.log');
      const logger = new Logger(logFile);

      await logger.info('Test message');
      const logContent = await fs.readFile(logFile, 'utf8');
      if (!logContent.includes('[INFO]') || !logContent.includes('Test message')) {
        throw new Error('Log message not written correctly');
      }

      await TestUtils.cleanupTempDir(tempDir);
    });

    // Configuration Manager tests
    runner.addTest('ConfigurationManager - Singleton pattern', async () => {
      const { ConfigurationManager } = require('./init-controller');

      const config1 = new ConfigurationManager();
      const config2 = new ConfigurationManager();

      if (config1 !== config2) {
        throw new Error('ConfigurationManager is not a singleton');
      }
    });

    // State Tracker tests
    runner.addTest('StateTracker - Singleton pattern', async () => {
      const { StateTracker } = require('./init-controller');

      const tracker1 = new StateTracker();
      const tracker2 = new StateTracker();

      if (tracker1 !== tracker2) {
        throw new Error('StateTracker is not a singleton');
      }
    });

    // Strategy pattern tests
    runner.addTest('Strategy Pattern - Standard strategy', async () => {
      const { StandardInitializationStrategy, Logger } = require('./init-controller');

      const tempDir = await TestUtils.createTempDir();
      const logFile = path.join(tempDir, 'test.log');
      const logger = new Logger(logFile);
      const strategy = new StandardInitializationStrategy(logger);

      const result = await strategy.execute({});
      if (result !== true) {
        throw new Error('Standard strategy did not return true');
      }

      await TestUtils.cleanupTempDir(tempDir);
    });

    // Builder pattern tests
    runner.addTest('Builder Pattern - Initialization builder', async () => {
      const {
        InitializationBuilder,
        StandardInitializationStrategy,
        Logger,
      } = require('./init-controller');

      const tempDir = await TestUtils.createTempDir();
      const logFile = path.join(tempDir, 'test.log');
      const logger = new Logger(logFile);

      const controller = await new InitializationBuilder()
        .setStrategy(new StandardInitializationStrategy(logger))
        .setLogger(logger)
        .build();

      if (!controller) {
        throw new Error('Builder did not create controller');
      }

      await TestUtils.cleanupTempDir(tempDir);
    });

    // Factory pattern tests
    runner.addTest('Factory Pattern - Initializer factory', async () => {
      const { InitializerFactory, Logger } = require('./init-controller');

      const tempDir = await TestUtils.createTempDir();
      const logFile = path.join(tempDir, 'test.log');
      const logger = new Logger(logFile);

      const initializer = InitializerFactory.createInitializer('environment', {}, logger);
      if (!initializer) {
        throw new Error('Factory did not create initializer');
      }

      await TestUtils.cleanupTempDir(tempDir);
    });
  }
}

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

class IntegrationTests {
  static run(runner) {
    // Phase Manager integration
    runner.addTest('PhaseManager - Phase execution', async () => {
      const { PhaseManager, Logger } = require('./init-controller');

      const tempDir = await TestUtils.createTempDir();
      const logFile = path.join(tempDir, 'test.log');
      const logger = new Logger(logFile);

      const phases = [
        {
          name: 'test-phase',
          execute: async () => true,
        },
      ];

      const phaseManager = new PhaseManager(phases, logger);
      const result = await phaseManager.executePhase('test-phase', {});

      if (result !== true) {
        throw new Error('Phase execution failed');
      }

      await TestUtils.cleanupTempDir(tempDir);
    });

    // Controller integration
    runner.addTest('InitializationController - Full initialization', async () => {
      const {
        InitializationController,
        InitializationBuilder,
        StandardInitializationStrategy,
        Logger,
      } = require('./init-controller');

      const tempDir = await TestUtils.createTempDir();
      const logFile = path.join(tempDir, 'test.log');
      const logger = new Logger(logFile);

      const controller = await new InitializationBuilder()
        .setStrategy(new StandardInitializationStrategy(logger))
        .setLogger(logger)
        .addPhase({
          name: 'mock-phase',
          execute: async () => {
            await logger.info('Mock phase executed');
            return true;
          },
        })
        .build();

      const result = await controller.initialize();

      if (!result.success) {
        throw new Error('Controller initialization failed');
      }

      await TestUtils.cleanupTempDir(tempDir);
    });
  }
}

// =============================================================================
// END-TO-END TESTS
// =============================================================================

class EndToEndTests {
  static run(runner) {
    // Environment validation E2E
    runner.addTest(
      'E2E - Environment validation',
      async () => {
        const { EnvironmentInitializer, Logger } = require('./init-controller');

        const tempDir = await TestUtils.createTempDir();
        const logFile = path.join(tempDir, 'test.log');
        const logger = new Logger(logFile);

        const config = {
          nodeVersion: '20.0.0', // Lower requirement for testing
          ports: { test: 9999 },
        };

        const initializer = new EnvironmentInitializer(config, logger);
        const result = await initializer.execute({});

        if (result !== true) {
          throw new Error('Environment validation failed');
        }

        await TestUtils.cleanupTempDir(tempDir);
      },
      { timeout: 10000 }
    );

    // Port availability test
    runner.addTest(
      'E2E - Port availability check',
      async () => {
        const { EnvironmentInitializer, Logger } = require('./init-controller');

        const tempDir = await TestUtils.createTempDir();
        const logFile = path.join(tempDir, 'test.log');
        const logger = new Logger(logFile);

        // Test with a port we know should be available
        const config = {
          nodeVersion: '20.0.0',
          ports: { test: 65432 }, // High port number, likely available
        };

        const initializer = new EnvironmentInitializer(config, logger);
        const result = await initializer.execute({});

        if (result !== true) {
          throw new Error('Port availability check failed');
        }

        await TestUtils.cleanupTempDir(tempDir);
      },
      { timeout: 10000 }
    );

    // Mock service health check
    runner.addTest(
      'E2E - Service health check',
      async () => {
        const port = 65433;
        const mockService = await TestUtils.mockService(port);

        try {
          // Wait for service to be ready
          await TestUtils.waitForPort(port, 5000);

          // Test health check
          const result = await new Promise((resolve, reject) => {
            const req = http.get(`http://localhost:${port}/health`, (res) => {
              let data = '';
              res.on('data', (chunk) => (data += chunk));
              res.on('end', () => {
                try {
                  const response = JSON.parse(data);
                  resolve(response.status === 'ok');
                } catch (error) {
                  reject(error);
                }
              });
            });

            req.on('error', reject);
            req.setTimeout(5000, () => reject(new Error('Request timeout')));
          });

          if (!result) {
            throw new Error('Health check failed');
          }
        } finally {
          await mockService.close();
        }
      },
      { timeout: 15000 }
    );
  }
}

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

class PerformanceTests {
  static run(runner) {
    // Initialization performance
    runner.addTest(
      'Performance - Initialization speed',
      async () => {
        const {
          InitializationController,
          InitializationBuilder,
          StandardInitializationStrategy,
          Logger,
        } = require('./init-controller');

        const tempDir = await TestUtils.createTempDir();
        const logFile = path.join(tempDir, 'test.log');
        const logger = new Logger(logFile);

        const startTime = Date.now();

        const controller = await new InitializationBuilder()
          .setStrategy(new StandardInitializationStrategy(logger))
          .setLogger(logger)
          .addPhase({
            name: 'perf-test',
            execute: async () => {
              // Simulate some work
              await new Promise((resolve) => setTimeout(resolve, 10));
              return true;
            },
          })
          .build();

        await controller.initialize();
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should complete in under 1 second
        if (duration > 1000) {
          throw new Error(`Initialization took too long: ${duration}ms`);
        }

        await TestUtils.cleanupTempDir(tempDir);
      },
      { timeout: 5000 }
    );

    // Memory usage test
    runner.addTest(
      'Performance - Memory usage',
      async () => {
        const initialMemory = process.memoryUsage().heapUsed;

        const {
          InitializationController,
          InitializationBuilder,
          StandardInitializationStrategy,
          Logger,
        } = require('./init-controller');

        const tempDir = await TestUtils.createTempDir();
        const logFile = path.join(tempDir, 'test.log');
        const logger = new Logger(logFile);

        const controller = await new InitializationBuilder()
          .setStrategy(new StandardInitializationStrategy(logger))
          .setLogger(logger)
          .addPhase({
            name: 'memory-test',
            execute: async () => true,
          })
          .build();

        await controller.initialize();

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;

        // Should not increase memory by more than 50MB
        if (memoryIncrease > 50 * 1024 * 1024) {
          throw new Error(`Memory usage increased by ${memoryIncrease} bytes`);
        }

        await TestUtils.cleanupTempDir(tempDir);
      },
      { timeout: 10000 }
    );
  }
}

// =============================================================================
// MAIN TEST EXECUTION
// =============================================================================

async function main() {
  const runner = new TestRunner();

  // Add test suites
  UnitTests.run(runner);
  IntegrationTests.run(runner);
  EndToEndTests.run(runner);
  PerformanceTests.run(runner);

  // Run all tests
  await runner.run();
}

// Export for use as module
module.exports = {
  TestRunner,
  TestUtils,
  UnitTests,
  IntegrationTests,
  EndToEndTests,
  PerformanceTests,
};

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}
