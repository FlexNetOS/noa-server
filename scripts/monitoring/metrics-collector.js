#!/usr/bin/env node
/**
 * Metrics Collection System - Real-time Performance Monitoring
 *
 * Collects system, application, and business metrics for monitoring
 * and alerting purposes.
 *
 * @module metrics-collector
 * @version 1.0.0
 */

const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

class MetricsCollector {
  constructor(config) {
    this.config = config.monitoring.metrics;
    this.alerting = config.monitoring.alerting;
    this.metrics = new Map();
    this.startTime = Date.now();
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
  }

  /**
   * Collect all metrics
   */
  async collect() {
    const timestamp = new Date().toISOString();
    const metrics = {
      timestamp,
      system: await this.collectSystemMetrics(),
      application: await this.collectApplicationMetrics(),
      business: await this.collectBusinessMetrics(),
      custom: await this.collectCustomMetrics(),
    };

    await this.storeMetrics(metrics);
    await this.evaluateAlerts(metrics);

    return metrics;
  }

  /**
   * Collect system-level metrics
   */
  async collectSystemMetrics() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Calculate CPU usage
    const cpuUsage = await this.getCPUUsage();

    return {
      cpu: {
        usage: cpuUsage,
        count: cpus.length,
        model: cpus[0].model,
        speed: cpus[0].speed,
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usagePercent: (usedMemory / totalMemory) * 100,
      },
      disk: await this.getDiskUsage(),
      network: await this.getNetworkStats(),
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
    };
  }

  /**
   * Calculate CPU usage percentage
   */
  async getCPUUsage() {
    const cpus = os.cpus();

    const getTotal = (cpu) => {
      return Object.values(cpu.times).reduce((acc, val) => acc + val, 0);
    };

    const getIdle = (cpu) => cpu.times.idle;

    const startMeasure = cpus.map((cpu) => ({
      total: getTotal(cpu),
      idle: getIdle(cpu),
    }));

    // Wait 100ms for measurement
    await new Promise((resolve) => setTimeout(resolve, 100));

    const endMeasure = os.cpus().map((cpu) => ({
      total: getTotal(cpu),
      idle: getIdle(cpu),
    }));

    const usages = startMeasure.map((start, i) => {
      const end = endMeasure[i];
      const totalDiff = end.total - start.total;
      const idleDiff = end.idle - start.idle;

      return ((totalDiff - idleDiff) / totalDiff) * 100;
    });

    return {
      average: usages.reduce((a, b) => a + b, 0) / usages.length,
      perCore: usages,
    };
  }

  /**
   * Get disk usage statistics
   */
  async getDiskUsage() {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      const { stdout } = await execAsync('df -k /');
      const lines = stdout.trim().split('\n');
      const data = lines[1].split(/\s+/);

      return {
        total: parseInt(data[1]) * 1024,
        used: parseInt(data[2]) * 1024,
        available: parseInt(data[3]) * 1024,
        usagePercent: parseInt(data[4]),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStats() {
    const interfaces = os.networkInterfaces();
    const stats = {};

    for (const [name, addrs] of Object.entries(interfaces)) {
      stats[name] = {
        ipv4: addrs.filter((a) => a.family === 'IPv4'),
        ipv6: addrs.filter((a) => a.family === 'IPv6'),
      };
    }

    return stats;
  }

  /**
   * Collect application-level metrics
   */
  async collectApplicationMetrics() {
    const process = global.process;
    const memUsage = process.memoryUsage();

    return {
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
        },
        cpu: process.cpuUsage(),
      },
      requests: {
        total: this.getCounter('requests_total'),
        success: this.getCounter('requests_success'),
        errors: this.getCounter('requests_errors'),
        errorRate: this.calculateErrorRate(),
      },
      latency: {
        average: this.getGauge('latency_average'),
        p50: this.getGauge('latency_p50'),
        p95: this.getGauge('latency_p95'),
        p99: this.getGauge('latency_p99'),
      },
      throughput: {
        requestsPerSecond: this.getGauge('throughput_rps'),
        bytesPerSecond: this.getGauge('throughput_bps'),
      },
    };
  }

  /**
   * Collect business metrics
   */
  async collectBusinessMetrics() {
    return {
      activeUsers: this.getGauge('active_users'),
      tasksCompleted: this.getCounter('tasks_completed'),
      agentSpawns: this.getCounter('agent_spawns'),
      swarmSessions: this.getGauge('swarm_sessions_active'),
      neuralInferences: this.getCounter('neural_inferences'),
      cacheHitRate: this.getGauge('cache_hit_rate'),
    };
  }

  /**
   * Collect custom metrics
   */
  async collectCustomMetrics() {
    const custom = {};

    for (const [name, value] of this.gauges.entries()) {
      if (name.startsWith('custom_')) {
        custom[name.replace('custom_', '')] = value;
      }
    }

    return custom;
  }

  /**
   * Store metrics to persistence layer
   */
  async storeMetrics(metrics) {
    if (this.config.storage.type === 'file') {
      const storageDir = path.join(process.cwd(), this.config.storage.path);
      await fs.mkdir(storageDir, { recursive: true });

      const date = new Date().toISOString().split('T')[0];
      const metricsFile = path.join(storageDir, `metrics-${date}.jsonl`);

      const line = JSON.stringify(metrics) + '\n';
      await fs.appendFile(metricsFile, line);
    }

    // Keep in-memory for dashboards
    this.metrics.set(metrics.timestamp, metrics);

    // Cleanup old in-memory metrics (keep last hour)
    const oneHourAgo = Date.now() - 3600000;
    for (const [timestamp, _] of this.metrics.entries()) {
      if (new Date(timestamp).getTime() < oneHourAgo) {
        this.metrics.delete(timestamp);
      }
    }
  }

  /**
   * Evaluate alert rules against metrics
   */
  async evaluateAlerts(metrics) {
    for (const rule of this.alerting.rules) {
      const shouldAlert = this.evaluateCondition(rule.condition, metrics);

      if (shouldAlert) {
        await this.triggerAlert(rule, metrics);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  evaluateCondition(condition, metrics) {
    // Simple condition evaluation
    // In production, use a proper expression parser

    const context = {
      error_rate: this.calculateErrorRate(),
      avg_latency: metrics.application.latency.average,
      memory_usage: metrics.system.memory.usagePercent / 100,
      cpu_usage: metrics.system.cpu.usage.average / 100,
    };

    try {
      // WARNING: eval is used here for simplicity
      // In production, use a safe expression evaluator
      const result = eval(condition.replace(/([a-z_]+)/g, 'context.$1'));
      return result;
    } catch {
      return false;
    }
  }

  /**
   * Trigger alert
   */
  async triggerAlert(rule, metrics) {
    const alert = {
      name: rule.name,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
      condition: rule.condition,
      metrics: {
        errorRate: this.calculateErrorRate(),
        latency: metrics.application.latency.average,
        memoryUsage: metrics.system.memory.usagePercent,
        cpuUsage: metrics.system.cpu.usage.average,
      },
    };

    console.error(`[ALERT] ${rule.severity.toUpperCase()}: ${rule.name}`);
    console.error(JSON.stringify(alert, null, 2));

    // Log to file
    if (this.alerting.channels.file.enabled) {
      const alertDir = path.join(process.cwd(), this.alerting.channels.file.path);
      await fs.mkdir(alertDir, { recursive: true });

      const alertFile = path.join(alertDir, `alerts-${new Date().toISOString().split('T')[0]}.log`);
      await fs.appendFile(alertFile, JSON.stringify(alert, null, 2) + '\n');
    }

    // Execute actions
    for (const action of rule.actions) {
      await this.executeAction(action, alert);
    }
  }

  /**
   * Execute alert action
   */
  async executeAction(action, alert) {
    console.log(`[ACTION] Executing: ${action}`);

    switch (action) {
      case 'notify':
        // Notification already logged
        break;
      case 'auto-heal':
        // Trigger self-healing
        console.log('[ACTION] Triggering self-healing...');
        break;
      case 'restart-service':
        console.log('[ACTION] Restarting service...');
        break;
      case 'scale-up':
        console.log('[ACTION] Scaling up...');
        break;
      case 'garbage-collect':
        if (global.gc) global.gc();
        break;
    }
  }

  // Metric accessors and utilities
  incrementCounter(name, value = 1) {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  getCounter(name) {
    return this.counters.get(name) || 0;
  }

  setGauge(name, value) {
    this.gauges.set(name, value);
  }

  getGauge(name) {
    return this.gauges.get(name) || 0;
  }

  recordHistogram(name, value) {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
    }
    this.histograms.get(name).push(value);

    // Keep only last 1000 values
    const values = this.histograms.get(name);
    if (values.length > 1000) {
      values.shift();
    }
  }

  calculateErrorRate() {
    const total = this.getCounter('requests_total');
    const errors = this.getCounter('requests_errors');
    return total > 0 ? errors / total : 0;
  }

  /**
   * Get metrics for dashboard
   */
  getRecentMetrics(duration = 3600000) {
    const cutoff = Date.now() - duration;
    const recent = [];

    for (const [timestamp, metrics] of this.metrics.entries()) {
      if (new Date(timestamp).getTime() >= cutoff) {
        recent.push(metrics);
      }
    }

    return recent.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Start continuous collection
   */
  startCollection() {
    console.log('[METRICS] Starting metrics collection...');
    console.log(`[METRICS] Collection interval: ${this.config.collectInterval}ms`);

    // Run initial collection
    this.collect();

    // Schedule periodic collection
    this.collectionInterval = setInterval(() => {
      this.collect();
    }, this.config.collectInterval);

    // Graceful shutdown handler
    process.on('SIGINT', async () => {
      console.log('[METRICS] Shutting down collection...');
      clearInterval(this.collectionInterval);

      // Final collection
      await this.collect();

      process.exit(0);
    });
  }
}

// CLI execution
async function main() {
  const configPath = path.join(process.cwd(), 'config/monitoring/monitoring-config.json');

  try {
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    const collector = new MetricsCollector(config);

    const args = process.argv.slice(2);
    const mode = args[0] || 'once';

    if (mode === 'continuous' || mode === 'daemon') {
      collector.startCollection();
    } else {
      const metrics = await collector.collect();
      console.log('\nCollected Metrics:');
      console.log(JSON.stringify(metrics, null, 2));
    }
  } catch (error) {
    console.error('[METRICS] Error:', error.message);
    process.exit(1);
  }
}

module.exports = MetricsCollector;

if (require.main === module) {
  main();
}
