/**
 * Logger type definitions
 */

export interface LoggerConfig {
  /**
   * Service or module name for log tagging
   */
  service: string;

  /**
   * Module name within the service
   */
  module?: string;

  /**
   * Minimum log level (default: 'info')
   */
  level?: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

  /**
   * Enable console output (default: true)
   */
  console?: boolean;

  /**
   * Enable file logging (default: false)
   */
  file?: boolean;

  /**
   * Directory for log files (default: 'logs')
   */
  logDir?: string;

  /**
   * Enable colorized output (default: true)
   */
  colorize?: boolean;

  /**
   * Additional metadata to include in all logs
   */
  defaultMeta?: Record<string, any>;

  /**
   * Enable JSON formatting (default: true for file, false for console)
   */
  json?: boolean;
}

export interface LogContext {
  /**
   * Request ID for tracing
   */
  requestId?: string;

  /**
   * User ID for auditing
   */
  userId?: string;

  /**
   * Additional context data
   */
  [key: string]: any;
}
