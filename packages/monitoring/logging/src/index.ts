/**
 * @noa/logging - Structured logging with ELK stack integration
 *
 * Provides comprehensive logging capabilities with multiple transports including
 * Elasticsearch, file rotation, and console output.
 */

// Core
export { LogAggregator, LogAggregatorConfig, LogLevel, LogMetadata } from './LogAggregator.js';
export { StructuredLogger } from './StructuredLogger.js';

// Transports
export {
  ElasticsearchTransport,
  ElasticsearchConfig,
} from './transports/ElasticsearchTransport.js';
export { FileTransport, FileTransportConfig } from './transports/FileTransport.js';
export { ConsoleTransport, ConsoleTransportConfig } from './transports/ConsoleTransport.js';

// Formatters
export { JSONFormatter, JSONFormatterConfig } from './formatters/JSONFormatter.js';
export { LogstashFormatter, LogstashFormatterConfig } from './formatters/LogstashFormatter.js';

// Re-export Winston types
export type { Logger } from 'winston';
