/**
 * @noa/metrics - Application metrics collection and Prometheus integration
 *
 * Provides comprehensive metrics collection for HTTP, database, cache, and queue operations
 * with Prometheus export capabilities.
 */

// Core
export { MetricsCollector, MetricsConfig } from './MetricsCollector.js';
export { PrometheusExporter, ExporterConfig } from './PrometheusExporter.js';

// Specialized metrics
export { HttpMetrics } from './metrics/HttpMetrics.js';
export { DatabaseMetrics } from './metrics/DatabaseMetrics.js';
export { CacheMetrics } from './metrics/CacheMetrics.js';
export { QueueMetrics } from './metrics/QueueMetrics.js';

// Registry
export { MetricsRegistry } from './registry/MetricsRegistry.js';

// Re-export common types from prom-client
export type { Counter, Gauge, Histogram, Summary, Registry } from 'prom-client';
