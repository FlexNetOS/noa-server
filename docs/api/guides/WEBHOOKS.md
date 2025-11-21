# Webhooks Guide

Real-time event notifications via webhooks in the Noa Server API.

## Table of Contents

- [Overview](#overview)
- [Available Events](#available-events)
- [Setting Up Webhooks](#setting-up-webhooks)
- [Webhook Payload](#webhook-payload)
- [Security](#security)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Webhooks allow you to receive real-time HTTP notifications when specific events
occur in the Noa Server. Instead of polling the API, webhooks push data to your
server.

### Benefits

- **Real-time Updates**: Instant notifications
- **Reduced API Calls**: No need for polling
- **Event-Driven Architecture**: Build reactive applications
- **Resource Efficient**: Lower server load

### How It Works

1. You register a webhook URL with Noa Server
2. Events occur in Noa Server (workflow completes, agent status changes, etc.)
3. Noa Server sends HTTP POST request to your URL
4. Your server processes the event and responds with 200 OK

## Available Events

### Workflow Events

| Event                | Description                 | Trigger            |
| -------------------- | --------------------------- | ------------------ |
| `workflow.created`   | New workflow created        | Workflow creation  |
| `workflow.updated`   | Workflow modified           | Workflow update    |
| `workflow.deleted`   | Workflow deleted            | Workflow deletion  |
| `workflow.executed`  | Workflow execution started  | Execution start    |
| `workflow.completed` | Workflow execution finished | Execution complete |
| `workflow.failed`    | Workflow execution failed   | Execution failure  |

### Agent Events

| Event                  | Description            | Trigger         |
| ---------------------- | ---------------------- | --------------- |
| `agent.spawned`        | New agent created      | Agent spawn     |
| `agent.status.changed` | Agent status updated   | Status change   |
| `agent.task.assigned`  | Task assigned to agent | Task assignment |
| `agent.task.completed` | Agent completed task   | Task completion |
| `agent.terminated`     | Agent shut down        | Termination     |

### Agent Swarm Events

| Event                          | Description           | Trigger            |
| ------------------------------ | --------------------- | ------------------ |
| `swarm.created`                | New swarm created     | Swarm creation     |
| `swarm.coordination.started`   | Coordination began    | Coordination start |
| `swarm.coordination.completed` | Coordination finished | Coordination end   |
| `swarm.terminated`             | Swarm shut down       | Termination        |

### User Events

| Event             | Description          | Trigger        |
| ----------------- | -------------------- | -------------- |
| `user.registered` | New user account     | Registration   |
| `user.login`      | User logged in       | Login          |
| `user.logout`     | User logged out      | Logout         |
| `user.updated`    | User profile updated | Profile update |
| `user.deleted`    | User account deleted | Deletion       |

### System Events

| Event                | Description            | Trigger          |
| -------------------- | ---------------------- | ---------------- |
| `system.alert`       | System alert triggered | Alert condition  |
| `system.maintenance` | Maintenance scheduled  | Maintenance plan |

## Setting Up Webhooks

### 1. Create Webhook Endpoint

Create an endpoint on your server to receive webhooks:

```javascript
// Express.js example
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

app.post('/webhooks/noa-server', (req, res) => {
  // Verify webhook signature
  const signature = req.headers['x-webhook-signature'];
  if (!verifySignature(req.body, signature)) {
    return res.status(401).send('Invalid signature');
  }

  // Process event
  const event = req.body;
  console.log(`Received event: ${event.event}`);

  switch (event.event) {
    case 'workflow.completed':
      handleWorkflowCompleted(event.data);
      break;
    case 'agent.status.changed':
      handleAgentStatusChanged(event.data);
      break;
    default:
      console.log(`Unhandled event: ${event.event}`);
  }

  // Respond with 200 OK
  res.status(200).send('OK');
});

function verifySignature(payload, signature) {
  const secret = process.env.WEBHOOK_SECRET;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(JSON.stringify(payload)).digest('hex');
  return signature === digest;
}

app.listen(3001, () => {
  console.log('Webhook server running on port 3001');
});
```

### 2. Register Webhook

Register your webhook URL with the Noa Server API:

```bash
curl -X POST https://api.noa-server.io/v1/webhooks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhooks/noa-server",
    "events": [
      "workflow.completed",
      "workflow.failed",
      "agent.status.changed"
    ],
    "description": "Production webhook for workflow monitoring",
    "active": true
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "wh_550e8400-e29b-41d4-a716-446655440000",
    "url": "https://your-server.com/webhooks/noa-server",
    "events": ["workflow.completed", "workflow.failed", "agent.status.changed"],
    "secret": "YOUR_WEBHOOK_SECRET",
    "active": true,
    "createdAt": "2025-10-22T10:00:00Z"
  }
}
```

### 3. Test Webhook

Test your webhook configuration:

```bash
curl -X POST https://api.noa-server.io/v1/webhooks/{webhookId}/test \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

This sends a test event to your webhook URL.

## Webhook Payload

### Standard Payload Structure

All webhook payloads follow this structure:

```json
{
  "id": "evt_550e8400-e29b-41d4-a716-446655440000",
  "event": "workflow.completed",
  "timestamp": "2025-10-22T10:00:00Z",
  "webhookId": "wh_550e8400-e29b-41d4-a716-446655440000",
  "data": {
    // Event-specific data
  },
  "metadata": {
    "apiVersion": "v1",
    "requestId": "req_12345"
  }
}
```

### Example Payloads

#### Workflow Completed

```json
{
  "id": "evt_123",
  "event": "workflow.completed",
  "timestamp": "2025-10-22T10:00:00Z",
  "webhookId": "wh_456",
  "data": {
    "workflowId": "wf_789",
    "executionId": "exec_abc",
    "name": "Data Processing Pipeline",
    "status": "success",
    "duration": 45000,
    "startedAt": "2025-10-22T09:59:15Z",
    "completedAt": "2025-10-22T10:00:00Z",
    "result": {
      "recordsProcessed": 1000,
      "outputFile": "/data/output.json"
    }
  }
}
```

#### Agent Status Changed

```json
{
  "id": "evt_124",
  "event": "agent.status.changed",
  "timestamp": "2025-10-22T10:00:00Z",
  "webhookId": "wh_456",
  "data": {
    "agentId": "ag_xyz",
    "name": "Backend Developer",
    "previousStatus": "idle",
    "currentStatus": "busy",
    "taskId": "task_123",
    "swarmId": "swarm_789"
  }
}
```

#### Agent Task Completed

```json
{
  "id": "evt_125",
  "event": "agent.task.completed",
  "timestamp": "2025-10-22T10:00:00Z",
  "webhookId": "wh_456",
  "data": {
    "agentId": "ag_xyz",
    "taskId": "task_123",
    "type": "code_generation",
    "status": "completed",
    "duration": 30000,
    "result": {
      "filesCreated": ["/src/api/users.ts", "/src/api/auth.ts"],
      "linesOfCode": 450
    }
  }
}
```

## Security

### 1. Webhook Signatures

All webhooks include a signature header for verification:

```http
X-Webhook-Signature: sha256=abc123...
```

**Verify signatures:**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');

  // Use timing-safe comparison
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
```

### 2. IP Allowlisting

Restrict webhook access to Noa Server IPs:

```javascript
const ALLOWED_IPS = ['203.0.113.0/24', '198.51.100.0/24'];

function isAllowedIP(ip) {
  // Implement IP range checking
  return ALLOWED_IPS.some((range) => ipInRange(ip, range));
}

app.post('/webhooks/noa-server', (req, res) => {
  const clientIP = req.ip;

  if (!isAllowedIP(clientIP)) {
    return res.status(403).send('Forbidden');
  }

  // Process webhook...
});
```

### 3. HTTPS Only

Always use HTTPS endpoints for webhooks:

```bash
# ✅ Secure
https://your-server.com/webhooks/noa-server

# ❌ Insecure
http://your-server.com/webhooks/noa-server
```

### 4. Idempotency

Handle duplicate webhook deliveries:

```javascript
const processedEvents = new Set();

app.post('/webhooks/noa-server', async (req, res) => {
  const eventId = req.body.id;

  // Check if already processed
  if (processedEvents.has(eventId)) {
    console.log(`Duplicate event: ${eventId}`);
    return res.status(200).send('OK'); // Still return 200
  }

  // Process event
  await processEvent(req.body);

  // Mark as processed
  processedEvents.add(eventId);

  res.status(200).send('OK');
});
```

## Best Practices

### 1. Respond Quickly

Respond with 200 OK within 5 seconds:

```javascript
app.post('/webhooks/noa-server', async (req, res) => {
  // Respond immediately
  res.status(200).send('OK');

  // Process asynchronously
  processEventAsync(req.body).catch((err) => {
    console.error('Error processing event:', err);
  });
});

async function processEventAsync(event) {
  // Long-running processing...
}
```

### 2. Implement Retry Logic

Noa Server retries failed webhook deliveries:

- **Retry Schedule**: Exponential backoff
- **Max Retries**: 5 attempts
- **Timeout**: 30 seconds per attempt

Ensure your endpoint is reliable:

```javascript
app.post('/webhooks/noa-server', async (req, res) => {
  try {
    await processEvent(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing failed:', error);

    // Return 500 to trigger retry
    res.status(500).send('Processing failed');
  }
});
```

### 3. Log All Events

Log webhook events for debugging:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: 'webhooks.log' })],
});

app.post('/webhooks/noa-server', (req, res) => {
  logger.info('Webhook received', {
    eventId: req.body.id,
    event: req.body.event,
    timestamp: req.body.timestamp,
    data: req.body.data,
  });

  // Process event...
});
```

### 4. Use Queue for Processing

Queue events for reliable processing:

```javascript
const Queue = require('bull');
const webhookQueue = new Queue('webhooks', {
  redis: { host: 'localhost', port: 6379 },
});

app.post('/webhooks/noa-server', async (req, res) => {
  // Add to queue
  await webhookQueue.add(req.body);

  // Respond immediately
  res.status(200).send('OK');
});

// Process queue
webhookQueue.process(async (job) => {
  const event = job.data;
  await processEvent(event);
});
```

### 5. Monitor Webhook Health

Track webhook delivery success:

```javascript
const metrics = {
  received: 0,
  processed: 0,
  failed: 0,
};

app.post('/webhooks/noa-server', async (req, res) => {
  metrics.received++;

  try {
    await processEvent(req.body);
    metrics.processed++;
    res.status(200).send('OK');
  } catch (error) {
    metrics.failed++;
    res.status(500).send('Error');
  }
});

// Expose metrics
app.get('/webhooks/metrics', (req, res) => {
  res.json({
    ...metrics,
    successRate: metrics.processed / metrics.received,
  });
});
```

## Managing Webhooks

### List Webhooks

```bash
curl -X GET https://api.noa-server.io/v1/webhooks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update Webhook

```bash
curl -X PUT https://api.noa-server.io/v1/webhooks/{webhookId} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "events": ["workflow.completed", "workflow.failed"],
    "active": true
  }'
```

### Delete Webhook

```bash
curl -X DELETE https://api.noa-server.io/v1/webhooks/{webhookId} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### View Webhook Deliveries

```bash
curl -X GET https://api.noa-server.io/v1/webhooks/{webhookId}/deliveries \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Troubleshooting

### Common Issues

**1. Webhooks not received**

- Verify URL is publicly accessible
- Check firewall rules
- Ensure HTTPS certificate is valid
- Verify webhook is active

**2. Signature verification fails**

- Check webhook secret
- Verify signature algorithm (SHA256)
- Ensure raw body is used for verification

**3. Timeouts**

- Respond within 5 seconds
- Process events asynchronously
- Use queue for long operations

**4. Duplicate events**

- Implement idempotency checks
- Use event ID for deduplication
- Store processed event IDs

### Debug Webhook Deliveries

View delivery logs in the dashboard or via API:

```bash
curl -X GET https://api.noa-server.io/v1/webhooks/{webhookId}/deliveries/{deliveryId} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**

```json
{
  "id": "del_123",
  "webhookId": "wh_456",
  "eventId": "evt_789",
  "status": "success",
  "attempts": 1,
  "request": {
    "url": "https://your-server.com/webhooks/noa-server",
    "method": "POST",
    "headers": {...},
    "body": {...}
  },
  "response": {
    "statusCode": 200,
    "body": "OK",
    "duration": 150
  },
  "timestamp": "2025-10-22T10:00:00Z"
}
```

---

For more information, see:

- [API Quick Start](./API_QUICKSTART.md)
- [Authentication Guide](./AUTHENTICATION.md)
- [Rate Limiting Guide](./RATE_LIMITING.md)
