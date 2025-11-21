#!/usr/bin/env node
/**
 * Capability Testing Script
 * Version: 1.0.0
 * Date: October 22, 2025
 *
 * Tests agent capabilities and tool accessibility
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const sqlite3 = require('sqlite3').verbose();

class CapabilityTester {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.hiveDbPath = path.join(this.projectRoot, '.hive-mind', 'hive.db');
    this.testResults = {
      mcpTools: {},
      agentCapabilities: {},
      swarmConnectivity: {},
      overall: { passed: 0, failed: 0, total: 0 },
    };
  }

  async initialize() {
    console.log('🧪 Initializing Capability Testing...\n');

    // Initialize database connection
    this.db = new sqlite3.Database(this.hiveDbPath);

    console.log('✅ Test environment ready\n');
  }

  async testMCPTools() {
    console.log('🔧 Testing MCP Tools...\n');

    const mcpTests = [
      {
        name: 'Filesystem Server',
        serverPath: 'mcp.servers.filesystem.server',
        testCommand: 'python',
        testArgs: [
          '-c',
          `
import sys
sys.path.insert(0, '/home/deflex/noa-server')
try:
    from langgraph_mcp.servers.filesystem.server import create_filesystem_server
    server = create_filesystem_server()
    print("Filesystem server can be imported and initialized successfully")
except Exception as e:
    print(f"Import failed: {e}")
    sys.exit(1)
                `,
        ],
      },
      {
        name: 'SQLite Server',
        serverPath: 'mcp.servers.sqlite.server',
        testCommand: 'python',
        testArgs: [
          '-c',
          `
import sys
import os
sys.path.insert(0, '/home/deflex/noa-server')
os.environ['SQLITE_DB_PATH'] = '/home/deflex/noa-server/mcp/test.db'
try:
    from langgraph_mcp.servers.sqlite.server import create_sqlite_server
    server = create_sqlite_server()
    print("SQLite server can be imported and initialized successfully")
except Exception as e:
    print(f"Import failed: {e}")
    sys.exit(1)
                `,
        ],
      },
      {
        name: 'GitHub Server',
        serverPath: 'mcp.servers.github.server',
        testCommand: 'python',
        testArgs: [
          '-c',
          `
import sys
import os
sys.path.insert(0, '/home/deflex/noa-server')
os.environ['GITHUB_TOKEN'] = 'dummy_token_for_testing'
try:
    from langgraph_mcp.servers.github.server import create_github_server
    server = create_github_server()
    print("GitHub server can be imported and initialized successfully")
except Exception as e:
    print(f"Import failed: {e}")
    sys.exit(1)
                `,
        ],
      },
    ];

    for (const test of mcpTests) {
      console.log(`   Testing ${test.name}...`);
      const result = await this.runCommandTest(test.testCommand, test.testArgs);

      this.testResults.mcpTools[test.name] = result;
      this.updateOverallResult(result.success);

      if (result.success) {
        console.log(`   ✅ ${test.name}: PASSED`);
      } else {
        console.log(`   ❌ ${test.name}: FAILED - ${result.error}`);
      }
    }

    console.log('');
  }

  async testAgentCapabilities() {
    console.log('🤖 Testing Agent Capabilities...\n');

    // Test that agents are properly registered and have capabilities
    const agentTests = [
      {
        name: 'Agent Registration Check',
        query: 'SELECT COUNT(*) as count FROM agents',
        expected: (result) => result.count > 0,
        description: 'Agents are registered in hive mind',
      },
      {
        name: 'Swarm Assignment Check',
        query: 'SELECT COUNT(*) as count FROM agents WHERE swarm_id IS NOT NULL',
        expected: (result) => result.count > 0,
        description: 'Agents are assigned to swarms',
      },
      {
        name: 'Capability Definition Check',
        query:
          'SELECT COUNT(*) as count FROM agents WHERE capabilities IS NOT NULL AND capabilities != "[]"',
        expected: (result) => result.count > 0,
        description: 'Agents have defined capabilities',
      },
    ];

    for (const test of agentTests) {
      console.log(`   Testing ${test.name}...`);
      const result = await this.runDatabaseTest(test.query, test.expected, test.description);

      this.testResults.agentCapabilities[test.name] = result;
      this.updateOverallResult(result.success);

      if (result.success) {
        console.log(`   ✅ ${test.name}: PASSED`);
      } else {
        console.log(`   ❌ ${test.name}: FAILED - ${result.error}`);
      }
    }

    console.log('');
  }

  async testSwarmConnectivity() {
    console.log('🐝 Testing Swarm Connectivity...\n');

    const swarmTests = [
      {
        name: 'Swarm Creation Check',
        query: 'SELECT COUNT(*) as count FROM swarms',
        expected: (result) => result.count >= 3,
        description: 'Required swarms are created',
      },
      {
        name: 'Agent Distribution Check',
        query: `
                    SELECT s.name, COUNT(a.id) as agent_count
                    FROM swarms s
                    LEFT JOIN agents a ON s.id = a.swarm_id
                    GROUP BY s.id, s.name
                `,
        expected: (result) => result.every((swarm) => swarm.agent_count > 0),
        description: 'All swarms have assigned agents',
      },
    ];

    for (const test of swarmTests) {
      console.log(`   Testing ${test.name}...`);
      const result = await this.runDatabaseTest(test.query, test.expected, test.description);

      this.testResults.swarmConnectivity[test.name] = result;
      this.updateOverallResult(result.success);

      if (result.success) {
        console.log(`   ✅ ${test.name}: PASSED`);
      } else {
        console.log(`   ❌ ${test.name}: FAILED - ${result.error}`);
      }
    }

    console.log('');
  }

  async runCommandTest(command, args) {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const success = code === 0;
        resolve({
          success,
          output: stdout,
          error: stderr || (success ? null : `Exit code: ${code}`),
          code,
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          output: stdout,
          error: error.message,
          code: -1,
        });
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        child.kill();
        resolve({
          success: false,
          output: stdout,
          error: 'Test timed out after 10 seconds',
          code: -2,
        });
      }, 10000);
    });
  }

  async runDatabaseTest(query, expectedFn, description) {
    return new Promise((resolve) => {
      this.db.all(query, [], (err, rows) => {
        if (err) {
          resolve({
            success: false,
            result: null,
            error: `Database error: ${err.message}`,
            description,
          });
          return;
        }

        try {
          const success = expectedFn(rows.length === 1 ? rows[0] : rows);
          resolve({
            success,
            result: rows,
            error: success ? null : `Expectation failed: ${description}`,
            description,
          });
        } catch (error) {
          resolve({
            success: false,
            result: rows,
            error: `Test error: ${error.message}`,
            description,
          });
        }
      });
    });
  }

  updateOverallResult(success) {
    this.testResults.overall.total++;
    if (success) {
      this.testResults.overall.passed++;
    } else {
      this.testResults.overall.failed++;
    }
  }

  async generateTestReport() {
    console.log('📊 Generating Capability Test Report...\n');

    const report = `
# Capability Testing Report

**Date:** ${new Date().toISOString()}
**Status:** ${this.testResults.overall.failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}

## Test Results Summary

- **Total Tests:** ${this.testResults.overall.total}
- **Passed:** ${this.testResults.overall.passed}
- **Failed:** ${this.testResults.overall.failed}
- **Success Rate:** ${((this.testResults.overall.passed / this.testResults.overall.total) * 100).toFixed(1)}%

## MCP Tools Test Results

${Object.entries(this.testResults.mcpTools)
  .map(([name, result]) => `- **${name}:** ${result.success ? '✅ PASSED' : '❌ FAILED'}`)
  .join('\n')}

## Agent Capabilities Test Results

${Object.entries(this.testResults.agentCapabilities)
  .map(([name, result]) => `- **${name}:** ${result.success ? '✅ PASSED' : '❌ FAILED'}`)
  .join('\n')}

## Swarm Connectivity Test Results

${Object.entries(this.testResults.swarmConnectivity)
  .map(([name, result]) => `- **${name}:** ${result.success ? '✅ PASSED' : '❌ FAILED'}`)
  .join('\n')}

## Detailed Results

### MCP Tools
${Object.entries(this.testResults.mcpTools)
  .map(
    ([name, result]) => `
**${name}**
- Status: ${result.success ? 'PASSED' : 'FAILED'}
- Output: ${result.output || 'N/A'}
${result.error ? `- Error: ${result.error}` : ''}
`
  )
  .join('\n')}

### Agent Capabilities
${Object.entries(this.testResults.agentCapabilities)
  .map(
    ([name, result]) => `
**${name}**
- Status: ${result.success ? 'PASSED' : 'FAILED'}
- Description: ${result.description}
${result.error ? `- Error: ${result.error}` : ''}
`
  )
  .join('\n')}

### Swarm Connectivity
${Object.entries(this.testResults.swarmConnectivity)
  .map(
    ([name, result]) => `
**${name}**
- Status: ${result.success ? 'PASSED' : 'FAILED'}
- Description: ${result.description}
${result.error ? `- Error: ${result.error}` : ''}
`
  )
  .join('\n')}

---
*Capability testing completed*
        `.trim();

    console.log(report);

    // Save report to file
    const reportPath = path.join(this.projectRoot, 'docs', 'capability-test-report.md');
    await fs.writeFile(reportPath, report);

    console.log(`\n📄 Report saved to: ${reportPath}`);
  }

  async close() {
    if (this.db) {
      this.db.close();
    }
  }

  async run() {
    try {
      await this.initialize();

      // Test MCP tools
      await this.testMCPTools();

      // Test agent capabilities
      await this.testAgentCapabilities();

      // Test swarm connectivity
      await this.testSwarmConnectivity();

      // Generate report
      await this.generateTestReport();

      const successRate = (this.testResults.overall.passed / this.testResults.overall.total) * 100;
      console.log(`\n🎉 Capability Testing COMPLETED!`);
      console.log(
        `📊 Success Rate: ${successRate.toFixed(1)}% (${this.testResults.overall.passed}/${this.testResults.overall.total} tests passed)`
      );

      if (this.testResults.overall.failed === 0) {
        console.log('✅ All capabilities verified successfully!');
      } else {
        console.log('⚠️  Some capability tests failed - review the report for details');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Capability testing failed:', error);
      process.exit(1);
    } finally {
      await this.close();
    }
  }
}

// Run the capability testing
if (require.main === module) {
  const tester = new CapabilityTester();
  tester.run();
}

module.exports = CapabilityTester;
