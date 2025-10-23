import { format } from 'winston';

/**
 * Logstash formatter configuration
 */
export interface LogstashFormatterConfig {
  appName?: string;
  environment?: string;
  version?: string;
  includeHost?: boolean;
  includePid?: boolean;
}

/**
 * Logstash formatter for Winston logs
 * Formats logs in Logstash JSON format for ELK stack
 */
export class LogstashFormatter {
  private config: LogstashFormatterConfig;

  constructor(config: LogstashFormatterConfig = {}) {
    this.config = {
      appName: config.appName || 'application',
      environment: config.environment || 'development',
      version: config.version || '1.0.0',
      includeHost: config.includeHost !== false,
      includePid: config.includePid !== false,
    };
  }

  /**
   * Create Winston format
   */
  public getFormat() {
    return format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format((info) => {
        return this.transformToLogstash(info);
      })(),
      format.json()
    );
  }

  /**
   * Transform log to Logstash format
   */
  private transformToLogstash(info: any): any {
    const {
      timestamp,
      level,
      message,
      stack,
      error,
      correlationId,
      traceId,
      spanId,
      userId,
      sessionId,
      ...meta
    } = info;

    const logstashLog: any = {
      '@timestamp': timestamp || new Date().toISOString(),
      '@version': '1',
      message,
      severity: level,
      application: this.config.appName,
      environment: this.config.environment,
      version: this.config.version,
    };

    // Add host information
    if (this.config.includeHost) {
      logstashLog.host = {
        hostname: process.env.HOSTNAME || 'unknown',
      };
    }

    // Add process information
    if (this.config.includePid) {
      logstashLog.process = {
        pid: process.pid,
      };
    }

    // Add trace information
    if (correlationId || traceId || spanId) {
      logstashLog.trace = {
        correlation_id: correlationId,
        trace_id: traceId,
        span_id: spanId,
      };
    }

    // Add user information
    if (userId || sessionId) {
      logstashLog.user = {
        id: userId,
        session_id: sessionId,
      };
    }

    // Add error information
    if (error || stack) {
      logstashLog.error = {
        message: error?.message || message,
        stack: stack || error?.stack,
        type: error?.name,
      };
    }

    // Add metadata
    if (Object.keys(meta).length > 0) {
      logstashLog.metadata = meta;
    }

    return logstashLog;
  }

  /**
   * Format a single log object
   */
  public formatLog(log: any): string {
    const logstashLog = this.transformToLogstash(log);
    return JSON.stringify(logstashLog);
  }

  /**
   * Parse a Logstash format log
   */
  public parseLog(logLine: string): any {
    try {
      const parsed = JSON.parse(logLine);

      return {
        timestamp: parsed['@timestamp'],
        level: parsed.severity,
        message: parsed.message,
        application: parsed.application,
        environment: parsed.environment,
        trace: parsed.trace,
        user: parsed.user,
        error: parsed.error,
        metadata: parsed.metadata,
      };
    } catch (error) {
      return {
        error: 'Failed to parse Logstash log',
        original: logLine,
      };
    }
  }

  /**
   * Create field mapping for Logstash pipeline
   */
  public getFieldMapping(): Record<string, string> {
    return {
      '@timestamp': 'date',
      '@version': 'keyword',
      message: 'text',
      severity: 'keyword',
      application: 'keyword',
      environment: 'keyword',
      version: 'keyword',
      'host.hostname': 'keyword',
      'process.pid': 'long',
      'trace.correlation_id': 'keyword',
      'trace.trace_id': 'keyword',
      'trace.span_id': 'keyword',
      'user.id': 'keyword',
      'user.session_id': 'keyword',
      'error.message': 'text',
      'error.stack': 'text',
      'error.type': 'keyword',
    };
  }

  /**
   * Get Logstash pipeline configuration
   */
  public getLogstashPipeline(): string {
    return `
input {
  file {
    path => "/var/log/${this.config.appName}/*.log"
    codec => "json"
  }
}

filter {
  if [application] == "${this.config.appName}" {
    mutate {
      add_field => { "[@metadata][target_index]" => "${this.config.appName}-${this.config.environment}-%{+YYYY.MM.dd}" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "%{[@metadata][target_index]}"
  }
}
`;
  }
}
