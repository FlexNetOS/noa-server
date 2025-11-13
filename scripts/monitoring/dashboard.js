#!/usr/bin/env node
/**
 * Real-Time Monitoring Dashboard - Web Interface
 *
 * Provides a real-time web dashboard for visualizing system health,
 * metrics, and self-healing activities.
 *
 * @module dashboard
 * @version 1.0.0
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const MetricsCollector = require('./metrics-collector.js');
const HealthCheckMonitor = require('./health-check.js');

class MonitoringDashboard {
  constructor(config) {
    this.config = config.monitoring.dashboard;
    this.metrics = new MetricsCollector(config);
    this.healthCheck = new HealthCheckMonitor(config);
    this.server = null;
    this.connections = new Set();
  }

  /**
   * Start dashboard server
   */
  async start() {
    const port = this.config.port || 9300;

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(port, () => {
      console.log(`[DASHBOARD] Server running at http://localhost:${port}`);
      console.log(`[DASHBOARD] Refresh interval: ${this.config.refreshInterval}ms`);
    });

    // Start background data collection
    this.metrics.startCollection();
    this.healthCheck.startMonitoring();

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Handle HTTP requests
   */
  async handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Route handling
    switch (url.pathname) {
      case '/':
        await this.serveHTML(res);
        break;
      case '/api/health':
        await this.serveHealth(res);
        break;
      case '/api/metrics':
        await this.serveMetrics(res);
        break;
      case '/api/metrics/recent':
        await this.serveRecentMetrics(res);
        break;
      case '/api/status':
        await this.serveStatus(res);
        break;
      case '/api/sse':
        await this.serveSSE(req, res);
        break;
      default:
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  /**
   * Serve dashboard HTML
   */
  async serveHTML(res) {
    const html = this.generateDashboardHTML();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Serve health status
   */
  async serveHealth(res) {
    const status = this.healthCheck.getStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
  }

  /**
   * Serve current metrics
   */
  async serveMetrics(res) {
    const metrics = await this.metrics.collect();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics, null, 2));
  }

  /**
   * Serve recent metrics history
   */
  async serveRecentMetrics(res) {
    const duration = 3600000; // 1 hour
    const recent = this.metrics.getRecentMetrics(duration);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(recent, null, 2));
  }

  /**
   * Serve overall status
   */
  async serveStatus(res) {
    const health = this.healthCheck.getStatus();
    const metrics = await this.metrics.collect();

    const status = {
      timestamp: new Date().toISOString(),
      health: health.overall,
      services: health.services,
      metrics: {
        cpu: metrics.system.cpu.usage.average,
        memory: metrics.system.memory.usagePercent,
        errorRate: metrics.application.requests.errorRate,
        latency: metrics.application.latency.average,
      },
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
  }

  /**
   * Serve Server-Sent Events for real-time updates
   */
  async serveSSE(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    this.connections.add(res);

    // Send initial data
    const status = await this.getFullStatus();
    res.write(`data: ${JSON.stringify(status)}\n\n`);

    // Send updates every refresh interval
    const interval = setInterval(async () => {
      const status = await this.getFullStatus();
      res.write(`data: ${JSON.stringify(status)}\n\n`);
    }, this.config.refreshInterval);

    req.on('close', () => {
      clearInterval(interval);
      this.connections.delete(res);
    });
  }

  /**
   * Get full dashboard status
   */
  async getFullStatus() {
    const health = this.healthCheck.getStatus();
    const metrics = await this.metrics.collect();

    return {
      timestamp: new Date().toISOString(),
      health,
      metrics,
    };
  }

  /**
   * Generate dashboard HTML
   */
  generateDashboardHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NOA Server - Monitoring Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 20px;
    }
    .header {
      background: #1e293b;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    h1 { color: #3b82f6; margin-bottom: 10px; }
    .subtitle { color: #94a3b8; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .card {
      background: #1e293b;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #334155;
    }
    .card h2 {
      color: #60a5fa;
      margin-bottom: 15px;
      font-size: 18px;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #334155;
    }
    .metric:last-child { border-bottom: none; }
    .metric-label { color: #94a3b8; }
    .metric-value { font-weight: bold; }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }
    .status.healthy { background: #10b981; color: white; }
    .status.unhealthy { background: #ef4444; color: white; }
    .status.degraded { background: #f59e0b; color: white; }
    .chart {
      height: 200px;
      background: #0f172a;
      border-radius: 4px;
      padding: 10px;
      margin-top: 10px;
    }
    .timestamp {
      text-align: center;
      color: #64748b;
      margin-top: 20px;
      font-size: 14px;
    }
    .gauge {
      position: relative;
      height: 120px;
      margin: 20px 0;
    }
    .gauge-fill {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, #10b981, #3b82f6);
      transition: height 0.5s ease;
      border-radius: 4px;
    }
    .gauge-value {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 32px;
      font-weight: bold;
      color: #e2e8f0;
      z-index: 10;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>NOA Server Monitoring Dashboard</h1>
    <div class="subtitle">Real-time system health and performance metrics</div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>System Health</h2>
      <div id="health-status">Loading...</div>
    </div>

    <div class="card">
      <h2>CPU Usage</h2>
      <div class="gauge">
        <div class="gauge-fill" id="cpu-gauge"></div>
        <div class="gauge-value" id="cpu-value">0%</div>
      </div>
    </div>

    <div class="card">
      <h2>Memory Usage</h2>
      <div class="gauge">
        <div class="gauge-fill" id="memory-gauge"></div>
        <div class="gauge-value" id="memory-value">0%</div>
      </div>
    </div>

    <div class="card">
      <h2>Application Metrics</h2>
      <div id="app-metrics">Loading...</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>Services Status</h2>
      <div id="services-status">Loading...</div>
    </div>

    <div class="card">
      <h2>Error Rate</h2>
      <div id="error-rate">Loading...</div>
    </div>
  </div>

  <div class="timestamp" id="last-update">Last updated: Never</div>

  <script>
    const eventSource = new EventSource('/api/sse');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      updateDashboard(data);
    };

    function updateDashboard(data) {
      // Update timestamp
      document.getElementById('last-update').textContent =
        'Last updated: ' + new Date(data.timestamp).toLocaleTimeString();

      // Update health status
      const healthHtml = data.health.services.map(service => \`
        <div class="metric">
          <span class="metric-label">\${service.name}</span>
          <span class="status \${service.status}">\${service.status}</span>
        </div>
      \`).join('');
      document.getElementById('health-status').innerHTML = healthHtml;

      // Update CPU gauge
      const cpuUsage = data.metrics.system.cpu.usage.average;
      document.getElementById('cpu-value').textContent = cpuUsage.toFixed(1) + '%';
      document.getElementById('cpu-gauge').style.height = cpuUsage + '%';

      // Update Memory gauge
      const memoryUsage = data.metrics.system.memory.usagePercent;
      document.getElementById('memory-value').textContent = memoryUsage.toFixed(1) + '%';
      document.getElementById('memory-gauge').style.height = memoryUsage + '%';

      // Update app metrics
      const appMetricsHtml = \`
        <div class="metric">
          <span class="metric-label">Total Requests</span>
          <span class="metric-value">\${data.metrics.application.requests.total}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Avg Latency</span>
          <span class="metric-value">\${data.metrics.application.latency.average}ms</span>
        </div>
        <div class="metric">
          <span class="metric-label">Throughput</span>
          <span class="metric-value">\${data.metrics.application.throughput.requestsPerSecond} req/s</span>
        </div>
      \`;
      document.getElementById('app-metrics').innerHTML = appMetricsHtml;

      // Update error rate
      const errorRate = (data.metrics.application.requests.errorRate * 100).toFixed(2);
      document.getElementById('error-rate').innerHTML = \`
        <div style="text-align: center; font-size: 48px; font-weight: bold; color: \${errorRate > 5 ? '#ef4444' : '#10b981'}">
          \${errorRate}%
        </div>
        <div style="text-align: center; color: #94a3b8; margin-top: 10px;">
          \${data.metrics.application.requests.errors} errors / \${data.metrics.application.requests.total} total
        </div>
      \`;

      // Update services status
      const servicesHtml = data.health.services.map(service => \`
        <div class="metric">
          <span class="metric-label">\${service.name}</span>
          <div>
            <span class="status \${service.status}">\${service.status}</span>
            <span style="color: #64748b; margin-left: 10px;">\${service.latency}ms</span>
          </div>
        </div>
      \`).join('');
      document.getElementById('services-status').innerHTML = servicesHtml;
    }

    // Error handling
    eventSource.onerror = () => {
      console.error('EventSource connection error');
      setTimeout(() => location.reload(), 5000);
    };
  </script>
</body>
</html>`;
  }

  /**
   * Shutdown dashboard
   */
  async shutdown() {
    console.log('[DASHBOARD] Shutting down...');

    // Close all SSE connections
    for (const connection of this.connections) {
      connection.end();
    }

    // Close server
    if (this.server) {
      this.server.close();
    }

    process.exit(0);
  }
}

// CLI execution
async function main() {
  const configPath = path.join(process.cwd(), 'config/monitoring/monitoring-config.json');

  try {
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    const dashboard = new MonitoringDashboard(config);
    await dashboard.start();
  } catch (error) {
    console.error('[DASHBOARD] Error:', error.message);
    process.exit(1);
  }
}

module.exports = MonitoringDashboard;

if (require.main === module) {
  main();
}
