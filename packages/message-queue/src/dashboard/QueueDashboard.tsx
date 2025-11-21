/**
 * Queue Dashboard HTML Generator
 *
 * Generates HTML for a real-time monitoring dashboard for the message queue system.
 * This creates a static HTML page that can be served by the backend.
 */

// Dashboard data interfaces
interface QueueMetrics {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  waitingJobs: number;
  averageProcessingTime: number;
  throughputPerMinute: number;
  errorRate: number;
}

interface WorkerStatus {
  id: string;
  status: 'idle' | 'busy' | 'error';
  currentJob?: string;
  jobsProcessed: number;
  uptime: number;
  memoryUsage: number;
}

interface JobTypeStats {
  type: string;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  averageDuration: number;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

/**
 * Queue Dashboard Generator
 *
 * Generates HTML dashboard for monitoring the message queue system.
 */
export class QueueDashboardGenerator {
  private refreshInterval: number;

  constructor(refreshInterval: number = 5000) {
    this.refreshInterval = refreshInterval;
  }

  /**
   * Generate the complete HTML dashboard
   */
  generateDashboard(
    metrics: QueueMetrics,
    workers: WorkerStatus[],
    jobStats: JobTypeStats[],
    alerts: Alert[]
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Message Queue Dashboard</title>
    <style>
        ${this.getCSS()}
    </style>
</head>
<body>
    <div class="queue-dashboard">
        <header class="dashboard-header">
            <h1>Message Queue Dashboard</h1>
            <div class="dashboard-controls">
                <select id="timeRange">
                    <option value="1h">Last Hour</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                </select>
                <button onclick="refreshDashboard()">Refresh</button>
                <div id="lastUpdate" class="last-update">Last updated: ${new Date().toLocaleTimeString()}</div>
            </div>
        </header>

        <!-- Key Metrics -->
        <section class="metrics-grid">
            ${this.generateMetricsCards(metrics)}
        </section>

        <!-- Worker Status -->
        <section class="workers-section">
            <h2>Worker Status</h2>
            <div class="workers-grid">
                ${workers.map((worker) => this.generateWorkerCard(worker)).join('')}
            </div>
        </section>

        <!-- Job Type Statistics -->
        <section class="job-stats-section">
            <h2>Job Type Statistics</h2>
            <div class="job-stats-table">
                <table>
                    <thead>
                        <tr>
                            <th>Job Type</th>
                            <th>Queued</th>
                            <th>Processing</th>
                            <th>Completed</th>
                            <th>Failed</th>
                            <th>Avg Duration</th>
                            <th>Success Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${jobStats.map((stat) => this.generateJobStatRow(stat)).join('')}
                    </tbody>
                </table>
            </div>
        </section>

        <!-- System Alerts -->
        <section class="alerts-section">
            <h2>System Alerts</h2>
            <div class="alerts-list">
                ${
                  alerts.length === 0
                    ? '<p class="no-alerts">No active alerts</p>'
                    : alerts.map((alert) => this.generateAlert(alert)).join('')
                }
            </div>
        </section>

        <!-- Quick Actions -->
        <section class="actions-section">
            <h2>Quick Actions</h2>
            <div class="action-buttons">
                <button class="action-btn primary" onclick="pauseAllQueues()">Pause All Queues</button>
                <button class="action-btn secondary" onclick="resumeAllQueues()">Resume All Queues</button>
                <button class="action-btn warning" onclick="clearFailedJobs()">Clear Failed Jobs</button>
                <button class="action-btn danger" onclick="emergencyStop()">Emergency Stop</button>
            </div>
        </section>
    </div>

    <script>
        ${this.getJavaScript()}
    </script>
</body>
</html>`;
  }

  /**
   * Generate metrics cards HTML
   */
  private generateMetricsCards(metrics: QueueMetrics): string {
    const cards = [
      { title: 'Total Jobs', value: this.formatNumber(metrics.totalJobs), class: '' },
      { title: 'Active Jobs', value: metrics.activeJobs.toString(), class: 'active' },
      {
        title: 'Completed Jobs',
        value: this.formatNumber(metrics.completedJobs),
        class: 'success',
      },
      { title: 'Failed Jobs', value: metrics.failedJobs.toString(), class: 'error' },
      { title: 'Waiting Jobs', value: metrics.waitingJobs.toString(), class: 'warning' },
      {
        title: 'Avg Processing Time',
        value: this.formatDuration(metrics.averageProcessingTime),
        class: '',
      },
      { title: 'Throughput/min', value: metrics.throughputPerMinute.toFixed(1), class: '' },
      {
        title: 'Error Rate',
        value: `${metrics.errorRate.toFixed(1)}%`,
        class: metrics.errorRate > 5 ? 'error' : 'success',
      },
    ];

    return cards
      .map(
        (card) => `
      <div class="metric-card">
        <h3>${card.title}</h3>
        <div class="metric-value ${card.class}">${card.value}</div>
      </div>
    `
      )
      .join('');
  }

  /**
   * Generate worker card HTML
   */
  private generateWorkerCard(worker: WorkerStatus): string {
    return `
      <div class="worker-card status-${worker.status}">
        <div class="worker-header">
          <h4>${worker.id}</h4>
          <span class="status-badge ${worker.status}">${worker.status.toUpperCase()}</span>
        </div>
        <div class="worker-details">
          <div class="worker-metric">
            <span class="label">Jobs Processed:</span>
            <span class="value">${worker.jobsProcessed}</span>
          </div>
          <div class="worker-metric">
            <span class="label">Uptime:</span>
            <span class="value">${this.formatDuration(worker.uptime)}</span>
          </div>
          <div class="worker-metric">
            <span class="label">Memory:</span>
            <span class="value">${worker.memoryUsage.toFixed(1)}%</span>
          </div>
          ${
            worker.currentJob
              ? `
            <div class="worker-metric">
              <span class="label">Current Job:</span>
              <span class="value">${worker.currentJob}</span>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  /**
   * Generate job statistics table row
   */
  private generateJobStatRow(stat: JobTypeStats): string {
    const total = stat.queued + stat.processing + stat.completed + stat.failed;
    const successRate = total > 0 ? (stat.completed / total) * 100 : 0;

    return `
      <tr>
        <td>${stat.type}</td>
        <td class="queued">${stat.queued}</td>
        <td class="processing">${stat.processing}</td>
        <td class="completed">${stat.completed}</td>
        <td class="failed">${stat.failed}</td>
        <td>${this.formatDuration(stat.averageDuration)}</td>
        <td class="${successRate < 95 ? 'warning' : 'success'}">${successRate.toFixed(1)}%</td>
      </tr>
    `;
  }

  /**
   * Generate alert HTML
   */
  private generateAlert(alert: Alert): string {
    return `
      <div class="alert alert-${alert.type} ${alert.resolved ? 'resolved' : ''}">
        <div class="alert-header">
          <span class="alert-type ${alert.type}">${alert.type.toUpperCase()}</span>
          <span class="alert-time">${alert.timestamp.toLocaleTimeString()}</span>
          ${alert.resolved ? '<span class="resolved-badge">RESOLVED</span>' : ''}
        </div>
        <div class="alert-message">${alert.message}</div>
      </div>
    `;
  }

  /**
   * Format duration helper
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  /**
   * Format number helper
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  /**
   * Get CSS styles
   */
  private getCSS(): string {
    return `
      .queue-dashboard {
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background-color: #f5f5f5;
        min-height: 100vh;
      }

      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }

      .dashboard-header h1 {
        margin: 0;
        color: #333;
      }

      .dashboard-controls {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .dashboard-controls select, .dashboard-controls button {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
      }

      .last-update {
        font-size: 14px;
        color: #666;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }

      .metric-card {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        text-align: center;
      }

      .metric-card h3 {
        margin: 0 0 10px 0;
        color: #666;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .metric-value {
        font-size: 32px;
        font-weight: bold;
        color: #333;
      }

      .metric-value.active { color: #007bff; }
      .metric-value.success { color: #28a745; }
      .metric-value.error { color: #dc3545; }
      .metric-value.warning { color: #ffc107; }

      .workers-section, .job-stats-section, .alerts-section, .actions-section {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-bottom: 20px;
      }

      .workers-section h2, .job-stats-section h2, .alerts-section h2, .actions-section h2 {
        margin: 0 0 20px 0;
        color: #333;
      }

      .workers-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 15px;
      }

      .worker-card {
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 15px;
      }

      .worker-card.status-idle { border-color: #28a745; }
      .worker-card.status-busy { border-color: #007bff; }
      .worker-card.status-error { border-color: #dc3545; }

      .worker-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .worker-header h4 {
        margin: 0;
        color: #333;
      }

      .status-badge {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
      }

      .status-badge.idle { background: #d4edda; color: #155724; }
      .status-badge.busy { background: #cce7ff; color: #004085; }
      .status-badge.error { background: #f8d7da; color: #721c24; }

      .worker-details {
        display: grid;
        gap: 5px;
      }

      .worker-metric {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
      }

      .worker-metric .label { color: #666; }
      .worker-metric .value { font-weight: 500; }

      .job-stats-table table {
        width: 100%;
        border-collapse: collapse;
      }

      .job-stats-table th, .job-stats-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }

      .job-stats-table th {
        background: #f8f9fa;
        font-weight: 600;
        color: #333;
      }

      .job-stats-table .queued { color: #007bff; }
      .job-stats-table .processing { color: #ffc107; }
      .job-stats-table .completed { color: #28a745; }
      .job-stats-table .failed { color: #dc3545; }
      .job-stats-table .warning { color: #fd7e14; }
      .job-stats-table .success { color: #28a745; }

      .alerts-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .alert {
        padding: 15px;
        border-radius: 6px;
        border-left: 4px solid;
      }

      .alert-error { border-left-color: #dc3545; background: #f8d7da; }
      .alert-warning { border-left-color: #ffc107; background: #fff3cd; }
      .alert-info { border-left-color: #17a2b8; background: #d1ecf1; }

      .alert.resolved { opacity: 0.6; }

      .alert-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
      }

      .alert-type {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
      }

      .alert-error .alert-type { background: #dc3545; color: white; }
      .alert-warning .alert-type { background: #ffc107; color: #212529; }
      .alert-info .alert-type { background: #17a2b8; color: white; }

      .alert-time { color: #666; font-size: 14px; }
      .resolved-badge { color: #28a745; font-size: 12px; font-weight: bold; }

      .alert-message { color: #333; }

      .no-alerts {
        text-align: center;
        color: #666;
        font-style: italic;
        margin: 20px 0;
      }

      .action-buttons {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .action-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .action-btn.primary { background: #007bff; color: white; }
      .action-btn.secondary { background: #6c757d; color: white; }
      .action-btn.warning { background: #ffc107; color: #212529; }
      .action-btn.danger { background: #dc3545; color: white; }

      .action-btn:hover {
        opacity: 0.9;
      }
    `;
  }

  /**
   * Get JavaScript for interactivity
   */
  private getJavaScript(): string {
    return `
      let refreshInterval;

      function refreshDashboard() {
        // In a real implementation, this would fetch data from the API
        document.getElementById('lastUpdate').textContent =
          'Last updated: ' + new Date().toLocaleTimeString();

        // Simulate data refresh (in real app, make API call)
        console.log('Refreshing dashboard data...');
      }

      function pauseAllQueues() {
        if (confirm('Are you sure you want to pause all queues?')) {
          // In real implementation, make API call to pause queues
          alert('All queues paused');
        }
      }

      function resumeAllQueues() {
        if (confirm('Are you sure you want to resume all queues?')) {
          // In real implementation, make API call to resume queues
          alert('All queues resumed');
        }
      }

      function clearFailedJobs() {
        if (confirm('Are you sure you want to clear all failed jobs?')) {
          // In real implementation, make API call to clear failed jobs
          alert('Failed jobs cleared');
        }
      }

      function emergencyStop() {
        if (confirm('EMERGENCY STOP: Are you sure you want to stop all queue processing?')) {
          // In real implementation, make API call for emergency stop
          alert('Emergency stop activated');
        }
      }

      // Auto-refresh functionality
      function startAutoRefresh() {
        refreshInterval = setInterval(refreshDashboard, ${this.refreshInterval});
      }

      function stopAutoRefresh() {
        if (refreshInterval) {
          clearInterval(refreshInterval);
        }
      }

      // Start auto-refresh when page loads
      window.addEventListener('load', startAutoRefresh);

      // Stop auto-refresh when page unloads
      window.addEventListener('beforeunload', stopAutoRefresh);
    `;
  }

  /**
   * Generate mock data for testing
   */
  static generateMockData() {
    const metrics: QueueMetrics = {
      totalJobs: 1250,
      activeJobs: 15,
      completedJobs: 1180,
      failedJobs: 55,
      waitingJobs: 25,
      averageProcessingTime: 2450,
      throughputPerMinute: 12.5,
      errorRate: 4.4,
    };

    const workers: WorkerStatus[] = [
      {
        id: 'worker-1',
        status: 'busy',
        currentJob: 'email-job-123',
        jobsProcessed: 245,
        uptime: 3600000,
        memoryUsage: 85.2,
      },
      { id: 'worker-2', status: 'idle', jobsProcessed: 198, uptime: 3600000, memoryUsage: 42.1 },
      {
        id: 'worker-3',
        status: 'busy',
        currentJob: 'report-job-456',
        jobsProcessed: 312,
        uptime: 3600000,
        memoryUsage: 78.9,
      },
      { id: 'worker-4', status: 'error', jobsProcessed: 156, uptime: 3500000, memoryUsage: 0 },
    ];

    const jobStats: JobTypeStats[] = [
      {
        type: 'EmailJob',
        queued: 5,
        processing: 2,
        completed: 450,
        failed: 12,
        averageDuration: 1200,
      },
      {
        type: 'ReportGenerationJob',
        queued: 3,
        processing: 1,
        completed: 89,
        failed: 3,
        averageDuration: 8500,
      },
      {
        type: 'DataExportJob',
        queued: 1,
        processing: 1,
        completed: 34,
        failed: 1,
        averageDuration: 15600,
      },
      {
        type: 'WebhookJob',
        queued: 8,
        processing: 3,
        completed: 234,
        failed: 8,
        averageDuration: 800,
      },
      {
        type: 'AnalyticsJob',
        queued: 2,
        processing: 1,
        completed: 67,
        failed: 2,
        averageDuration: 12400,
      },
      {
        type: 'BackupJob',
        queued: 1,
        processing: 0,
        completed: 23,
        failed: 0,
        averageDuration: 28800,
      },
    ];

    const alerts: Alert[] = [
      {
        id: 'alert-1',
        type: 'error',
        message: 'Worker worker-4 has stopped responding',
        timestamp: new Date(Date.now() - 300000),
        resolved: false,
      },
      {
        id: 'alert-2',
        type: 'warning',
        message: 'Error rate exceeded 5% threshold',
        timestamp: new Date(Date.now() - 600000),
        resolved: false,
      },
      {
        id: 'alert-3',
        type: 'info',
        message: 'System maintenance completed successfully',
        timestamp: new Date(Date.now() - 1800000),
        resolved: true,
      },
    ];

    return { metrics, workers, jobStats, alerts };
  }
}

export default QueueDashboardGenerator;
