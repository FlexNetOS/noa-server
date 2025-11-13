import { Router, Request, Response } from 'express';
import { logManager } from '../utils/log-manager';
import {
  getMetrics,
  getPrometheusMetrics,
  getJSONMetrics
} from '../middleware/metrics-collector';
import {
  getErrorStats,
  getErrorRate
} from '../middleware/error-tracker';
import { getPerformanceStats } from '../middleware/performance-monitor';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const router = Router();

// WebSocket server for log streaming
let wss: WebSocketServer | null = null;

/**
 * Initialize WebSocket server for log streaming
 */
export function initializeLogStreaming(httpServer: any): void {
  wss = new WebSocketServer({ server: httpServer, path: '/logs/stream' });

  wss.on('connection', (ws: WebSocket) => {
    logManager.info('Log streaming client connected');

    // Send initial connection message
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
      message: 'Connected to log stream'
    }));

    // Handle client messages
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        logManager.debug('Log stream client message', { data });
      } catch (error) {
        logManager.warn('Invalid message from log stream client');
      }
    });

    ws.on('close', () => {
      logManager.info('Log streaming client disconnected');
    });

    ws.on('error', (error) => {
      logManager.error('Log streaming WebSocket error', { error: error.message });
    });
  });
}

/**
 * Broadcast log to all connected WebSocket clients
 */
export function broadcastLog(logEntry: any): void {
  if (!wss) return;

  const message = JSON.stringify({
    type: 'log',
    timestamp: new Date().toISOString(),
    data: logEntry
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Prometheus metrics
 *     description: Returns metrics in Prometheus exposition format
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Prometheus metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await getPrometheusMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics);
  } catch (error: any) {
    logManager.error('Failed to generate Prometheus metrics', {
      error: error.message
    });
    res.status(500).json({
      error: 'Failed to generate metrics',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /metrics/api:
 *   get:
 *     summary: API metrics (JSON)
 *     description: Returns API-specific metrics in JSON format
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: API metrics
 */
router.get('/metrics/api', async (req: Request, res: Response) => {
  try {
    const metrics = getJSONMetrics();
    res.json(metrics);
  } catch (error: any) {
    logManager.error('Failed to generate JSON metrics', {
      error: error.message
    });
    res.status(500).json({
      error: 'Failed to generate metrics',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /metrics/performance:
 *   get:
 *     summary: Performance metrics
 *     description: Returns performance statistics and percentiles
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Performance metrics
 */
router.get('/metrics/performance', async (req: Request, res: Response) => {
  try {
    const stats = getPerformanceStats();
    res.json({
      timestamp: new Date().toISOString(),
      ...stats
    });
  } catch (error: any) {
    logManager.error('Failed to get performance stats', {
      error: error.message
    });
    res.status(500).json({
      error: 'Failed to get performance statistics',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /metrics/errors:
 *   get:
 *     summary: Error metrics
 *     description: Returns error statistics and rates
 *     tags: [Monitoring]
 *     parameters:
 *       - in: query
 *         name: window
 *         schema:
 *           type: integer
 *           default: 300000
 *         description: Time window in milliseconds (default 5 minutes)
 *     responses:
 *       200:
 *         description: Error metrics
 */
router.get('/metrics/errors', async (req: Request, res: Response) => {
  try {
    const window = parseInt(req.query.window as string) || 300000;
    const errorRate = getErrorRate(window);
    const errorStats = getErrorStats();

    res.json({
      timestamp: new Date().toISOString(),
      window: window,
      errorRate,
      totalErrors: errorStats.size,
      details: Array.from(errorStats.entries()).map(([key, stats]) => ({
        error: key,
        count: stats.count,
        lastOccurrence: stats.lastOccurrence,
        recentExamples: stats.examples.slice(0, 3)
      }))
    });
  } catch (error: any) {
    logManager.error('Failed to get error stats', {
      error: error.message
    });
    res.status(500).json({
      error: 'Failed to get error statistics',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Real-time API status
 *     description: Returns current API status with key metrics
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: API status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const metrics = getMetrics();
    const performanceStats = getPerformanceStats();
    const errorRate = getErrorRate(300000); // 5 minutes

    const status = {
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      performance: {
        throughput: metrics.performance.throughput,
        activeConnections: metrics.performance.activeConnections,
        averageDuration: performanceStats.averageDuration,
        percentiles: performanceStats.percentiles
      },
      requests: {
        total: metrics.requests.total,
        successRate: metrics.responses['2xx'] / metrics.requests.total * 100,
        errorRate: (metrics.responses['4xx'] + metrics.responses['5xx']) /
                   metrics.requests.total * 100
      },
      errors: {
        total: errorRate.total,
        byCategory: errorRate.byCategory,
        topErrors: errorRate.topErrors.slice(0, 5)
      },
      cache: {
        hitRate: (metrics.cache.hitRate * 100).toFixed(2) + '%',
        hits: metrics.cache.hits,
        misses: metrics.cache.misses
      },
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss
      }
    };

    res.json(status);
  } catch (error: any) {
    logManager.error('Failed to get API status', {
      error: error.message
    });
    res.status(500).json({
      error: 'Failed to get API status',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /logs/search:
 *   get:
 *     summary: Search logs
 *     description: Search and filter logs
 *     tags: [Monitoring]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [debug, info, warn, error]
 *         description: Log level filter
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of results
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start time for log search
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End time for log search
 *     responses:
 *       200:
 *         description: Log search results
 */
router.get('/logs/search', async (req: Request, res: Response) => {
  try {
    const query: any = {
      level: req.query.level as string,
      search: req.query.search as string,
      limit: parseInt(req.query.limit as string) || 100
    };

    if (req.query.startTime) {
      query.startTime = new Date(req.query.startTime as string);
    }
    if (req.query.endTime) {
      query.endTime = new Date(req.query.endTime as string);
    }

    const logs = await logManager.searchLogs(query);

    res.json({
      timestamp: new Date().toISOString(),
      query,
      count: logs.length,
      logs
    });
  } catch (error: any) {
    logManager.error('Failed to search logs', {
      error: error.message,
      query: req.query
    });
    res.status(500).json({
      error: 'Failed to search logs',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /logs/export:
 *   get:
 *     summary: Export logs
 *     description: Export logs in JSON or CSV format
 *     tags: [Monitoring]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Export format
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: Log level filter
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Exported logs
 */
router.get('/logs/export', async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'json';
    const query: any = {
      level: req.query.level as string,
      search: req.query.search as string
    };

    const exported = await logManager.exportLogs(
      format as 'json' | 'csv',
      query
    );

    const contentType = format === 'json'
      ? 'application/json'
      : 'text/csv';

    const filename = `logs-${new Date().toISOString()}.${format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exported);
  } catch (error: any) {
    logManager.error('Failed to export logs', {
      error: error.message,
      format: req.query.format
    });
    res.status(500).json({
      error: 'Failed to export logs',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /logs/stats:
 *   get:
 *     summary: Log statistics
 *     description: Returns statistics about stored logs
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Log statistics
 */
router.get('/logs/stats', async (req: Request, res: Response) => {
  try {
    const stats = await logManager.getLogStats();

    res.json({
      timestamp: new Date().toISOString(),
      ...stats,
      totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2)
    });
  } catch (error: any) {
    logManager.error('Failed to get log stats', {
      error: error.message
    });
    res.status(500).json({
      error: 'Failed to get log statistics',
      message: error.message
    });
  }
});

export default router;
