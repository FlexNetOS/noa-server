/**
 * LoggerFactory - Unified logger creation and management
 *
 * Features:
 * - Centralized logger configuration
 * - Multiple transport support (console, file, remote)
 * - Structured logging with consistent formatting
 * - Log level management per module
 * - Performance-optimized with lazy initialization
 * - Correlation ID support for distributed tracing
 * - Log sampling and filtering
 * - Integration with monitoring systems
 *
 * @module unified/utils/LoggerFactory
 */

import winston from 'winston';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

/**
 * Log level enumeration
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}

/**
 * Logger configuration schema
 */
export const LoggerConfigSchema = z.object({
  level: z.nativeEnum(LogLevel).default(LogLevel.INFO),
  format: z.enum(['json', 'simple', 'colorized']).default('json'),
  transports: z.object({
    console: z.object({
      enabled: z.boolean().default(true),
      level: z.nativeEnum(LogLevel).optional(),
      colorize: z.boolean().default(true),
    }).optional(),
    file: z.object({
      enabled: z.boolean().default(true),
      level: z.nativeEnum(LogLevel).optional(),
      directory: z.string().default('logs'),
      filename: z.string().default('application.log'),
      maxSize: z.number().default(10485760), // 10MB
      maxFiles: z.number().default(5),
      errorFilename: z.string().default('error.log'),
    }).optional(),
    http: z.object({
      enabled: z.boolean().default(false),
      endpoint: z.string().optional(),
      headers: z.record(z.string(), z.string()).optional(),
    }).optional(),
  }).optional(),
  metadata: z.object({
    service: z.string().default('noa-server'),
    environment: z.string().default(process.env.NODE_ENV || 'development'),
    version: z.string().optional(),
    hostname: z.string().optional(),
  }).optional(),
  enableCorrelationId: z.boolean().default(true),
  enableTimestamps: z.boolean().default(true),
  enableStackTrace: z.boolean().default(true),
  sampling: z.object({
    enabled: z.boolean().default(false),
    rate: z.number().min(0).max(1).default(1.0), // 1.0 = 100%
  }).optional(),
  moduleOverrides: z.record(z.string(), z.nativeEnum(LogLevel)).optional(),
});

export type LoggerConfig = z.infer<typeof LoggerConfigSchema>;

/**
 * Structured log metadata
 */
export interface LogMetadata extends Record<string, any> {
  correlationId?: string;
  module?: string;
  timestamp?: Date;
  error?: Error;
  stack?: string;
  duration?: number;
  [key: string]: any;
}

/**
 * Custom logger interface extending Winston
 */
export interface CustomLogger extends winston.Logger {
  withCorrelation(correlationId: string): CustomLogger;
  withMetadata(metadata: LogMetadata): CustomLogger;
  performance<T>(operation: string, fn: () => T | Promise<T>): Promise<T>;
}

/**
 * LoggerFactory - Factory for creating configured loggers
 *
 * @example
 * ```typescript
 * // Configure factory
 * LoggerFactory.configure({
 *   level: LogLevel.DEBUG,
 *   transports: {
 *     console: { enabled: true },
 *     file: { enabled: true, directory: './logs' }
 *   }
 * });
 *
 * // Get logger for module
 * const logger = LoggerFactory.getLogger('MyService');
 * logger.info('Service started', { port: 3000 });
 *
 * // Performance tracking
 * await logger.performance('database-query', async () => {
 *   return await db.query('SELECT * FROM users');
 * });
 *
 * // Correlation ID
 * const correlatedLogger = logger.withCorrelation('req-123');
 * correlatedLogger.info('Processing request');
 * ```
 */
export class LoggerFactory {
  private static config: LoggerConfig;
  private static loggers: Map<string, CustomLogger> = new Map();
  private static defaultConfig: LoggerConfig = LoggerConfigSchema.parse({});
  private static initialized = false;

  /**
   * Configure the logger factory
   *
   * @param config - Logger configuration
   */
  public static configure(config: Partial<LoggerConfig> = {}): void {
    this.config = LoggerConfigSchema.parse({
      ...this.defaultConfig,
      ...config,
    });
    this.initialized = true;

    // Ensure log directory exists
    const fileTransport = this.config.transports?.file;
    if (fileTransport?.enabled) {
      const logDir = fileTransport.directory || 'logs';
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }

    // Recreate existing loggers with new config
    const existingModules = Array.from(this.loggers.keys());
    this.loggers.clear();
    existingModules.forEach((module) => this.getLogger(module));
  }

  /**
   * Get logger for a specific module
   *
   * @param module - Module name
   * @returns Configured logger instance
   */
  public static getLogger(module: string): CustomLogger {
    // Return cached logger if exists
    if (this.loggers.has(module)) {
      return this.loggers.get(module)!;
    }

    // Ensure factory is initialized
    if (!this.initialized) {
      this.configure();
    }

    // Determine log level for this module
    const level = (this.config.moduleOverrides?.[module] as LogLevel | undefined) || this.config.level;

    // Create Winston logger
    const winstonLogger = winston.createLogger({
      level,
      format: this.createFormat(module),
      defaultMeta: {
        ...this.config.metadata,
        module,
      },
      transports: this.createTransports(module),
      exitOnError: false,
    });

    // Extend with custom methods
    const customLogger = this.extendLogger(winstonLogger, module);

    // Cache and return
    this.loggers.set(module, customLogger);
    return customLogger;
  }

  /**
   * Create Winston format based on configuration
   */
  private static createFormat(module: string): winston.Logform.Format {
    const formats: winston.Logform.Format[] = [];

    // Add timestamp
    if (this.config.enableTimestamps) {
      formats.push(winston.format.timestamp());
    }

    // Add error stack traces
    if (this.config.enableStackTrace) {
      formats.push(winston.format.errors({ stack: true }));
    }

    // Add metadata
    formats.push(
      winston.format.metadata({
        fillWith: ['timestamp', 'service', 'environment', 'module', 'correlationId'],
      })
    );

    // Add final format based on config
    switch (this.config.format) {
      case 'json':
        formats.push(winston.format.json());
        break;
      case 'simple':
        formats.push(
          winston.format.simple(),
          winston.format.printf(({ level, message, timestamp, module, correlationId }) => {
            const corr = correlationId ? ` [${correlationId}]` : '';
            return `${timestamp} [${level}] [${module}]${corr}: ${message}`;
          })
        );
        break;
      case 'colorized':
        formats.push(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, module, correlationId, ...meta }) => {
            const corr = correlationId ? ` [${correlationId}]` : '';
            const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} ${level} [${module}]${corr}: ${message}${metaStr}`;
          })
        );
        break;
    }

    return winston.format.combine(...formats);
  }

  /**
   * Create Winston transports based on configuration
   */
  private static createTransports(module: string): winston.transport[] {
    const transports: winston.transport[] = [];

    // Console transport
    const consoleTransport = this.config.transports?.console;
    if (consoleTransport?.enabled) {
      transports.push(
        new winston.transports.Console({
          level: consoleTransport.level || this.config.level,
          format: consoleTransport.colorize
            ? winston.format.combine(winston.format.colorize(), winston.format.simple())
            : undefined,
        })
      );
    }

    // File transports
    const fileConfig = this.config.transports?.file;
    if (fileConfig?.enabled) {
      const logPath = path.join(fileConfig.directory || 'logs', fileConfig.filename || 'application.log');
      const errorLogPath = path.join(fileConfig.directory || 'logs', fileConfig.errorFilename || 'error.log');

      // Combined log file
      transports.push(
        new winston.transports.File({
          filename: logPath,
          level: fileConfig.level || this.config.level,
          maxsize: fileConfig.maxSize || 10485760,
          maxFiles: fileConfig.maxFiles || 5,
        })
      );

      // Error-only log file
      transports.push(
        new winston.transports.File({
          filename: errorLogPath,
          level: LogLevel.ERROR,
          maxsize: fileConfig.maxSize,
          maxFiles: fileConfig.maxFiles,
        })
      );
    }

    // HTTP transport (for remote logging)
    if (this.config.transports.http.enabled && this.config.transports.http.endpoint) {
      transports.push(
        new winston.transports.Http({
          host: this.config.transports.http.endpoint,
          headers: this.config.transports.http.headers,
        })
      );
    }

    return transports;
  }

  /**
   * Extend Winston logger with custom methods
   */
  private static extendLogger(
    winstonLogger: winston.Logger,
    module: string
  ): CustomLogger {
    const customLogger = winstonLogger as CustomLogger;

    /**
     * Create logger with correlation ID
     */
    customLogger.withCorrelation = function (correlationId: string): CustomLogger {
      return this.child({ correlationId }) as CustomLogger;
    };

    /**
     * Create logger with additional metadata
     */
    customLogger.withMetadata = function (metadata: LogMetadata): CustomLogger {
      return this.child(metadata) as CustomLogger;
    };

    /**
     * Log with performance tracking
     */
    customLogger.performance = async function <T>(
      operation: string,
      fn: () => T | Promise<T>
    ): Promise<T> {
      const start = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - start;
        this.info(`Performance: ${operation}`, { operation, duration });
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        this.error(`Performance (failed): ${operation}`, {
          operation,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    };

    return customLogger;
  }

  /**
   * Check if a log should be sampled
   */
  private static shouldSample(): boolean {
    if (!this.config.sampling.enabled) {
      return true;
    }
    return Math.random() < this.config.sampling.rate;
  }

  /**
   * Get current configuration
   */
  public static getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Set log level for all loggers
   */
  public static setGlobalLevel(level: LogLevel): void {
    this.config.level = level;
    this.loggers.forEach((logger) => {
      logger.level = level;
    });
  }

  /**
   * Set log level for specific module
   */
  public static setModuleLevel(module: string, level: LogLevel): void {
    if (!this.config.moduleOverrides) {
      this.config.moduleOverrides = {};
    }
    this.config.moduleOverrides[module] = level;
    const logger = this.loggers.get(module);
    if (logger) {
      logger.level = level;
    }
  }

  /**
   * Clear all cached loggers (useful for testing)
   */
  public static reset(): void {
    this.loggers.clear();
    this.initialized = false;
    this.config = this.defaultConfig;
  }

  /**
   * Shutdown all loggers
   */
  public static async shutdown(): Promise<void> {
    const shutdownPromises = Array.from(this.loggers.values()).map(
      (logger) =>
        new Promise<void>((resolve) => {
          logger.on('finish', resolve);
          logger.end();
        })
    );

    await Promise.all(shutdownPromises);
    this.loggers.clear();
  }
}

/**
 * Convenience function to get a logger
 */
export const getLogger = (module: string): CustomLogger => {
  return LoggerFactory.getLogger(module);
};

export default LoggerFactory;
