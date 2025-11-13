# @noa/logging

Structured logging with ELK stack integration for Noa Server.

## Features

- **Structured Logging**: JSON-formatted logs with metadata
- **Multiple Transports**: Console, file rotation, and Elasticsearch
- **ELK Stack Integration**: Direct integration with Elasticsearch, Logstash,
  Kibana
- **Correlation IDs**: Track requests across services
- **Log Levels**: Error, warn, info, http, verbose, debug, silly
- **Flexible Formatters**: JSON and Logstash formatters
- **TypeScript Support**: Full type safety with strict typing

## Installation

```bash
npm install @noa/logging
```

## Quick Start

```typescript
import { LogAggregator } from '@noa/logging';

// Initialize log aggregator
const logger = new LogAggregator({
  level: 'info',
  serviceName: 'api-server',
  environment: 'production',
  enableConsole: true,
  enableFile: true,
  enableElasticsearch: true,
  elasticsearch: {
    node: 'http://localhost:9200',
    index: 'logs',
    username: 'elastic',
    password: 'password',
  },
  file: {
    directory: './logs',
    maxFiles: '14d',
    maxSize: '20m',
  },
});

// Log messages
logger.info('Application started', { port: 3000 });
logger.error('Database connection failed', { error: 'Connection timeout' });
logger.debug('Cache hit', { key: 'user:123', duration: 5 });
```

## Log Levels

```typescript
logger.error('Critical error occurred'); // 0
logger.warn('Warning message'); // 1
logger.info('Informational message'); // 2
logger.http('HTTP request logged'); // 3
logger.verbose('Verbose details'); // 4
logger.debug('Debug information'); // 5
logger.silly('Very detailed trace'); // 6
```

## Structured Logger

Pre-built formatters for common log types:

```typescript
import { StructuredLogger } from '@noa/logging';

const structured = new StructuredLogger(logger);

// HTTP requests
structured.logHttpRequest({
  method: 'GET',
  url: '/api/users',
  statusCode: 200,
  duration: 123,
  ip: '192.168.1.1',
  userId: 'user-123',
});

// Database queries
structured.logDatabaseQuery({
  operation: 'SELECT',
  table: 'users',
  duration: 45,
  rowsAffected: 10,
});

// Authentication events
structured.logAuthEvent({
  action: 'login',
  userId: 'user-123',
  username: 'john@example.com',
  ip: '192.168.1.1',
});

// Security events
structured.logSecurityEvent({
  type: 'unauthorized_access',
  severity: 'high',
  description: 'Failed login attempt',
  ip: '192.168.1.100',
  details: { attempts: 5 },
});

// Performance metrics
structured.logPerformance({
  operation: 'user-creation',
  duration: 234,
  success: true,
  metadata: { userId: 'new-user-456' },
});

// Business events
structured.logBusinessEvent({
  name: 'order-placed',
  category: 'sales',
  data: { orderId: 'ord-123', amount: 99.99 },
  userId: 'user-789',
});
```

## Correlation IDs

Track requests across services:

```typescript
// Generate correlation ID
const correlationId = logger.generateCorrelationId();

// Set correlation ID
logger.setCorrelationId('req-123-456');

// Get correlation ID
const currentId = logger.getCorrelationId();

// All logs will include the correlation ID
logger.info('Processing request', { userId: '123' });
// Output: { correlationId: 'req-123-456', userId: '123', ... }
```

## Child Loggers

Create child loggers with additional context:

```typescript
// Parent logger
const logger = new LogAggregator({
  serviceName: 'api-server',
  level: 'info',
});

// Child logger with additional metadata
const userLogger = logger.child({
  userId: 'user-123',
  sessionId: 'session-456',
});

userLogger.info('User action performed');
// Output includes userId and sessionId automatically
```

## Elasticsearch Transport

Query logs from Elasticsearch:

```typescript
// Query logs
const logs = await logger.queryLogs({
  from: new Date('2024-01-01'),
  to: new Date('2024-01-31'),
  level: 'error',
  search: 'database',
  limit: 100,
});

console.log(logs);
```

## File Transport

Daily rotating file logs:

```typescript
const logger = new LogAggregator({
  serviceName: 'api-server',
  level: 'info',
  enableFile: true,
  file: {
    directory: './logs',
    filename: 'app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m', // Rotate when file reaches 20MB
    maxFiles: '14d', // Keep logs for 14 days
    compress: true, // Gzip old logs
  },
});
```

Log files:

- `logs/app-2024-01-15.log`
- `logs/app-2024-01-16.log`
- `logs/app-2024-01-17.log.gz` (compressed)

## Console Transport

Pretty-printed console logs:

```typescript
const logger = new LogAggregator({
  serviceName: 'api-server',
  level: 'debug',
  enableConsole: true,
});

// Output:
// 2024-01-15 10:30:45.123 [info] [api-server] [production] Application started
//   {
//     "port": 3000,
//     "environment": "production"
//   }
```

## Formatters

### JSON Formatter

```typescript
import { JSONFormatter } from '@noa/logging';

const formatter = new JSONFormatter({
  space: 2, // Pretty print with 2 spaces
  includeStack: true, // Include error stacks
  maxFieldLength: 10000, // Truncate long fields
});

const formatted = formatter.formatLog({
  level: 'info',
  message: 'Test message',
  metadata: { key: 'value' },
});
```

### Logstash Formatter

```typescript
import { LogstashFormatter } from '@noa/logging';

const formatter = new LogstashFormatter({
  appName: 'api-server',
  environment: 'production',
  version: '1.0.0',
  includeHost: true,
  includePid: true,
});

// Get Logstash pipeline config
const pipelineConfig = formatter.getLogstashPipeline();
```

## Exception Logging

Log exceptions with stack traces:

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.logException(error, {
    operation: 'user-creation',
    userId: 'user-123',
  });
}

// Output:
// {
//   level: 'error',
//   message: 'Exception occurred',
//   error: {
//     name: 'ValidationError',
//     message: 'Invalid email',
//     stack: '...'
//   },
//   operation: 'user-creation',
//   userId: 'user-123'
// }
```

## Event Logging

Log structured events:

```typescript
logger.logEvent(
  'user.registered',
  {
    userId: 'user-123',
    email: 'user@example.com',
    provider: 'google',
    timestamp: Date.now(),
  },
  'info'
);
```

## Timer Utility

Measure operation duration:

```typescript
import { StructuredLogger } from '@noa/logging';

const structured = new StructuredLogger(logger);
const timer = structured.startTimer();

// Perform operation
await processData();

// End timer and log
const duration = timer.end('data-processing', {
  recordCount: 1000,
});

console.log(`Processing took ${duration}ms`);
```

## Integration with ELK Stack

### Elasticsearch Setup

```bash
# Run Elasticsearch
docker run -d \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  elasticsearch:8.11.0

# Create index template
curl -X PUT "localhost:9200/_index_template/logs-template" \
  -H 'Content-Type: application/json' \
  -d '{
    "index_patterns": ["logs-*"],
    "template": {
      "mappings": {
        "properties": {
          "@timestamp": { "type": "date" },
          "severity": { "type": "keyword" },
          "message": { "type": "text" }
        }
      }
    }
  }'
```

### Kibana Setup

```bash
# Run Kibana
docker run -d \
  -p 5601:5601 \
  -e "ELASTICSEARCH_HOSTS=http://localhost:9200" \
  kibana:8.11.0

# Access: http://localhost:5601
```

### Logstash Configuration

```ruby
input {
  http {
    port => 5044
    codec => json
  }
}

filter {
  if [service][name] == "api-server" {
    mutate {
      add_tag => ["api"]
    }
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "logs-%{[service][environment]}-%{+YYYY.MM.dd}"
  }
}
```

## Environment Configuration

```bash
# Logging
LOG_LEVEL=info
LOG_SERVICE_NAME=api-server
LOG_ENVIRONMENT=production

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX=logs
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme

# File logging
LOG_DIRECTORY=./logs
LOG_MAX_FILES=14d
LOG_MAX_SIZE=20m
```

## Best Practices

1. **Use Correlation IDs**: Track requests across services
2. **Structured Data**: Always log structured metadata
3. **Appropriate Levels**: Use correct log levels (debug for dev, info for prod)
4. **Sensitive Data**: Never log passwords, tokens, or PII
5. **Child Loggers**: Use child loggers for request-scoped logging
6. **Error Context**: Include relevant context when logging errors

## Query Examples (Elasticsearch)

```javascript
// Find errors in last hour
GET logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "severity": "error" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  }
}

// Find logs by correlation ID
GET logs-*/_search
{
  "query": {
    "term": { "correlationId": "req-123-456" }
  }
}

// Aggregate errors by type
GET logs-*/_search
{
  "aggs": {
    "error_types": {
      "terms": { "field": "error.name.keyword" }
    }
  }
}
```

## License

MIT
