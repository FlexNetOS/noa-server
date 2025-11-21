/**
 * Automation Logger
 * Handles logging for mandatory optimization
 */

import { automationConfig } from './config';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'verbose';
  message: string;
  data?: any;
}

export class AutomationLogger {
  private static instance: AutomationLogger;
  private logs: LogEntry[];
  private maxLogs: number = 1000;

  private constructor() {}

  static getInstance(): AutomationLogger {
    if (!AutomationLogger.instance) {
      AutomationLogger.instance = new AutomationLogger();
    }
    return AutomationLogger.instance;
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * Log error message
   */
  error(message: string, error?: any): void {
    const data = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    this.log('error', message, data);
  }

  /**
   * Log verbose message
   */
  verbose(message: string, data?: any): void {
    this.log('verbose', message, data);
  }

  /**
   * Log optimization event
   */
  logOptimization(data: {
    original?: string;
    optimized?: string;
    metrics?: any;
    strategy?: string;
    timestamp: string;
  }): void {
    const config = automationConfig.getConfig();

    if (!config.logging.enabled) return;

    const logLevel = config.logging.level;

    if (logLevel === 'verbose' || logLevel === 'info') {
      this.info('Prompt optimized', data);
    }
  }

  /**
   * Log bypass event
   */
  logBypass(original: string, cleaned: string): void {
    const config = automationConfig.getConfig();

    if (!config.logging.enabled || !config.logging.logBypass) return;

    this.info('Prompt bypassed optimization', {
      original: original.substring(0, 100),
      cleaned: cleaned.substring(0, 100),
    });
  }

  /**
   * Log cache hit
   */
  logCacheHit(prompt: string): void {
    const config = automationConfig.getConfig();

    if (!config.logging.enabled) return;

    if (config.logging.level === 'verbose') {
      this.verbose('Cache hit', {
        prompt: prompt.substring(0, 100),
      });
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogEntry['level'], message: string, data?: any): void {
    const config = automationConfig.getConfig();

    if (!config.logging.enabled) return;

    // Check log level
    const levels = ['error', 'warn', 'info', 'verbose'];
    const configLevel = levels.indexOf(config.logging.level);
    const messageLevel = levels.indexOf(level);

    if (messageLevel > configLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    // Store in memory
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to destination
    const destination = config.logging.destination;

    if (destination === 'console' || destination === 'both') {
      this.logToConsole(entry);
    }

    if (destination === 'file' || destination === 'both') {
      // TODO: Implement file logging
    }
  }

  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case 'error':
        console.error(message, entry.data || '');
        break;
      case 'warn':
        console.warn(message, entry.data || '');
        break;
      case 'info':
        console.log(message, entry.data || '');
        break;
      case 'verbose':
        console.debug(message, entry.data || '');
        break;
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }
}
