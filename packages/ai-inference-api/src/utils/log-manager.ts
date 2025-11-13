import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import zlib from 'zlib';
import monitoringConfig from '../config/monitoring-config.json';

const gzip = promisify(zlib.gzip);

interface LogQuery {
  level?: string;
  startTime?: Date;
  endTime?: Date;
  search?: string;
  limit?: number;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  requestId?: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Log Manager - Comprehensive logging infrastructure with rotation, compression, and search
 */
export class LogManager {
  private logger: winston.Logger;
  private logsDir: string;
  private config: typeof monitoringConfig.logging;

  constructor() {
    this.config = monitoringConfig.logging;
    this.logsDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
    this.logger = this.createLogger();
  }

  /**
   * Ensure logs directory exists
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Create Winston logger with rotation and formatting
   */
  private createLogger(): winston.Logger {
    const env = process.env.NODE_ENV || 'development';
    const logLevel = this.config.level[env as keyof typeof this.config.level] || 'info';

    const formats: winston.Logform.Format[] = [
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: this.config.includeStackTrace }),
      winston.format.splat(),
      winston.format.json()
    ];

    // Add colorization for console in development
    if (env === 'development') {
      formats.unshift(winston.format.colorize());
    }

    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ];

    // File transports with rotation
    if (this.config.rotation.enabled) {
      // Combined logs
      transports.push(new DailyRotateFile({
        filename: path.join(this.logsDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: this.config.rotation.maxSize,
        maxFiles: this.config.rotation.maxFiles,
        format: winston.format.combine(...formats),
        zippedArchive: this.config.rotation.compress
      }));

      // Error logs
      transports.push(new DailyRotateFile({
        filename: path.join(this.logsDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: this.config.rotation.maxSize,
        maxFiles: this.config.rotation.maxFiles,
        level: 'error',
        format: winston.format.combine(...formats),
        zippedArchive: this.config.rotation.compress
      }));

      // Request logs
      transports.push(new DailyRotateFile({
        filename: path.join(this.logsDir, 'requests-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: this.config.rotation.maxSize,
        maxFiles: this.config.rotation.maxFiles,
        format: winston.format.combine(...formats),
        zippedArchive: this.config.rotation.compress
      }));
    }

    return winston.createLogger({
      level: logLevel,
      format: winston.format.combine(...formats),
      transports,
      exitOnError: false
    });
  }

  /**
   * Mask sensitive information (PII) in log data
   */
  public maskPII(data: any): any {
    if (!this.config.piiMasking.enabled) {
      return data;
    }

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const masked = Array.isArray(data) ? [...data] : { ...data };
    const patterns = this.config.piiMasking.patterns;

    const maskValue = (key: string, value: any): any => {
      if (typeof value === 'string' && patterns.some(pattern =>
        key.toLowerCase().includes(pattern.toLowerCase())
      )) {
        return '***MASKED***';
      }

      // Mask email addresses
      if (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return value.replace(/(.{2})(.*)(@.*)/, '$1***$3');
      }

      // Mask credit card numbers
      if (typeof value === 'string' && /^\d{13,19}$/.test(value.replace(/\s/g, ''))) {
        return value.replace(/\d(?=\d{4})/g, '*');
      }

      return value;
    };

    const processObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => processObject(item));
      }

      if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'object' && value !== null) {
            result[key] = processObject(value);
          } else {
            result[key] = maskValue(key, value);
          }
        }
        return result;
      }

      return obj;
    };

    return processObject(masked);
  }

  /**
   * Log with automatic PII masking
   */
  public log(level: string, message: string, meta?: any): void {
    const maskedMeta = meta ? this.maskPII(meta) : undefined;
    this.logger.log(level, message, maskedMeta);
  }

  public debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  public info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  public error(message: string, meta?: any): void {
    this.log('error', message, meta);
  }

  /**
   * Search logs with filters
   */
  public async searchLogs(query: LogQuery): Promise<LogEntry[]> {
    const results: LogEntry[] = [];
    const logFiles = await this.getLogFiles();

    for (const logFile of logFiles) {
      const entries = await this.parseLogFile(logFile);

      const filtered = entries.filter(entry => {
        if (query.level && entry.level !== query.level) return false;
        if (query.startTime && new Date(entry.timestamp) < query.startTime) return false;
        if (query.endTime && new Date(entry.timestamp) > query.endTime) return false;
        if (query.search && !JSON.stringify(entry).includes(query.search)) return false;
        return true;
      });

      results.push(...filtered);
    }

    // Sort by timestamp descending
    results.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return query.limit ? results.slice(0, query.limit) : results;
  }

  /**
   * Get list of log files
   */
  private async getLogFiles(): Promise<string[]> {
    const files = await fs.promises.readdir(this.logsDir);
    return files
      .filter(file => file.endsWith('.log'))
      .map(file => path.join(this.logsDir, file))
      .sort()
      .reverse();
  }

  /**
   * Parse log file and return entries
   */
  private async parseLogFile(filePath: string): Promise<LogEntry[]> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      return lines.map(line => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: line
          };
        }
      });
    } catch (error) {
      console.error(`Error parsing log file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Export logs in specified format
   */
  public async exportLogs(
    format: 'json' | 'csv',
    query?: LogQuery
  ): Promise<string> {
    const logs = await this.searchLogs(query || {});

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV export
    const headers = ['timestamp', 'level', 'message', 'requestId', 'userId'];
    const csv = [
      headers.join(','),
      ...logs.map(log =>
        headers.map(h => JSON.stringify(log[h] || '')).join(',')
      )
    ].join('\n');

    return csv;
  }

  /**
   * Compress old logs
   */
  public async compressOldLogs(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const files = await this.getLogFiles();
    let compressed = 0;

    for (const file of files) {
      const stats = await fs.promises.stat(file);

      if (stats.mtime < cutoffDate && !file.endsWith('.gz')) {
        const content = await fs.promises.readFile(file);
        const gzipped = await gzip(content);
        await fs.promises.writeFile(`${file}.gz`, gzipped);
        await fs.promises.unlink(file);
        compressed++;
      }
    }

    return compressed;
  }

  /**
   * Clean up old logs beyond retention period
   */
  public async cleanupOldLogs(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const files = await this.getLogFiles();
    let deleted = 0;

    for (const file of files) {
      const stats = await fs.promises.stat(file);

      if (stats.mtime < cutoffDate) {
        await fs.promises.unlink(file);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Get log statistics
   */
  public async getLogStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestLog: Date | null;
    newestLog: Date | null;
    logLevels: Record<string, number>;
  }> {
    const files = await this.getLogFiles();
    let totalSize = 0;
    let oldestLog: Date | null = null;
    let newestLog: Date | null = null;
    const logLevels: Record<string, number> = {};

    for (const file of files) {
      const stats = await fs.promises.stat(file);
      totalSize += stats.size;

      if (!oldestLog || stats.mtime < oldestLog) {
        oldestLog = stats.mtime;
      }
      if (!newestLog || stats.mtime > newestLog) {
        newestLog = stats.mtime;
      }

      // Count log levels
      const entries = await this.parseLogFile(file);
      for (const entry of entries) {
        logLevels[entry.level] = (logLevels[entry.level] || 0) + 1;
      }
    }

    return {
      totalFiles: files.length,
      totalSize,
      oldestLog,
      newestLog,
      logLevels
    };
  }
}

// Singleton instance
export const logManager = new LogManager();
