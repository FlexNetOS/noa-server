import winston, { Logger, createLogger, format, transports } from 'winston';
import { ElasticsearchTransport } from './transports/ElasticsearchTransport.js';
import { FileTransport } from './transports/FileTransport.js';
import { ConsoleTransport } from './transports/ConsoleTransport.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

/**
 * Log aggregator configuration schema
 */
const LogAggregatorConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  serviceName: z.string(),
  environment: z.string().default('development'),
  defaultMetadata: z.record(z.any()).optional(),
  enableConsole: z.boolean().default(true),
  enableFile: z.boolean().default(true),
  enableElasticsearch: z.boolean().default(false),
  elasticsearch: z.object({
    node: z.string().default('http://localhost:9200'),
    index: z.string().default('logs'),
    username: z.string().optional(),
    password: z.string().optional(),
  }).optional(),
  file: z.object({
    directory: z.string().default('./logs'),
    filename: z.string().default('application-%DATE%.log'),
    datePattern: z.string().default('YYYY-MM-DD'),
    maxSize: z.string().default('20m'),
    maxFiles: z.string().default('14d'),
    compress: z.boolean().default(true),
  }).optional(),
});

export type LogAggregatorConfig = z.infer<typeof LogAggregatorConfigSchema>;

/**
 * Log levels type
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

/**
 * Log metadata interface
 */
export interface LogMetadata {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  [key: string]: any;
}

/**
 * Comprehensive log aggregator with multiple transports
 */
export class LogAggregator {
  private logger: Logger;
  private config: LogAggregatorConfig;
  private correlationId: string;
  private transportInstances: any[] = [];

  constructor(config: LogAggregatorConfig) {
    this.config = LogAggregatorConfigSchema.parse(config);
    this.correlationId = uuidv4();

    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger with configured transports
   */
  private createLogger(): Logger {
    const loggerTransports: any[] = [];

    // Console transport
    if (this.config.enableConsole) {
      const consoleTransport = new ConsoleTransport({
        level: this.config.level,
        serviceName: this.config.serviceName,
        environment: this.config.environment,
      });
      loggerTransports.push(consoleTransport.getTransport());
      this.transportInstances.push(consoleTransport);
    }

    // File transport
    if (this.config.enableFile && this.config.file) {
      const fileTransport = new FileTransport({
        level: this.config.level,
        serviceName: this.config.serviceName,
        ...this.config.file,
      });
      loggerTransports.push(fileTransport.getTransport());
      this.transportInstances.push(fileTransport);
    }

    // Elasticsearch transport
    if (this.config.enableElasticsearch && this.config.elasticsearch) {
      const esTransport = new ElasticsearchTransport({
        level: this.config.level,
        serviceName: this.config.serviceName,
        environment: this.config.environment,
        ...this.config.elasticsearch,
      });
      loggerTransports.push(esTransport.getTransport());
      this.transportInstances.push(esTransport);
    }

    return createLogger({
      level: this.config.level,
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      ),
      defaultMeta: {
        service: this.config.serviceName,
        environment: this.config.environment,
        ...this.config.defaultMetadata,
      },
      transports: loggerTransports,
      exitOnError: false,
    });
  }

  /**
   * Log an error message
   */
  public error(message: string, metadata?: LogMetadata): void {
    this.log('error', message, metadata);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, metadata);
  }

  /**
   * Log an info message
   */
  public info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, metadata);
  }

  /**
   * Log an HTTP message
   */
  public http(message: string, metadata?: LogMetadata): void {
    this.log('http', message, metadata);
  }

  /**
   * Log a verbose message
   */
  public verbose(message: string, metadata?: LogMetadata): void {
    this.log('verbose', message, metadata);
  }

  /**
   * Log a debug message
   */
  public debug(message: string, metadata?: LogMetadata): void {
    this.log('debug', message, metadata);
  }

  /**
   * Log a silly message
   */
  public silly(message: string, metadata?: LogMetadata): void {
    this.log('silly', message, metadata);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    const logData: LogMetadata = {
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    this.logger.log(level, message, logData);
  }

  /**
   * Log an exception with stack trace
   */
  public logException(error: Error, metadata?: LogMetadata): void {
    this.logger.error('Exception occurred', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      correlationId: this.correlationId,
      ...metadata,
    });
  }

  /**
   * Log a structured event
   */
  public logEvent(
    eventName: string,
    eventData: Record<string, any>,
    level: LogLevel = 'info'
  ): void {
    this.log(level, eventName, {
      event: eventName,
      eventData,
    });
  }

  /**
   * Create a child logger with additional default metadata
   */
  public child(metadata: LogMetadata): LogAggregator {
    const childConfig = {
      ...this.config,
      defaultMetadata: {
        ...this.config.defaultMetadata,
        ...metadata,
      },
    };

    return new LogAggregator(childConfig);
  }

  /**
   * Set correlation ID for request tracking
   */
  public setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Get current correlation ID
   */
  public getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Generate new correlation ID
   */
  public generateCorrelationId(): string {
    this.correlationId = uuidv4();
    return this.correlationId;
  }

  /**
   * Set log level
   */
  public setLevel(level: LogLevel): void {
    this.logger.level = level;
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  public getLevel(): string {
    return this.logger.level;
  }

  /**
   * Add a custom transport
   */
  public addTransport(transport: any): void {
    this.logger.add(transport);
  }

  /**
   * Remove a transport
   */
  public removeTransport(transport: any): void {
    this.logger.remove(transport);
  }

  /**
   * Query logs (primarily for Elasticsearch)
   */
  public async queryLogs(query: {
    from?: Date;
    to?: Date;
    level?: LogLevel;
    search?: string;
    limit?: number;
  }): Promise<any[]> {
    const esTransport = this.transportInstances.find(
      (t) => t instanceof ElasticsearchTransport
    );

    if (!esTransport) {
      throw new Error('Elasticsearch transport not enabled');
    }

    return esTransport.query(query);
  }

  /**
   * Get the underlying Winston logger
   */
  public getLogger(): Logger {
    return this.logger;
  }

  /**
   * Close all transports
   */
  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.end(() => {
        // Clean up transport instances
        this.transportInstances.forEach((transport) => {
          if (typeof transport.close === 'function') {
            transport.close();
          }
        });
        resolve();
      });
    });
  }

  /**
   * Flush all pending logs
   */
  public async flush(): Promise<void> {
    // Winston doesn't have a built-in flush method
    // This is a placeholder for future implementation
    return Promise.resolve();
  }

  /**
   * Get logger statistics
   */
  public getStats(): {
    level: string;
    transports: number;
    correlationId: string;
  } {
    return {
      level: this.config.level,
      transports: this.logger.transports.length,
      correlationId: this.correlationId,
    };
  }
}
