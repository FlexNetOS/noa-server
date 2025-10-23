import { format } from 'winston';

/**
 * JSON formatter configuration
 */
export interface JSONFormatterConfig {
  space?: number;
  replacer?: (key: string, value: any) => any;
  includeStack?: boolean;
  maxFieldLength?: number;
}

/**
 * Enhanced JSON formatter for Winston logs
 */
export class JSONFormatter {
  private config: JSONFormatterConfig;

  constructor(config: JSONFormatterConfig = {}) {
    this.config = {
      space: config.space,
      replacer: config.replacer,
      includeStack: config.includeStack !== false,
      maxFieldLength: config.maxFieldLength || 10000,
    };
  }

  /**
   * Create Winston format
   */
  public getFormat() {
    return format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      format.errors({ stack: this.config.includeStack }),
      format((info) => {
        // Truncate long fields
        const truncated = this.truncateFields(info);
        return truncated;
      })(),
      format.json({
        space: this.config.space,
        replacer: this.config.replacer,
      })
    );
  }

  /**
   * Truncate fields that exceed maximum length
   */
  private truncateFields(obj: any, depth: number = 0): any {
    if (depth > 10) return '[Max Depth Reached]';

    if (typeof obj === 'string') {
      if (obj.length > this.config.maxFieldLength!) {
        return obj.substring(0, this.config.maxFieldLength!) + '... [truncated]';
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.truncateFields(item, depth + 1));
    }

    if (obj !== null && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.truncateFields(value, depth + 1);
      }
      return result;
    }

    return obj;
  }

  /**
   * Format a single log object
   */
  public formatLog(log: any): string {
    const formatted = {
      timestamp: new Date().toISOString(),
      ...log,
    };

    const truncated = this.truncateFields(formatted);
    return JSON.stringify(truncated, this.config.replacer, this.config.space);
  }

  /**
   * Parse a JSON log line
   */
  public parseLog(logLine: string): any {
    try {
      return JSON.parse(logLine);
    } catch (error) {
      return {
        error: 'Failed to parse log',
        original: logLine,
      };
    }
  }

  /**
   * Format multiple logs
   */
  public formatLogs(logs: any[]): string {
    return logs.map((log) => this.formatLog(log)).join('\n');
  }
}
