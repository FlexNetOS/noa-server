# Message Queues Documentation

## Overview

The Message Queues system provides a comprehensive asynchronous job processing
framework for the NOA Server. It supports multiple queue providers (Redis,
RabbitMQ, Kafka, AWS SQS), various job types, and includes monitoring and
management capabilities.

## Architecture

### Core Components

#### QueueManager (`src/QueueManager.ts`)

- **Purpose**: Central orchestrator for all queue operations
- **Features**:
  - Provider management and switching
  - Job lifecycle management
  - Configuration validation
  - Health monitoring
- **Key Methods**:
  - `initialize()`: Set up providers and connections
  - `scheduleJob(job: Job)`: Add job to appropriate queue
  - `getJobStatus(jobId: string)`: Retrieve job status
  - `cancelJob(jobId: string)`: Cancel running job

#### JobScheduler (`src/JobScheduler.ts`)

- **Purpose**: Handles job scheduling and timing
- **Features**:
  - Delayed job execution
  - Recurring job scheduling
  - Priority-based queuing
  - Job deduplication
- **Key Methods**:
  - `schedule(job: Job, delay?: number)`: Schedule job with optional delay
  - `scheduleRecurring(job: Job, cron: string)`: Schedule recurring job
  - `cancelScheduled(jobId: string)`: Cancel scheduled job

#### JobWorker (`src/JobWorker.ts`)

- **Purpose**: Base worker class for job processing
- **Features**:
  - Job execution lifecycle
  - Error handling and retry logic
  - Progress tracking
  - Resource cleanup
- **Key Methods**:
  - `process(job: Job)`: Execute job logic
  - `onProgress(progress: number)`: Update job progress
  - `onError(error: Error)`: Handle job errors

### Queue Providers

#### RedisQueueProvider (`src/providers/RedisQueueProvider.ts`)

- **Library**: BullMQ
- **Features**:
  - High-performance Redis-based queuing
  - Job persistence and recovery
  - Priority queues
  - Rate limiting
- **Use Case**: General-purpose, high-throughput scenarios

#### RabbitMQProvider (`src/providers/RabbitMQProvider.ts`)

- **Library**: amqplib
- **Features**:
  - Advanced routing and exchange patterns
  - Message durability
  - Clustering support
  - Dead letter queues
- **Use Case**: Complex routing requirements, enterprise messaging

#### KafkaProvider (`src/providers/KafkaProvider.ts`)

- **Library**: kafkajs
- **Features**:
  - High-throughput event streaming
  - Partitioning and consumer groups
  - Message retention policies
  - Exactly-once delivery
- **Use Case**: Event-driven architectures, log aggregation

#### SQSProvider (`src/providers/SQSProvider.ts`)

- **Library**: aws-sdk
- **Features**:
  - Managed queue service
  - Auto-scaling
  - Message encryption
  - Cross-region replication
- **Use Case**: Cloud-native applications, AWS ecosystem

### Job Types

#### EmailJob (`src/jobs/EmailJob.ts`)

- **Purpose**: Send emails via SMTP
- **Features**:
  - HTML/text email support
  - Attachment handling
  - Template rendering
  - Delivery tracking
- **Configuration**:

```typescript
{
  to: string[],
  subject: string,
  body: string,
  attachments?: Attachment[],
  template?: string,
  templateData?: Record<string, any>
}
```

#### ReportGenerationJob (`src/jobs/ReportGenerationJob.ts`)

- **Purpose**: Generate reports in multiple formats
- **Features**:
  - PDF, Excel, CSV output
  - Data aggregation
  - Chart generation
  - Scheduled delivery
- **Configuration**:

```typescript
{
  type: 'pdf' | 'excel' | 'csv',
  data: any[],
  template: string,
  filters?: Record<string, any>,
  delivery?: {
    email?: string[],
    webhook?: string
  }
}
```

#### DataExportJob (`src/jobs/DataExportJob.ts`)

- **Purpose**: Export data from databases or APIs
- **Features**:
  - Multiple data sources
  - Format conversion
  - Compression
  - Secure delivery
- **Configuration**:

```typescript
{
  source: {
    type: 'database' | 'api',
    connection: string,
    query: string
  },
  format: 'json' | 'csv' | 'xml',
  compression?: 'gzip' | 'zip',
  destination: {
    type: 's3' | 'ftp' | 'email',
    config: Record<string, any>
  }
}
```

#### WebhookJob (`src/jobs/WebhookJob.ts`)

- **Purpose**: Send HTTP requests to external services
- **Features**:
  - Retry logic with exponential backoff
  - Signature verification
  - Response validation
  - Failure notifications
- **Configuration**:

```typescript
{
  url: string,
  method: 'POST' | 'PUT' | 'PATCH',
  headers?: Record<string, string>,
  body?: any,
  retries?: number,
  timeout?: number,
  signature?: {
    key: string,
    algorithm: string
  }
}
```

#### AnalyticsJob (`src/jobs/AnalyticsJob.ts`)

- **Purpose**: Process and analyze data
- **Features**:
  - Data aggregation
  - Statistical calculations
  - Alert generation
  - Trend analysis
- **Configuration**:

```typescript
{
  data: any[],
  operations: Array<{
    type: 'sum' | 'avg' | 'count' | 'trend',
    field: string,
    filters?: Record<string, any>
  }>,
  alerts?: Array<{
    condition: string,
    threshold: number,
    action: 'email' | 'webhook'
  }>
}
```

#### BackupJob (`src/jobs/BackupJob.ts`)

- **Purpose**: Create system backups
- **Features**:
  - Database dumps
  - File system backups
  - Compression and encryption
  - Retention policies
- **Configuration**:

```typescript
{
  targets: Array<{
    type: 'database' | 'filesystem',
    source: string,
    destination: string
  }>,
  compression: 'gzip' | 'bzip2',
  encryption?: {
    algorithm: string,
    key: string
  },
  retention: {
    days: number,
    maxBackups: number
  }
}
```

### Advanced Features

#### WorkerManager (`src/WorkerManager.ts`)

- **Purpose**: Manage worker pools and scaling
- **Features**:
  - Auto-scaling based on load
  - Worker health monitoring
  - Resource allocation
  - Graceful shutdown
- **Key Methods**:
  - `scaleWorkers(count: number)`: Adjust worker pool size
  - `getWorkerStats()`: Get worker performance metrics
  - `shutdown()`: Gracefully stop all workers

#### JobProcessor (`src/JobProcessor.ts`)

- **Purpose**: Advanced job execution logic
- **Features**:
  - Job chaining and dependencies
  - Parallel execution
  - Result caching
  - Execution timeouts
- **Key Methods**:
  - `processChain(jobs: Job[])`: Execute jobs in sequence
  - `processParallel(jobs: Job[])`: Execute jobs concurrently
  - `cacheResult(jobId: string, result: any)`: Cache job results

#### QueueMonitor (`src/QueueMonitor.ts`)

- **Purpose**: System monitoring and alerting
- **Features**:
  - Real-time metrics collection
  - Performance monitoring
  - Alert generation
  - Historical data analysis
- **Key Methods**:
  - `getMetrics()`: Get current system metrics
  - `setAlertRule(rule: AlertRule)`: Configure alert rules
  - `getHealthStatus()`: Get system health status

### Design Patterns

#### WorkQueue (`src/patterns/WorkQueue.ts`)

- **Pattern**: Round-robin job distribution
- **Use Case**: Load balancing across multiple workers
- **Features**:
  - Fair job distribution
  - Worker load balancing
  - Failure recovery

#### PubSub (`src/patterns/PubSub.ts`)

- **Pattern**: Publish-subscribe messaging
- **Use Case**: Event broadcasting and notifications
- **Features**:
  - Topic-based messaging
  - Multiple subscribers
  - Message filtering

### Configuration

#### Queue Configuration (`src/config/queueConfig.ts`)

```typescript
export interface QueueConfig {
  provider: {
    type: 'redis' | 'rabbitmq' | 'kafka' | 'sqs';
    config: Record<string, any>;
  };
  workers: {
    minWorkers: number;
    maxWorkers: number;
    scalingThreshold: number;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertRules: AlertRule[];
  };
  retry: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxBackoffTime: number;
  };
}
```

#### Base Provider (`src/providers/BaseProvider.ts`)

- **Purpose**: Abstract base class for all queue providers
- **Features**:
  - Common interface definition
  - Connection management
  - Error handling standardization
  - Health checking

### Dashboard

#### QueueDashboard (`src/dashboard/QueueDashboard.ts`)

- **Purpose**: HTML dashboard generator for monitoring
- **Features**:
  - Real-time metrics display
  - Worker status monitoring
  - Job statistics
  - System alerts
  - Quick actions
- **Key Methods**:
  - `generateDashboard(metrics, workers, jobStats, alerts)`: Generate HTML
    dashboard

### Types and Validation

#### Type Definitions (`src/types.ts`)

- **Purpose**: TypeScript type definitions and Zod schemas
- **Features**:
  - Job data validation
  - Configuration validation
  - API response types
  - Error types

## Usage Examples

### Basic Job Scheduling

```typescript
import { QueueManager } from './src/QueueManager';
import { EmailJob } from './src/jobs/EmailJob';

const queueManager = new QueueManager(config);

// Schedule an email job
const emailJob = new EmailJob({
  to: ['user@example.com'],
  subject: 'Test Email',
  body: 'This is a test message',
});

await queueManager.scheduleJob(emailJob);
```

### Advanced Job Processing

```typescript
import { JobScheduler } from './src/JobScheduler';
import { ReportGenerationJob } from './src/jobs/ReportGenerationJob';

const scheduler = new JobScheduler(queueManager);

// Schedule a recurring report
const reportJob = new ReportGenerationJob({
  type: 'pdf',
  data: salesData,
  template: 'monthly-report',
  delivery: {
    email: ['manager@example.com'],
  },
});

// Run every Monday at 9 AM
await scheduler.scheduleRecurring(reportJob, '0 9 * * 1');
```

### Monitoring Setup

```typescript
import { QueueMonitor } from './src/QueueMonitor';

const monitor = new QueueMonitor(queueManager);

// Set up alert rules
monitor.setAlertRule({
  name: 'High Error Rate',
  condition: 'errorRate > 5',
  action: 'email',
  recipients: ['admin@example.com'],
});

// Get current metrics
const metrics = await monitor.getMetrics();
console.log('Current throughput:', metrics.throughputPerMinute);
```

## Configuration Examples

### Redis Configuration

```typescript
const redisConfig: QueueConfig = {
  provider: {
    type: 'redis',
    config: {
      host: 'localhost',
      port: 6379,
      password: process.env.REDIS_PASSWORD,
    },
  },
  workers: {
    minWorkers: 2,
    maxWorkers: 10,
    scalingThreshold: 0.8,
  },
  monitoring: {
    enabled: true,
    metricsInterval: 5000,
    alertRules: [],
  },
  retry: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    maxBackoffTime: 30000,
  },
};
```

### RabbitMQ Configuration

```typescript
const rabbitConfig: QueueConfig = {
  provider: {
    type: 'rabbitmq',
    config: {
      hostname: 'localhost',
      port: 5672,
      username: 'guest',
      password: 'guest',
      vhost: '/',
    },
  },
  // ... other config
};
```

## API Reference

### QueueManager API

- `initialize(): Promise<void>`
- `scheduleJob(job: Job): Promise<string>`
- `getJobStatus(jobId: string): Promise<JobStatus>`
- `cancelJob(jobId: string): Promise<void>`
- `getMetrics(): Promise<QueueMetrics>`
- `shutdown(): Promise<void>`

### JobScheduler API

- `schedule(job: Job, delay?: number): Promise<string>`
- `scheduleRecurring(job: Job, cron: string): Promise<string>`
- `cancelScheduled(jobId: string): Promise<void>`
- `getScheduledJobs(): Promise<Job[]>`

### WorkerManager API

- `startWorkers(count: number): Promise<void>`
- `scaleWorkers(count: number): Promise<void>`
- `getWorkerStats(): Promise<WorkerStats[]>`
- `shutdown(): Promise<void>`

## Error Handling

The system implements comprehensive error handling:

- **Job Execution Errors**: Automatic retry with exponential backoff
- **Provider Connection Errors**: Automatic reconnection with circuit breaker
- **Worker Failures**: Worker restart and job redistribution
- **Configuration Errors**: Validation at startup with detailed error messages

## Monitoring and Observability

### Metrics Collected

- Job throughput (jobs/minute)
- Queue depth and processing times
- Worker utilization and health
- Error rates and failure patterns
- System resource usage

### Alert Types

- High error rates
- Worker failures
- Queue backlog thresholds
- Performance degradation
- Resource exhaustion

## Security Considerations

- **Authentication**: Provider-specific authentication mechanisms
- **Encryption**: Data encryption in transit and at rest
- **Access Control**: Job execution permissions and queue access controls
- **Audit Logging**: Comprehensive logging of all job operations

## Performance Optimization

- **Connection Pooling**: Efficient connection management
- **Message Batching**: Reduced network overhead
- **Worker Pooling**: Optimal resource utilization
- **Caching**: Job result and configuration caching

## Deployment

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password

# RabbitMQ Configuration
RABBITMQ_HOST=localhost
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

# AWS SQS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check provider credentials and network connectivity
   - Verify firewall settings and security groups
   - Review connection pool configuration

2. **Job Processing Delays**
   - Monitor worker pool size and utilization
   - Check queue depth and processing rates
   - Review job complexity and resource requirements

3. **Memory Issues**
   - Monitor worker memory usage
   - Implement job result cleanup
   - Adjust worker pool size limits

4. **High Error Rates**
   - Review job validation and error handling
   - Check external service dependencies
   - Monitor provider health and connectivity

### Debug Logging

Enable debug logging by setting:

```typescript
process.env.LOG_LEVEL = 'debug';
```

## Contributing

When adding new job types:

1. Extend the `BaseJob` class
2. Implement the `process()` method
3. Add Zod validation schema
4. Update the job registry
5. Add comprehensive tests

When adding new providers:

1. Implement the `BaseProvider` interface
2. Add connection management
3. Implement job lifecycle methods
4. Add provider-specific configuration
5. Include health checking

## License

This module is part of the NOA Server project and follows the same licensing
terms.
