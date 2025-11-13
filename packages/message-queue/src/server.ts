#!/usr/bin/env node

/**
 * Message Queue API Server Entry Point
 */

import winston from 'winston';
import { MessageQueueAPIServer } from './APIServer';
import { QueueManager } from './QueueManager';

// Default configuration
const DEFAULT_CONFIG = {
  port: parseInt(process.env.API_PORT || '8081'),
  host: process.env.API_HOST || '0.0.0.0',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  enableWebSocket: process.env.ENABLE_WEBSOCKET !== 'false',
  enableMetrics: process.env.ENABLE_METRICS !== 'false',
  authEnabled: process.env.AUTH_ENABLED === 'true',
};

// Queue manager configuration
const QUEUE_CONFIG = {
  defaultProvider: 'redis',
  providers: [
    {
      name: 'redis',
      type: 'redis',
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    },
  ],
  queues: {
    default: { provider: 'redis' },
    'jobs-default': { provider: 'redis' },
    'high-priority': { provider: 'redis' },
    'low-priority': { provider: 'redis' },
  },
  monitoring: {
    enabled: true,
    metricsInterval: 30000, // 30 seconds
    healthCheckInterval: 60000, // 1 minute
  },
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 1000,
  },
};

async function main() {
  // Create logger
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      }),
      new winston.transports.File({
        filename: 'logs/queue-api-server.log',
      }),
    ],
  });

  try {
    logger.info('Starting Message Queue API Server');

    // Create and start queue manager
    const queueManager = new QueueManager({
      config: QUEUE_CONFIG,
      logger,
      enableMonitoring: true,
      enableHealthChecks: true,
    });

    await queueManager.start();
    logger.info('Queue Manager started successfully');

    // Create and start API server
    const apiServer = new MessageQueueAPIServer(queueManager, DEFAULT_CONFIG);
    await apiServer.start();

    logger.info('Message Queue API Server started successfully', {
      port: DEFAULT_CONFIG.port,
      host: DEFAULT_CONFIG.host,
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');

      try {
        await apiServer.stop();
        logger.info('API Server stopped');
      } catch (error) {
        logger.error('Error stopping API server', { error });
      }

      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');

      try {
        await apiServer.stop();
        logger.info('API Server stopped');
      } catch (error) {
        logger.error('Error stopping API server', { error });
      }

      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
main();
