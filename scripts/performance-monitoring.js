#!/usr/bin/env node

/**
 * Agent Performance Monitoring System
 * Tracks agent performance metrics, health status, and system monitoring
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class PerformanceMonitor {
  constructor() {
    this.projectRoot = '/home/deflex/noa-server';
    this.hiveDbPath = path.join(this.projectRoot, '.hive-mind', 'hive.db');
    this.db = null;
    this.monitoringInterval = null;
    this.metrics = new Map();
    this.alerts = [];
  }

  async initialize() {
    console.log('📊 Initializing Performance Monitoring System...\n');

    // Initialize database connection
    this.db = new sqlite3.Database(this.hiveDbPath);

    // Ensure performance tables exist
    await this.initializePerformanceTables();

    // Start monitoring
    this.startMonitoring();

    console.log('✅ Performance Monitoring System ready\n');
  }

  async initializePerformanceTables() {
    // Check if all performance tables exist
    const existingTables = await this.allQuery(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('agent_health', 'system_alerts', 'performance_reports')",
      []
    );
    const existingTableNames = existingTables.map((t) => t.name);

    const requiredTables = ['agent_health', 'system_alerts', 'performance_reports'];
    const missingTables = requiredTables.filter((table) => !existingTableNames.includes(table));

    if (missingTables.length > 0) {
      console.log(`Creating missing tables: ${missingTables.join(', ')}`);

      const tableDefinitions = {
        agent_health: `CREATE TABLE agent_health (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_id TEXT UNIQUE NOT NULL,
                    status TEXT DEFAULT 'unknown',
                    last_seen DATETIME,
                    uptime_seconds INTEGER DEFAULT 0,
                    memory_usage_mb REAL,
                    cpu_usage_percent REAL,
                    error_count INTEGER DEFAULT 0,
                    last_error TEXT,
                    response_time_ms REAL,
                    message_count INTEGER DEFAULT 0,
                    FOREIGN KEY (agent_id) REFERENCES agents(id)
                )`,
        system_alerts: `CREATE TABLE system_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT NOT NULL,
                    agent_id TEXT,
                    swarm_id TEXT,
                    metric_name TEXT,
                    threshold_value REAL,
                    actual_value REAL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    resolved BOOLEAN DEFAULT 0,
                    resolved_at DATETIME,
                    FOREIGN KEY (agent_id) REFERENCES agents(id),
                    FOREIGN KEY (swarm_id) REFERENCES swarms(id)
                )`,
        performance_reports: `CREATE TABLE performance_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    report_type TEXT NOT NULL,
                    report_period TEXT NOT NULL,
                    start_time DATETIME NOT NULL,
                    end_time DATETIME NOT NULL,
                    summary TEXT,
                    recommendations TEXT,
                    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
      };

      for (const tableName of missingTables) {
        if (tableDefinitions[tableName]) {
          await this.runQuery(tableDefinitions[tableName]);
        }
      }

      // Create indexes
      const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_health_agent ON agent_health(agent_id)`,
        `CREATE INDEX IF NOT EXISTS idx_alerts_type ON system_alerts(alert_type)`,
        `CREATE INDEX IF NOT EXISTS idx_alerts_severity ON system_alerts(severity)`,
      ];

      for (const sql of indexes) {
        await this.runQuery(sql);
      }
    }
  }

  async recordMetric(agentId, metricType, metricName, value, unit = null, metadata = null) {
    const metricData = {
      entity_type: metricType,
      entity_id: agentId,
      metric_name: metricName,
      metric_value: value,
      metadata: metadata ? JSON.stringify(metadata) : null,
    };

    await this.runQuery('INSERT INTO performance_metrics VALUES (?, ?, ?, ?, ?, ?, ?)', [
      null, // id
      metricData.entity_type,
      metricData.entity_id,
      metricData.metric_name,
      metricData.metric_value,
      new Date().toISOString(), // timestamp
      metricData.metadata,
    ]);

    // Check for alerts
    await this.checkThresholds(agentId, metricName, value);
  }

  async updateAgentHealth(agentId, healthData) {
    const {
      status = 'healthy',
      memoryUsage,
      cpuUsage,
      errorCount,
      lastError,
      responseTime,
    } = healthData;

    // Get current health data
    const currentHealth = await this.allQuery('SELECT * FROM agent_health WHERE agent_id = ?', [
      agentId,
    ]);

    const now = new Date().toISOString();
    let uptime = 0;

    if (currentHealth.length > 0) {
      const lastSeen = new Date(currentHealth[0].last_seen);
      uptime = currentHealth[0].uptime_seconds + Math.floor((new Date() - lastSeen) / 1000);
    }

    await this.runQuery(
      `INSERT OR REPLACE INTO agent_health
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        currentHealth.length > 0 ? currentHealth[0].id : null,
        agentId,
        status,
        now, // last_seen
        uptime,
        memoryUsage || null,
        cpuUsage || null,
        errorCount || 0,
        lastError || null,
        responseTime || null,
        currentHealth.length > 0 ? currentHealth[0].message_count : 0,
      ]
    );
  }

  async checkThresholds(agentId, metricName, value) {
    // Define thresholds for common metrics
    const thresholds = {
      response_time: { warning: 1000, critical: 5000 }, // ms
      error_rate: { warning: 0.05, critical: 0.15 }, // percentage
      memory_usage: { warning: 80, critical: 95 }, // percentage
      cpu_usage: { warning: 70, critical: 90 }, // percentage
    };

    if (thresholds[metricName]) {
      const threshold = thresholds[metricName];
      let severity = null;
      let message = null;

      if (value >= threshold.critical) {
        severity = 'critical';
        message = `${metricName} is critically high: ${value}`;
      } else if (value >= threshold.warning) {
        severity = 'warning';
        message = `${metricName} is above warning threshold: ${value}`;
      }

      if (severity) {
        await this.createAlert('threshold_exceeded', severity, message, {
          agent_id: agentId,
          metric_name: metricName,
          threshold_value: severity === 'critical' ? threshold.critical : threshold.warning,
          actual_value: value,
        });
      }
    }
  }

  async createAlert(alertType, severity, message, context = {}) {
    await this.runQuery('INSERT INTO system_alerts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      null, // id
      alertType,
      severity,
      message,
      context.agent_id || null,
      context.swarm_id || null,
      context.metric_name || null,
      context.threshold_value || null,
      context.actual_value || null,
      new Date().toISOString(), // timestamp
      0, // resolved
      null, // resolved_at
    ]);

    this.alerts.push({
      type: alertType,
      severity,
      message,
      context,
      timestamp: new Date(),
    });
  }

  async getAgentMetrics(agentId, metricType = null, hours = 24) {
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    let query = `
            SELECT * FROM performance_metrics
            WHERE entity_id = ? AND timestamp >= ?
        `;
    const params = [agentId, timeThreshold];

    if (metricType) {
      query += ' AND entity_type = ?';
      params.push(metricType);
    }

    query += ' ORDER BY timestamp DESC';

    const rows = await this.allQuery(query, params);
    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    }));
  }

  async getSwarmMetrics(swarmId, hours = 24) {
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get agents in this swarm
    const agentsInSwarm = await this.allQuery('SELECT id FROM agents WHERE swarm_id = ?', [
      swarmId,
    ]);
    const agentIds = agentsInSwarm.map((a) => a.id);

    if (agentIds.length === 0) {
      return [];
    }

    const placeholders = agentIds.map(() => '?').join(',');
    const rows = await this.allQuery(
      `
            SELECT
                entity_id as agent_id,
                entity_type as metric_type,
                metric_name,
                AVG(metric_value) as avg_value,
                MIN(metric_value) as min_value,
                MAX(metric_value) as max_value,
                COUNT(*) as sample_count
            FROM performance_metrics
            WHERE entity_id IN (${placeholders}) AND timestamp >= ?
            GROUP BY entity_id, entity_type, metric_name
            ORDER BY entity_id, entity_type, metric_name
        `,
      [...agentIds, timeThreshold]
    );

    return rows;
  }

  async getSystemHealth() {
    const healthData = await this.allQuery(
      `
            SELECT
                ah.*,
                a.name as agent_name,
                s.name as swarm_name
            FROM agent_health ah
            LEFT JOIN agents a ON ah.agent_id = a.id
            LEFT JOIN swarms s ON a.swarm_id = s.id
            ORDER BY ah.last_seen DESC
        `,
      []
    );

    return healthData.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    }));
  }

  async getActiveAlerts(hours = 24) {
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const rows = await this.allQuery(
      `
            SELECT * FROM system_alerts
            WHERE resolved = 0 AND timestamp >= ?
            ORDER BY severity DESC, timestamp DESC
        `,
      [timeThreshold]
    );

    return rows.map((row) => ({
      ...row,
      context: {
        agent_id: row.agent_id,
        swarm_id: row.swarm_id,
        metric_name: row.metric_name,
        threshold_value: row.threshold_value,
        actual_value: row.actual_value,
      },
    }));
  }

  async generatePerformanceReport(reportType = 'daily') {
    const now = new Date();
    let startTime, endTime, period;

    switch (reportType) {
      case 'hourly':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        period = 'hourly';
        break;
      case 'daily':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        period = 'daily';
        break;
      case 'weekly':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        period = 'weekly';
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        period = 'daily';
    }

    endTime = now;

    // Get metrics summary
    const metricsSummary = await this.allQuery(
      `
            SELECT
                entity_type as metric_type,
                metric_name,
                COUNT(*) as total_samples,
                AVG(metric_value) as avg_value,
                MIN(metric_value) as min_value,
                MAX(metric_value) as max_value,
                '' as unit
            FROM performance_metrics
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY entity_type, metric_name
            ORDER BY entity_type, metric_name
        `,
      [startTime.toISOString(), endTime.toISOString()]
    );

    // Get health summary
    const healthSummary = await this.allQuery(
      `
            SELECT
                COUNT(*) as total_agents,
                SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) as healthy_agents,
                SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning_agents,
                SUM(CASE WHEN status = 'critical' THEN 1 ELSE 0 END) as critical_agents,
                AVG(response_time_ms) as avg_response_time,
                MAX(error_count) as max_errors
            FROM agent_health
        `,
      []
    );

    // Get alerts summary
    const alertsSummary = await this.allQuery(
      `
            SELECT
                COUNT(*) as total_alerts,
                SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_alerts,
                SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning_alerts,
                SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) as resolved_alerts
            FROM system_alerts
            WHERE timestamp BETWEEN ? AND ?
        `,
      [startTime.toISOString(), endTime.toISOString()]
    );

    const summary = {
      period,
      totalAgents: healthSummary[0]?.total_agents || 0,
      healthyAgents: healthSummary[0]?.healthy_agents || 0,
      totalMetrics: metricsSummary.length,
      totalAlerts: alertsSummary[0]?.total_alerts || 0,
      criticalAlerts: alertsSummary[0]?.critical_alerts || 0,
    };

    const recommendations = this.generateRecommendations(summary, metricsSummary);

    // Save report
    await this.runQuery('INSERT INTO performance_reports VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
      null, // id
      reportType,
      period,
      startTime.toISOString(),
      endTime.toISOString(),
      JSON.stringify(summary),
      JSON.stringify(recommendations),
      now.toISOString(),
    ]);

    return {
      summary,
      recommendations,
      metricsSummary,
      healthSummary: healthSummary[0],
      alertsSummary: alertsSummary[0],
    };
  }

  generateRecommendations(summary, metricsSummary) {
    const recommendations = [];

    if (summary.healthyAgents / summary.totalAgents < 0.8) {
      recommendations.push('Agent health is below 80%. Investigate unhealthy agents.');
    }

    if (summary.criticalAlerts > 0) {
      recommendations.push(
        `${summary.criticalAlerts} critical alerts detected. Immediate attention required.`
      );
    }

    const highResponseTime = metricsSummary.find(
      (m) => m.metric_name === 'response_time' && m.avg_value > 2000
    );
    if (highResponseTime) {
      recommendations.push('Average response time is high. Consider optimizing agent performance.');
    }

    const highErrorRate = metricsSummary.find(
      (m) => m.metric_name === 'error_rate' && m.avg_value > 0.1
    );
    if (highErrorRate) {
      recommendations.push('Error rate is elevated. Review error handling and agent stability.');
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is within acceptable parameters.');
    }

    return recommendations;
  }

  startMonitoring() {
    // Collect system metrics every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.collectSystemMetrics();
    }, 30000);
  }

  async collectSystemMetrics() {
    try {
      // Get all agents
      const agents = await this.allQuery('SELECT id FROM agents', []);

      for (const agent of agents) {
        // Simulate collecting metrics (in real implementation, this would query actual agent health)
        const mockMetrics = {
          response_time: Math.random() * 1000 + 100, // 100-1100ms
          memory_usage: Math.random() * 50 + 30, // 30-80%
          cpu_usage: Math.random() * 40 + 10, // 10-50%
          message_count: Math.floor(Math.random() * 100),
        };

        // Record metrics
        for (const [metricName, value] of Object.entries(mockMetrics)) {
          await this.recordMetric(
            agent.id,
            'system',
            metricName,
            value,
            metricName.includes('time') ? 'ms' : metricName.includes('usage') ? '%' : 'count'
          );
        }

        // Update health status
        const status =
          mockMetrics.memory_usage > 90 || mockMetrics.cpu_usage > 80
            ? 'critical'
            : mockMetrics.memory_usage > 70 || mockMetrics.cpu_usage > 60
              ? 'warning'
              : 'healthy';

        await this.updateAgentHealth(agent.id, {
          status,
          memoryUsage: mockMetrics.memory_usage,
          cpuUsage: mockMetrics.cpu_usage,
          responseTime: mockMetrics.response_time,
        });
      }
    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  async getAgentSwarm(agentId) {
    const rows = await this.allQuery('SELECT swarm_id FROM agents WHERE id = ?', [agentId]);
    return rows.length > 0 ? rows[0].swarm_id : null;
  }

  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async close() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.db) {
      this.db.close();
    }
  }

  // Testing utilities
  async getPerformanceStats() {
    const metricsCount = await this.allQuery(
      'SELECT COUNT(*) as count FROM performance_metrics',
      []
    );
    const healthCount = await this.allQuery('SELECT COUNT(*) as count FROM agent_health', []);
    const alertsCount = await this.allQuery(
      'SELECT COUNT(*) as count FROM system_alerts WHERE resolved = 0',
      []
    );

    return {
      totalMetrics: metricsCount[0].count,
      totalHealthRecords: healthCount[0].count,
      activeAlerts: alertsCount[0].count,
    };
  }
}

module.exports = PerformanceMonitor;

// CLI interface for testing
if (require.main === module) {
  const monitor = new PerformanceMonitor();

  async function testPerformanceMonitoring() {
    try {
      await monitor.initialize();

      console.log('🧪 Testing Performance Monitoring...\n');

      // Wait a bit for some metrics to be collected
      console.log('⏳ Collecting initial metrics...');
      await new Promise((resolve) => setTimeout(resolve, 35000));

      // Test manual metric recording
      console.log('📊 Testing manual metric recording...');
      await monitor.recordMetric('agent_001', 'custom', 'test_metric', 42.5, 'units');
      console.log('✅ Manual metric recorded');

      // Test health updates
      console.log('🏥 Testing health updates...');
      await monitor.updateAgentHealth('agent_001', {
        status: 'healthy',
        memoryUsage: 65.5,
        cpuUsage: 45.2,
        responseTime: 250,
      });
      console.log('✅ Health data updated');

      // Test alert creation
      console.log('🚨 Testing alert creation...');
      await monitor.createAlert('test_alert', 'warning', 'This is a test alert', {
        agent_id: 'agent_001',
        metric_name: 'test_metric',
      });
      console.log('✅ Alert created');

      // Get system health
      console.log('📈 Getting system health...');
      const health = await monitor.getSystemHealth();
      console.log(`✅ Retrieved health data for ${health.length} agents`);

      // Get active alerts
      console.log('🔍 Getting active alerts...');
      const alerts = await monitor.getActiveAlerts();
      console.log(`✅ Found ${alerts.length} active alerts`);

      // Generate performance report
      console.log('📋 Generating performance report...');
      const report = await monitor.generatePerformanceReport('hourly');
      console.log('✅ Performance report generated');

      // Show stats
      console.log('\n📊 Performance Monitoring Statistics:');
      const stats = await monitor.getPerformanceStats();
      console.log(`Metrics: ${stats.totalMetrics}`);
      console.log(`Health Records: ${stats.totalHealthRecords}`);
      console.log(`Active Alerts: ${stats.activeAlerts}`);

      console.log('\n🎉 Performance Monitoring testing completed successfully!');
    } catch (error) {
      console.error('❌ Performance Monitoring testing failed:', error);
      process.exit(1);
    } finally {
      await monitor.close();
    }
  }

  testPerformanceMonitoring();
}
