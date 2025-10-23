# @noa/tracing

Distributed tracing with OpenTelemetry, Jaeger, and Zipkin for Noa Server.

## Features

- **OpenTelemetry Integration**: Industry-standard distributed tracing
- **Multiple Exporters**: Support for Jaeger, Zipkin, OTLP, and Console
- **Automatic Instrumentation**: HTTP, Express, and custom instrumentation
- **Span Management**: Easy span creation and context propagation
- **Context Propagation**: Trace context across service boundaries
- **TypeScript Support**: Full type safety with strict typing

## Installation

```bash
npm install @noa/tracing
```

## Quick Start

```typescript
import { TracingManager, SpanManager } from '@noa/tracing';

// Initialize tracing
const tracing = new TracingManager({
  serviceName: 'api-server',
  serviceVersion: '1.0.0',
  environment: 'production',
  exporter: {
    type: 'jaeger',
    endpoint: 'http://localhost:14268/api/traces',
  },
  sampling: {
    enabled: true,
    ratio: 1.0,
  },
});

await tracing.initialize();

// Create span manager
const spanManager = new SpanManager('my-service');

// Create spans
await spanManager.withSpan('operation-name', async (span) => {
  span.setAttribute('user.id', '123');
  // Your code here
});
```

## Exporters

### Jaeger

```typescript
import { JaegerExporter } from '@noa/tracing';

const exporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces',
  serviceName: 'my-service',
  maxPacketSize: 65000,
});

// Get Jaeger UI URL
const uiUrl = exporter.getUIUrl(traceId);
console.log(`View trace: ${uiUrl}`);
```

### Zipkin

```typescript
import { ZipkinExporter } from '@noa/tracing';

const exporter = new ZipkinExporter({
  url: 'http://localhost:9411/api/v2/spans',
  serviceName: 'my-service',
});

// Get Zipkin UI URL
const uiUrl = exporter.getUIUrl(traceId);
```

### OTLP (OpenTelemetry Protocol)

```typescript
const tracing = new TracingManager({
  serviceName: 'my-service',
  exporter: {
    type: 'otlp',
    endpoint: 'http://localhost:4318/v1/traces',
    headers: {
      'Authorization': 'Bearer token',
    },
  },
});
```

## Span Management

### Basic Spans

```typescript
import { SpanManager, SpanKind } from '@noa/tracing';

const spanManager = new SpanManager('my-service');

// Async operation
await spanManager.withSpan('async-operation', async (span) => {
  span.setAttribute('custom.attribute', 'value');
  span.addEvent('processing started');

  // Your async code
  const result = await processData();

  span.addEvent('processing completed');
  return result;
});

// Sync operation
const result = spanManager.withSpanSync('sync-operation', (span) => {
  span.setAttribute('operation.type', 'calculation');
  return calculate();
});
```

### Span Attributes

```typescript
await spanManager.withSpan('operation', async (span) => {
  // Add single attribute
  span.setAttribute('user.id', '123');

  // Add multiple attributes
  span.setAttributes({
    'http.method': 'GET',
    'http.url': '/api/users',
    'http.status_code': 200,
  });

  // Add events
  span.addEvent('cache.miss', {
    'cache.key': 'user:123',
  });
});
```

### Error Handling

```typescript
await spanManager.withSpan('risky-operation', async (span) => {
  try {
    await riskyOperation();
  } catch (error) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    throw error;
  }
});
```

## HTTP Instrumentation

Automatically trace HTTP requests:

```typescript
import { HttpInstrumentation } from '@noa/tracing';

const httpInstrumentation = new HttpInstrumentation(spanManager);

// Use as Express middleware
app.use(httpInstrumentation.middleware());

// Manual instrumentation
await httpInstrumentation.instrumentRequest(
  'POST',
  'https://api.example.com/users',
  async () => {
    return await fetch('https://api.example.com/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  {
    headers: { 'Content-Type': 'application/json' },
    body: userData,
  }
);
```

## Database Instrumentation

Trace database operations:

```typescript
import { DatabaseInstrumentation } from '@noa/tracing';

const dbInstrumentation = new DatabaseInstrumentation(spanManager);

// Instrument query
const users = await dbInstrumentation.instrumentQuery(
  'SELECT',
  'SELECT * FROM users WHERE id = $1',
  async () => {
    return await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  },
  {
    table: 'users',
    database: 'postgresql',
    parameters: [userId],
  }
);

// Instrument transaction
await dbInstrumentation.instrumentTransaction(
  'create-user',
  async () => {
    await db.query('BEGIN');
    await db.query('INSERT INTO users ...');
    await db.query('INSERT INTO profiles ...');
    await db.query('COMMIT');
  },
  {
    isolationLevel: 'READ COMMITTED',
    database: 'postgresql',
  }
);
```

## Queue Instrumentation

Trace message queue operations:

```typescript
import { QueueInstrumentation } from '@noa/tracing';

const queueInstrumentation = new QueueInstrumentation(spanManager);

// Publish message
await queueInstrumentation.instrumentPublish(
  'orders',
  message,
  async () => {
    return await queue.publish('orders', message);
  },
  {
    routingKey: 'order.created',
    exchange: 'orders',
    messageId: message.id,
  }
);

// Consume message
await queueInstrumentation.instrumentConsume(
  'orders',
  message.id,
  async () => {
    return await processOrder(message);
  },
  {
    consumerTag: 'worker-1',
    redelivered: false,
  }
);
```

## Context Propagation

Propagate trace context across services:

```typescript
// Get current trace context
const traceId = spanManager.getTraceId();
const spanId = spanManager.getSpanId();

// Pass in HTTP headers
const headers = {
  'X-Trace-Id': traceId,
  'X-Span-Id': spanId,
};

// Create child span
const childSpan = spanManager.createChildSpan('child-operation');
```

## Sampling

Control which traces are exported:

```typescript
// Always sample (development)
const tracing = new TracingManager({
  serviceName: 'my-service',
  sampling: {
    enabled: true,
    ratio: 1.0, // 100% of traces
  },
});

// Sample 10% (production)
const tracing = new TracingManager({
  serviceName: 'my-service',
  sampling: {
    enabled: true,
    ratio: 0.1, // 10% of traces
  },
});

// Disable sampling
const tracing = new TracingManager({
  serviceName: 'my-service',
  sampling: {
    enabled: false,
  },
});
```

## Environment Configuration

```bash
# Service
TRACING_SERVICE_NAME=api-server
TRACING_SERVICE_VERSION=1.0.0
TRACING_ENVIRONMENT=production

# Jaeger
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Zipkin
ZIPKIN_ENDPOINT=http://localhost:9411/api/v2/spans

# OTLP
OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Sampling
TRACING_SAMPLING_RATIO=0.1
```

## Best Practices

1. **Span Naming**: Use descriptive, hierarchical names (e.g., `http.GET./api/users`)
2. **Attributes**: Add meaningful attributes for filtering and analysis
3. **Error Recording**: Always record exceptions in spans
4. **Sampling**: Use appropriate sampling rates for production
5. **Context Propagation**: Ensure trace context flows through all services

## Integration with Jaeger

1. Run Jaeger: `docker run -d -p 16686:16686 -p 14268:14268 jaegertracing/all-in-one:latest`
2. Access UI: `http://localhost:16686`
3. Search traces by service name, operation, or tags

## Integration with Zipkin

1. Run Zipkin: `docker run -d -p 9411:9411 openzipkin/zipkin`
2. Access UI: `http://localhost:9411`
3. View traces and dependencies

## License

MIT
