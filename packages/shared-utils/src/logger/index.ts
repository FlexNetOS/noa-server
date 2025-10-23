/**
 * Consolidated logger utility using Winston
 * Eliminates duplication across packages by providing a unified logging interface
 */

import winston from 'winston';
import { LoggerConfig, LogContext } from './types';

/**
 * Create a configured logger instance
 *
 * @param config - Logger configuration
 * @returns Winston logger instance
 *
 * @example
 * ```ts
 * const logger = createLogger({
 *   service: 'auth-service',
 *   module: 'AuthController',
 *   level: 'info',
 *   file: true
 * });
 *
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Authentication failed', { error: err });
 * ```
 */
export function createLogger(config: LoggerConfig): winston.Logger {
  const {
    service,
    module,
    level = 'info',
    console: enableConsole = true,
    file: enableFile = false,
    logDir = 'logs',
    colorize = true,
    defaultMeta = {},
    json = false,
  } = config;

  const transports: winston.transport[] = [];

  // Console transport
  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          colorize ? winston.format.colorize() : winston.format.uncolorize(),
          winston.format.printf(({ timestamp, level, message, module: logModule, ...meta }) => {
            const moduleStr = logModule || module || '';
            const metaStr = Object.keys(meta).length && !json ? JSON.stringify(meta) : '';
            return `${timestamp} [${moduleStr}] ${level}: ${message} ${metaStr}`.trim();
          })
        ),
      })
    );
  }

  // File transports
  if (enableFile) {
    // Error logs
    transports.push(
      new winston.transports.File({
        filename: `${logDir}/${service}-error.log`,
        level: 'error',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      })
    );

    // Combined logs
    transports.push(
      new winston.transports.File({
        filename: `${logDir}/${service}.log`,
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      })
    );
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      json ? winston.format.json() : winston.format.simple()
    ),
    defaultMeta: {
      service,
      module,
      ...defaultMeta,
    },
    transports,
  });
}

/**
 * Express middleware logger factory
 * Creates a middleware function for HTTP request/response logging
 *
 * @param logger - Winston logger instance
 * @returns Express middleware function
 *
 * @example
 * ```ts
 * import express from 'express';
 *
 * const logger = createLogger({ service: 'api', module: 'http' });
 * const app = express();
 *
 * app.use(createHttpLogger(logger));
 * ```
 */
export function createHttpLogger(logger: winston.Logger) {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const { method, url, ip } = req;

    logger.info(`${method} ${url}`, {
      ip,
      userAgent: req.get('user-agent'),
    });

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

      logger.log(level, `${method} ${url} - ${statusCode}`, {
        statusCode,
        duration,
        ip,
      });
    });

    next();
  };
}

/**
 * Create a child logger with additional context
 *
 * @param logger - Parent logger instance
 * @param context - Additional context metadata
 * @returns Child logger with merged metadata
 *
 * @example
 * ```ts
 * const baseLogger = createLogger({ service: 'api' });
 * const requestLogger = createChildLogger(baseLogger, { requestId: 'req-123' });
 *
 * requestLogger.info('Processing request'); // Will include requestId in metadata
 * ```
 */
export function createChildLogger(
  logger: winston.Logger,
  context: LogContext
): winston.Logger {
  return logger.child(context);
}

/**
 * Log levels enum for type safety
 */
export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly',
} as const;

export type { LoggerConfig, LogContext };
