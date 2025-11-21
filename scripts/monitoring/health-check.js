#!/usr/bin/env node
/**
 * Health Check System - Automated Service Monitoring
 *
 * Monitors all critical services and dependencies, reporting health status
 * and triggering self-healing actions when issues are detected.
 *
 * @module health-check
 * @version 1.0.0
 */

const http = require('http');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class HealthCheckMonitor {
  constructor(config) {
    this.config = config.monitoring.healthChecks;
    this.alerting = config.monitoring.alerting;
    this.selfHealing = config.monitoring.selfHealing;
    this.results = new Map();
    this.failureCount = new Map();
    this.lastCheck = new Map();
  }

  /**
   * Execute health check for a single endpoint
   */
  async checkEndpoint(endpoint) {
    const startTime = Date.now();

    try {
      const result = await this.makeRequest(endpoint);
      const latency = Date.now() - startTime;

      const success = result.statusCode === endpoint.expectedStatus;

      const checkResult = {
        name: endpoint.name,
        status: success ? 'healthy' : 'unhealthy',
        statusCode: result.statusCode,
        latency,
        timestamp: new Date().toISOString(),
        critical: endpoint.critical,
        error: success ? null : `Expected ${endpoint.expectedStatus}, got ${result.statusCode}`,
      };

      // Update failure tracking
      if (success) {
        this.failureCount.set(endpoint.name, 0);
      } else {
        const failures = (this.failureCount.get(endpoint.name) || 0) + 1;
        this.failureCount.set(endpoint.name, failures);

        // Trigger self-healing if critical and failures exceed threshold
        if (endpoint.critical && failures >= this.config.retries) {
          await this.triggerSelfHealing(endpoint, checkResult);
        }
      }

      this.results.set(endpoint.name, checkResult);
      this.lastCheck.set(endpoint.name, Date.now());

      return checkResult;
    } catch (error) {
      const checkResult = {
        name: endpoint.name,
        status: 'error',
        statusCode: null,
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        critical: endpoint.critical,
        error: error.message,
      };

      const failures = (this.failureCount.get(endpoint.name) || 0) + 1;
      this.failureCount.set(endpoint.name, failures);

      if (endpoint.critical && failures >= this.config.retries) {
        await this.triggerSelfHealing(endpoint, checkResult);
      }

      this.results.set(endpoint.name, checkResult);
      this.lastCheck.set(endpoint.name, Date.now());

      return checkResult;
    }
  }

  /**
   * Make HTTP/HTTPS request to endpoint
   */
  makeRequest(endpoint) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint.url);
      const protocol = url.protocol === 'https:' ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: endpoint.method || 'GET',
        timeout: this.config.timeout,
      };

      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Trigger self-healing actions
   */
  async triggerSelfHealing(endpoint, result) {
    if (!this.selfHealing.enabled) {
      console.log(`[SELF-HEAL] Self-healing disabled, skipping for ${endpoint.name}`);
      return;
    }

    console.log(`[SELF-HEAL] Triggering self-healing for ${endpoint.name}`);

    // Log the issue
    await this.logAlert({
      severity: 'critical',
      service: endpoint.name,
      message: `Service health check failed: ${result.error}`,
      timestamp: new Date().toISOString(),
      action: 'self-healing-triggered',
    });

    // Attempt service restart if configured
    if (this.selfHealing.strategies.serviceRestart.enabled) {
      await this.restartService(endpoint.name);
    }
  }

  /**
   * Restart failed service
   */
  async restartService(serviceName) {
    const restartCommands = {
      'mcp-server': 'pm2 restart mcp-server',
      'claude-flow': 'pm2 restart claude-flow',
      'neural-processing': 'pm2 restart neural-processing',
      'ui-server': 'pm2 restart ui-server',
    };

    const command = restartCommands[serviceName];
    if (!command) {
      console.log(`[SELF-HEAL] No restart command configured for ${serviceName}`);
      return;
    }

    console.log(`[SELF-HEAL] Restarting service: ${serviceName}`);

    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve({ stdout, stderr });
        });
      });

      console.log(`[SELF-HEAL] Service ${serviceName} restarted successfully`);

      // Reset failure count after restart
      this.failureCount.set(serviceName, 0);
    } catch (error) {
      console.error(`[SELF-HEAL] Failed to restart ${serviceName}:`, error.message);
    }
  }

  /**
   * Log alert to configured channels
   */
  async logAlert(alert) {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({ ...alert, timestamp }, null, 2);

    // Console output
    if (this.alerting.channels.console.enabled) {
      console.error(`[ALERT] ${logEntry}`);
    }

    // File output
    if (this.alerting.channels.file.enabled) {
      const logDir = path.join(process.cwd(), this.alerting.channels.file.path);
      await fs.mkdir(logDir, { recursive: true });

      const logFile = path.join(logDir, `alerts-${new Date().toISOString().split('T')[0]}.log`);
      await fs.appendFile(logFile, logEntry + '\n');
    }
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    console.log('[HEALTH-CHECK] Running health checks...');

    const checks = this.config.endpoints.map((endpoint) => this.checkEndpoint(endpoint));

    const results = await Promise.all(checks);

    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      total: results.length,
      healthy: results.filter((r) => r.status === 'healthy').length,
      unhealthy: results.filter((r) => r.status === 'unhealthy').length,
      errors: results.filter((r) => r.status === 'error').length,
      criticalFailures: results.filter((r) => r.critical && r.status !== 'healthy').length,
      checks: results,
    };

    // Log summary
    console.log(`[HEALTH-CHECK] Summary: ${summary.healthy}/${summary.total} healthy`);

    if (summary.criticalFailures > 0) {
      console.error(
        `[HEALTH-CHECK] CRITICAL: ${summary.criticalFailures} critical service(s) failing`
      );
    }

    return summary;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    console.log('[HEALTH-CHECK] Starting continuous monitoring...');
    console.log(`[HEALTH-CHECK] Check interval: ${this.config.interval}ms`);

    // Run initial check
    this.runAllChecks();

    // Schedule periodic checks
    this.monitoringInterval = setInterval(() => {
      this.runAllChecks();
    }, this.config.interval);

    // Graceful shutdown handler
    process.on('SIGINT', () => {
      console.log('[HEALTH-CHECK] Shutting down monitoring...');
      clearInterval(this.monitoringInterval);
      process.exit(0);
    });
  }

  /**
   * Get current health status
   */
  getStatus() {
    const allResults = Array.from(this.results.values());
    return {
      timestamp: new Date().toISOString(),
      overall: allResults.every((r) => r.status === 'healthy') ? 'healthy' : 'degraded',
      services: allResults,
    };
  }
}

// CLI execution
async function main() {
  const configPath = path.join(process.cwd(), 'config/monitoring/monitoring-config.json');

  try {
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    const monitor = new HealthCheckMonitor(config);

    const args = process.argv.slice(2);
    const mode = args[0] || 'once';

    if (mode === 'continuous' || mode === 'daemon') {
      monitor.startMonitoring();
    } else {
      const results = await monitor.runAllChecks();
      console.log('\nHealth Check Results:');
      console.log(JSON.stringify(results, null, 2));

      // Exit with error code if critical failures
      process.exit(results.criticalFailures > 0 ? 1 : 0);
    }
  } catch (error) {
    console.error('[HEALTH-CHECK] Error:', error.message);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = HealthCheckMonitor;

// Run if executed directly
if (require.main === module) {
  main();
}
