# AI Queue Integration Documentation

## Overview

The AI Queue Integration provides asynchronous processing capabilities for AI inference requests through a robust message queue architecture. This system enables distributed workload handling, job prioritization, and advanced orchestration patterns.

## Architecture

```
┌─────────────────┐
│   AI Provider   │
│    (Client)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│    AIQueueAdapter           │
│  - Job Publishing           │
│  - Priority Queues          │
│  - Result Delivery          │
│  - DLQ Management           │
└────────┬────────────────────┘
         │
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
┌──────────────┐  ┌──────────┐  ┌──────────┐
│  Urgent      │  │  High    │  │  Medium  │
│  Queue       │  │  Queue   │  │  Queue   │
│  (SLA: 3s)   │  │(SLA:10s) │  │(SLA:30s) │
└──────┬───────┘  └─────┬────┘  └─────┬────┘
       │                │             │
       └────────────────┴─────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Worker Pool     │
              │  - Auto-scaling  │
              │  - Health Check  │
              │  - Load Balance  │
              └─────────┬────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
         ┌─────────┐         ┌─────────┐
         │ Worker1 │   ...   │ WorkerN │
         │ (Idle)  │         │ (Busy)  │
         └─────────┘         └─────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   AI Providers   │
              │ OpenAI/Claude/   │
              │   Llama.cpp      │
              └──────────────────┘
```

## Key Components

### 1. AIQueueAdapter

Main interface for job submission and management.

**Features:**
- Priority queue routing (4 levels)
- Job status tracking
- Automatic retries with exponential backoff
- Dead letter queue for failed jobs
- Worker pool auto-scaling
- Real-time metrics

**Queue Topology:**
```
ai-jobs-urgent  -> Priority: 15, SLA: 3s
ai-jobs-high    -> Priority: 10, SLA: 10s
ai-jobs-medium  -> Priority: 5,  SLA: 30s
ai-jobs-low     -> Priority: 1,  SLA: 60s
ai-jobs-dlq     -> Failed jobs after max retries
```

### 2. Worker Pool Manager

Manages worker lifecycle and auto-scaling.

**Configuration:**
```typescript
{
  minWorkers: 1,              // Minimum workers always running
  maxWorkers: 50,             // Maximum workers limit
  defaultWorkers: 10,         // Initial worker count
  scaleUpThreshold: 100,      // Queue depth to scale up
  scaleDownThreshold: 10,     // Queue depth to scale down
  scaleUpStep: 2,             // Workers to add per scale-up
  scaleDownStep: 1,           // Workers to remove per scale-down
  autoScale: true,            // Enable auto-scaling
  healthCheckIntervalMs: 60000 // Health check frequency
}
```

**Scaling Behavior:**
- Scales up when queue depth > 100 jobs
- Scales down when queue depth < 10 jobs
- Respects min/max worker limits
- Only removes idle workers
- Replaces unhealthy workers automatically

### 3. AI Job Orchestrator

Advanced job coordination patterns.

**Features:**
- Batch job processing
- Job scheduling (cron-based)
- Job chaining (dependencies)
- Fan-out/fan-in patterns
- Job cancellation

## API Reference

### Job Submission

#### Basic Submission

```typescript
import { AIQueueAdapter, AIJobPriority, AIJobType } from '@noa/ai-provider';

const jobId = await adapter.submitJob({
  type: AIJobType.CHAT_COMPLETION,
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  messages: [{
    role: 'user',
    content: 'Hello, world!'
  }],
  config: {
    temperature: 0.7,
    max_tokens: 100
  }
}, {
  priority: AIJobPriority.HIGH,
  maxRetries: 3,
  timeout: 30000,
  tags: ['user-request', 'chat']
});

console.log('Job submitted:', jobId);
```

#### Callback-based Submission

```typescript
const result = await adapter.submitJobWithCallback({
  type: AIJobType.CHAT_COMPLETION,
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }]
}, {
  priority: AIJobPriority.URGENT,
  timeout: 5000
});

console.log('Response:', result.response.choices[0].message.content);
console.log('Tokens:', result.tokens);
console.log('Latency:', result.latency, 'ms');
```

### Job Status Tracking

```typescript
// Get job status
const job = await adapter.getJobStatus(jobId);
console.log('Status:', job.status);
console.log('Created:', job.createdAt);
console.log('Progress:', job.result ? 'Completed' : 'Processing');

// Listen to job events
adapter.on('job:completed', ({ jobId, job, result }) => {
  console.log(`Job ${jobId} completed in ${result.latency}ms`);
});

adapter.on('job:failed', ({ jobId, job, error }) => {
  console.error(`Job ${jobId} failed:`, error.message);
});

adapter.on('job:retried', ({ jobId, job, retryCount }) => {
  console.log(`Job ${jobId} retry attempt ${retryCount}`);
});
```

### Batch Processing

```typescript
import { AIJobOrchestrator } from '@noa/ai-provider';

const orchestrator = new AIJobOrchestrator(adapter, logger);
await orchestrator.start();

// Submit batch job
const batchId = await orchestrator.submitBatchJob([
  {
    type: AIJobType.CHAT_COMPLETION,
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Prompt 1' }]
  },
  {
    type: AIJobType.CHAT_COMPLETION,
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Prompt 2' }]
  },
  // ... up to thousands of jobs
], {
  name: 'Bulk content generation',
  priority: AIJobPriority.MEDIUM,
  maxConcurrency: 20,  // Process 20 at a time
  failFast: false      // Continue on individual failures
});

// Check batch status
const batch = await orchestrator.getBatchJobStatus(batchId);
console.log('Batch status:', batch.status);
console.log('Completed jobs:', batch.results?.length);
```

### Job Scheduling

```typescript
// Schedule recurring job (cron-based)
const scheduleId = await orchestrator.scheduleJob({
  type: AIJobType.CHAT_COMPLETION,
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Daily summary' }]
}, {
  name: 'Daily AI summary',
  cronExpression: '0 9 * * *',  // Every day at 9 AM
  priority: AIJobPriority.MEDIUM,
  enabled: true
});

// Cancel schedule
await orchestrator.cancelSchedule(scheduleId);
```

### Job Chaining (Dependencies)

```typescript
// Create job chain - each job depends on previous
const jobIds = await orchestrator.createJobChain([
  {
    type: AIJobType.CHAT_COMPLETION,
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Step 1: Analyze' }]
  },
  {
    type: AIJobType.CHAT_COMPLETION,
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Step 2: Summarize' }]
  },
  {
    type: AIJobType.CHAT_COMPLETION,
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Step 3: Recommend' }]
  }
], {
  name: 'Analysis pipeline',
  stopOnError: true  // Stop chain if any job fails
});

console.log('Chain created:', jobIds);
```

### Fan-Out/Fan-In Pattern

```typescript
// Fan-out: Execute jobs in parallel
const { batchId, jobIds } = await orchestrator.fanOut([
  { type: AIJobType.CHAT_COMPLETION, provider: 'openai', model: 'gpt-3.5-turbo', messages: [...] },
  { type: AIJobType.CHAT_COMPLETION, provider: 'openai', model: 'gpt-3.5-turbo', messages: [...] },
  { type: AIJobType.CHAT_COMPLETION, provider: 'openai', model: 'gpt-3.5-turbo', messages: [...] }
], {
  priority: AIJobPriority.HIGH,
  tags: ['parallel-processing']
});

// Fan-in: Wait for all jobs and aggregate results
const aggregatedResult = await orchestrator.fanIn(jobIds, (results) => {
  // Custom aggregation logic
  return results.map(r => r.response.choices[0].message.content).join('\n');
});

console.log('Aggregated output:', aggregatedResult);
```

### Job Cancellation

```typescript
// Cancel individual job
const cancelled = await adapter.cancelJob(jobId);

// Cancel batch job
await orchestrator.cancelBatchJob(batchId);

// Cancel scheduled job
await orchestrator.cancelSchedule(scheduleId);
```

## Worker Pool Configuration

### Optimal Settings by Use Case

#### Development/Testing
```typescript
{
  minWorkers: 1,
  maxWorkers: 5,
  defaultWorkers: 2,
  autoScale: false
}
```

#### Production (Low Traffic)
```typescript
{
  minWorkers: 5,
  maxWorkers: 20,
  defaultWorkers: 10,
  scaleUpThreshold: 50,
  scaleDownThreshold: 5,
  autoScale: true
}
```

#### Production (High Traffic)
```typescript
{
  minWorkers: 10,
  maxWorkers: 50,
  defaultWorkers: 20,
  scaleUpThreshold: 100,
  scaleDownThreshold: 10,
  scaleUpStep: 5,
  scaleDownStep: 2,
  autoScale: true
}
```

### Worker Resource Limits

```typescript
workerConfig: {
  maxMemoryMb: 512,          // Max memory per worker
  maxExecutionTimeMs: 30000, // 30 second timeout
  heartbeatIntervalMs: 30000 // 30 second heartbeat
}
```

## Monitoring and Metrics

### Adapter Statistics

```typescript
const stats = adapter.getStats();

console.log({
  isRunning: stats.isRunning,
  totalJobs: stats.totalJobs,
  queuedJobs: stats.queuedJobs,
  processingJobs: stats.processingJobs,
  completedJobs: stats.completedJobs,
  failedJobs: stats.failedJobs,
  workerPoolStats: {
    totalWorkers: stats.workerPoolStats.totalWorkers,
    idleWorkers: stats.workerPoolStats.idleWorkers,
    busyWorkers: stats.workerPoolStats.busyWorkers,
    avgProcessingTime: stats.workerPoolStats.averageProcessingTimeMs
  }
});
```

### Event Monitoring

```typescript
// Worker pool events
adapter.on('worker-pool:scaled-up', ({ previousSize, newSize }) => {
  console.log(`Scaled up: ${previousSize} -> ${newSize} workers`);
});

adapter.on('worker-pool:scaled-down', ({ previousSize, newSize }) => {
  console.log(`Scaled down: ${previousSize} -> ${newSize} workers`);
});

adapter.on('worker-pool:worker-unhealthy', ({ workerId, reason }) => {
  console.error(`Worker ${workerId} unhealthy: ${reason}`);
});

// Job lifecycle events
adapter.on('job:submitted', ({ jobId, job }) => {
  console.log(`Job submitted: ${jobId}`);
});

adapter.on('job:processing', ({ jobId, job }) => {
  console.log(`Job processing: ${jobId}`);
});

adapter.on('job:completed', ({ jobId, result, slaCompliance }) => {
  console.log(`Job completed: ${jobId}`);
  console.log(`SLA met: ${slaCompliance.met}`);
  console.log(`Latency: ${slaCompliance.actualMs}ms`);
});

adapter.on('job:failed', ({ jobId, error }) => {
  console.error(`Job failed: ${jobId}`, error);
});

adapter.on('job:dead-letter', ({ jobId, job }) => {
  console.error(`Job moved to DLQ: ${jobId}`);
});
```

## Error Handling

### Retry Policy

Jobs automatically retry on failure with exponential backoff:

```
Attempt 1: Immediate
Attempt 2: 1s delay + 10% jitter
Attempt 3: 2s delay + 10% jitter
Attempt 4: 4s delay + 10% jitter
Max delay: 30s
```

### Dead Letter Queue

After max retries (default: 3), jobs move to DLQ:

```typescript
{
  deadLetterConfig: {
    enabled: true,
    maxRetries: 3,
    queueName: 'ai-jobs-dlq'
  }
}
```

### Error Types

```typescript
try {
  const result = await adapter.submitJobWithCallback(payload);
} catch (error) {
  if (error.message.includes('timeout')) {
    // Job timed out
  } else if (error.message.includes('Provider')) {
    // AI provider error
  } else if (error.message.includes('Circuit breaker')) {
    // Too many failures, circuit breaker opened
  }
}
```

## Troubleshooting Guide

### Problem: Jobs Stuck in Queue

**Symptoms:**
- Jobs remain in QUEUED status
- No processing activity

**Solutions:**
1. Check worker pool status:
   ```typescript
   const stats = adapter.getStats();
   console.log('Idle workers:', stats.workerPoolStats.idleWorkers);
   ```

2. Verify queue manager is running:
   ```typescript
   await adapter.start();  // Ensure started
   ```

3. Check for worker health issues:
   ```typescript
   adapter.on('worker-pool:worker-unhealthy', (data) => {
     console.error('Unhealthy worker:', data);
   });
   ```

### Problem: High Latency

**Symptoms:**
- Jobs completing slower than expected
- SLA violations

**Solutions:**
1. Increase worker count:
   ```typescript
   // Increase maxWorkers
   workerPoolConfig: { maxWorkers: 50 }
   ```

2. Optimize priority queue usage:
   ```typescript
   // Use appropriate priorities
   priority: AIJobPriority.URGENT  // For time-critical jobs
   ```

3. Enable auto-scaling:
   ```typescript
   workerPoolConfig: {
     autoScale: true,
     scaleUpThreshold: 50  // Lower threshold for faster scaling
   }
   ```

### Problem: Memory Issues

**Symptoms:**
- Workers marked as unhealthy
- Out of memory errors

**Solutions:**
1. Reduce worker memory limit:
   ```typescript
   workerConfig: { maxMemoryMb: 256 }
   ```

2. Decrease concurrent workers:
   ```typescript
   workerPoolConfig: { maxWorkers: 20 }
   ```

3. Enable garbage collection between jobs

### Problem: Jobs Failing Repeatedly

**Symptoms:**
- Jobs moving to DLQ
- High failure rate

**Solutions:**
1. Check AI provider connectivity:
   ```typescript
   const health = await provider.healthCheck();
   ```

2. Increase retry count:
   ```typescript
   await adapter.submitJob(payload, { maxRetries: 5 });
   ```

3. Review job payload validation:
   ```typescript
   try {
     validateJobPayload(payload);
   } catch (error) {
     console.error('Invalid payload:', error);
   }
   ```

## Performance Tuning

### Throughput Optimization

Target: >100 jobs/second

1. **Increase worker pool size:**
   ```typescript
   defaultWorkers: 30,
   maxWorkers: 50
   ```

2. **Optimize batch size:**
   ```typescript
   batchSize: 10  // Process 10 jobs per poll
   ```

3. **Reduce poll interval:**
   ```typescript
   pollIntervalMs: 50  // Poll every 50ms
   ```

4. **Use batch submission:**
   ```typescript
   await orchestrator.submitBatchJob(jobs, { maxConcurrency: 50 });
   ```

### Latency Optimization

Target: <1 second for URGENT jobs

1. **Use URGENT priority:**
   ```typescript
   priority: AIJobPriority.URGENT  // SLA: 3s
   ```

2. **Pre-warm worker pool:**
   ```typescript
   minWorkers: 10,  // Always have workers ready
   ```

3. **Disable auto-scaling for consistent performance:**
   ```typescript
   autoScale: false
   ```

4. **Use callback-based submission:**
   ```typescript
   const result = await adapter.submitJobWithCallback(payload);
   // No polling overhead
   ```

## Best Practices

### 1. Priority Assignment

- **URGENT (15):** Real-time chat, critical user requests
- **HIGH (10):** Interactive features, user-facing operations
- **MEDIUM (5):** Background processing, batch operations
- **LOW (1):** Bulk operations, analytics, cleanup tasks

### 2. Resource Management

- Set appropriate worker limits based on available resources
- Monitor memory usage and adjust `maxMemoryMb`
- Use auto-scaling for variable workloads
- Pre-warm workers for predictable traffic

### 3. Error Handling

- Always handle job failures gracefully
- Monitor DLQ for recurring issues
- Set reasonable retry limits (2-5 retries)
- Use circuit breaker patterns for external failures

### 4. Monitoring

- Track SLA compliance metrics
- Monitor worker pool health
- Log job lifecycle events
- Set up alerts for DLQ accumulation

### 5. Testing

- Test with various job types and payloads
- Simulate high load scenarios
- Verify retry and DLQ behavior
- Benchmark throughput and latency

## Integration Example

Complete integration with Express API:

```typescript
import express from 'express';
import { AIQueueAdapter, AIJobOrchestrator } from '@noa/ai-provider';
import { QueueManager } from '@noa/message-queue';
import { createLogger } from 'winston';

const app = express();
const logger = createLogger({ level: 'info' });

// Initialize components
const queueManager = new QueueManager({ config, logger });
const adapter = new AIQueueAdapter({ queueManager, logger, ...config });
const orchestrator = new AIJobOrchestrator(adapter, logger);

// Start services
await queueManager.start();
await adapter.start();
await orchestrator.start();

// API endpoints
app.post('/ai/jobs', async (req, res) => {
  try {
    const jobId = await adapter.submitJob(req.body.payload, {
      priority: req.body.priority || AIJobPriority.MEDIUM
    });
    res.json({ jobId, status: 'queued' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/ai/jobs/:id', async (req, res) => {
  const job = await adapter.getJobStatus(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

app.delete('/ai/jobs/:id', async (req, res) => {
  const cancelled = await adapter.cancelJob(req.params.id);
  res.json({ cancelled });
});

app.post('/ai/jobs/batch', async (req, res) => {
  const batchId = await orchestrator.submitBatchJob(
    req.body.jobs,
    req.body.options
  );
  res.json({ batchId, status: 'processing' });
});

app.get('/ai/stats', (req, res) => {
  res.json({
    adapter: adapter.getStats(),
    orchestrator: orchestrator.getStats()
  });
});

app.listen(3000, () => {
  console.log('AI Queue API listening on port 3000');
});
```

## WebSocket Support for Real-time Updates

```typescript
import { Server } from 'socket.io';

const io = new Server(server);

// Emit job updates to connected clients
adapter.on('job:completed', ({ jobId, result }) => {
  io.to(`job:${jobId}`).emit('job:update', {
    jobId,
    status: 'completed',
    result
  });
});

adapter.on('job:failed', ({ jobId, error }) => {
  io.to(`job:${jobId}`).emit('job:update', {
    jobId,
    status: 'failed',
    error: error.message
  });
});

// Client subscribes to job updates
io.on('connection', (socket) => {
  socket.on('subscribe:job', (jobId) => {
    socket.join(`job:${jobId}`);
  });
});
```

## Conclusion

The AI Queue Integration provides a production-ready solution for async AI processing with:

- ✅ High throughput (>100 jobs/s)
- ✅ Low latency (3-60s SLA based on priority)
- ✅ Auto-scaling workers (1-50 workers)
- ✅ Robust error handling (retry + DLQ)
- ✅ Advanced orchestration (batch, schedule, chain)
- ✅ Comprehensive monitoring

For questions or issues, refer to the test suite in `__tests__/ai-queue-adapter.test.ts` or contact the development team.
