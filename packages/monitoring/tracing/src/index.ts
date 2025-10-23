/**
 * @noa/tracing - Distributed tracing with OpenTelemetry
 *
 * Provides comprehensive distributed tracing capabilities with support for
 * Jaeger, Zipkin, and OpenTelemetry Protocol (OTLP) exporters.
 */

// Core
export { TracingManager, TracingConfig } from './TracingManager.js';
export { SpanManager, SpanAttributes, SpanOptions } from './SpanManager.js';

// Instrumentation
export { HttpInstrumentation } from './instrumentation/HttpInstrumentation.js';
export { DatabaseInstrumentation } from './instrumentation/DatabaseInstrumentation.js';
export { QueueInstrumentation } from './instrumentation/QueueInstrumentation.js';

// Exporters
export { JaegerExporter, JaegerConfig } from './exporters/JaegerExporter.js';
export { ZipkinExporter, ZipkinConfig } from './exporters/ZipkinExporter.js';

// Re-export OpenTelemetry API types
export {
  trace,
  context,
  SpanKind,
  SpanStatusCode,
  type Span,
  type Context,
  type Tracer,
} from '@opentelemetry/api';
