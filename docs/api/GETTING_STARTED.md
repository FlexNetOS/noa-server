# Getting Started with NOA Server API

Complete guide to start using the NOA Server API in minutes.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Making Your First Request](#making-your-first-request)
- [Common Use Cases](#common-use-cases)
- [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 16+ (for JavaScript/TypeScript examples)
- **Python** 3.8+ (for Python examples)
- **cURL** (for command-line testing)
- **Postman** (optional, for GUI testing)
- **NOA Server** running locally or access to production instance

## Quick Start

### 1. Choose Your Tool

**Option A: Interactive Browser (Easiest)**

```bash
# Open Swagger UI
open docs/api/swagger-ui.html
# Or if server is running: http://localhost:3000/api-docs
```

**Option B: Postman (GUI)**

1. Import `docs/api/postman/noa-server.json`
2. Set `baseUrl` to `http://localhost:3000/api/v1`
3. Run "Login" request to authenticate

**Option C: cURL (Command Line)**

```bash
./docs/api/examples/curl/examples.sh
```

**Option D: Code (SDKs)**

```bash
# JavaScript/TypeScript
npm install @noa-server/api-client

# Python
pip install noa-server-api-client
```

### 2. Start the Server

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

### 3. Verify Health

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "checks": [...]
}
```

## Authentication

### Register an Account

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "SecureP@ssw0rd123!",
    "metadata": {
      "firstName": "Your",
      "lastName": "Name"
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "your-email@example.com",
    "mfaEnabled": false,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "SecureP@ssw0rd123!"
  }'
```

**Response:**

```json
{
  "success": true,
  "user": { ... },
  "token": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  }
}
```

### Save Your Token

```bash
# Save token to environment variable
export AUTH_TOKEN="eyJhbGciOiJSUzI1NiIs..."

# Or save to file
echo "eyJhbGciOiJSUzI1NiIs..." > .token
```

## Making Your First Request

### Example 1: List Available AI Models

```bash
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  http://localhost:3000/api/v1/models | jq '.'
```

**Response:**

```json
{
  "models": [
    {
      "id": "gpt-4",
      "provider": "openai",
      "name": "GPT-4",
      "capabilities": ["chat", "completion"],
      "maxTokens": 8192
    },
    {
      "id": "claude-3-5-sonnet-20241022",
      "provider": "claude",
      "name": "Claude 3.5 Sonnet",
      "capabilities": ["chat", "completion"],
      "maxTokens": 200000
    }
  ]
}
```

### Example 2: Generate Chat Completion

```bash
curl -X POST http://localhost:3000/api/v1/inference/chat \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful AI assistant."
      },
      {
        "role": "user",
        "content": "Explain quantum computing in simple terms."
      }
    ],
    "model": "gpt-4",
    "config": {
      "temperature": 0.7,
      "max_tokens": 500
    }
  }' | jq '.'
```

**Response:**

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Quantum computing is like having a super-powerful calculator..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 125,
    "total_tokens": 170
  }
}
```

### Example 3: Publish Message to Queue

```bash
curl -X POST http://localhost:3000/api/v1/queue/publish \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "queue": "ai-inference",
    "payload": {
      "type": "batch_process",
      "items": ["item1", "item2", "item3"]
    },
    "priority": "high"
  }' | jq '.'
```

**Response:**

```json
{
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "queue": "ai-inference",
  "status": "queued",
  "publishedAt": "2024-01-01T00:00:00Z"
}
```

## Common Use Cases

### Use Case 1: Build a Chatbot

```javascript
// JavaScript Example
const chat = async (userMessage) => {
  const response = await fetch('http://localhost:3000/api/v1/inference/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: 'You are a helpful chatbot.' },
        { role: 'user', content: userMessage },
      ],
      model: 'gpt-4',
      config: { temperature: 0.8 },
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
};

// Usage
const reply = await chat('Hello, how are you?');
console.log(reply);
```

### Use Case 2: Process Background Tasks

```python
# Python Example
from client import NoaClient

client = NoaClient('http://localhost:3000/api/v1')
client.login('your-email@example.com', 'password')

# Publish task to queue
message_id = client.publish_message(
    queue='ai-inference',
    payload={
        'type': 'summarize_documents',
        'documents': ['doc1.txt', 'doc2.txt', 'doc3.txt']
    },
    priority='high'
)

print(f"Task queued: {message_id}")

# Worker: consume and process
while True:
    messages = client.consume_messages(queue='ai-inference', limit=5)

    for message in messages['messages']:
        try:
            # Process the task
            result = process_task(message['payload'])

            # Acknowledge completion
            client.acknowledge_message(message['receiptHandle'])
        except Exception as e:
            # Return to queue for retry
            client.nack_message(message['receiptHandle'], str(e))
```

### Use Case 3: Generate Embeddings for Search

```bash
# Generate embeddings
curl -X POST http://localhost:3000/api/v1/inference/embeddings \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input": [
      "Machine learning is a subset of AI",
      "Deep learning uses neural networks",
      "Natural language processing enables text understanding"
    ],
    "model": "text-embedding-ada-002"
  }' | jq '.data[].embedding | length'
```

### Use Case 4: Monitor System Health

```bash
# Kubernetes liveness probe
curl http://localhost:3000/health/live

# Kubernetes readiness probe
curl http://localhost:3000/health/ready

# Get detailed metrics
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  http://localhost:3000/metrics/api | jq '.'

# Prometheus metrics
curl http://localhost:3000/metrics
```

## Next Steps

### Explore the Documentation

1. **OpenAPI Specifications**
   - [AI Inference API](openapi/ai-inference-api.yaml)
   - [Authentication API](openapi/auth-api.yaml)
   - [Message Queue API](openapi/message-queue-api.yaml)
   - [Monitoring API](openapi/monitoring-api.yaml)

2. **Interactive Docs**
   - [Swagger UI](swagger-ui.html) - Try APIs in browser
   - [ReDoc](redoc.html) - Beautiful static docs

3. **Code Examples**
   - [JavaScript Examples](examples/javascript/)
   - [Python Examples](examples/python/)
   - [cURL Examples](examples/curl/examples.sh)

4. **Guides**
   - [Authentication Guide](guides/AUTHENTICATION.md)
   - [Rate Limiting Guide](guides/RATE_LIMITING.md)
   - [Webhooks Guide](guides/WEBHOOKS.md)

### Advanced Topics

- **Multi-Factor Authentication (MFA)**

  ```bash
  # Setup MFA
  curl -X POST http://localhost:3000/api/v1/auth/mfa/setup \
    -H "Authorization: Bearer $AUTH_TOKEN"

  # Enable MFA with code from authenticator app
  curl -X POST http://localhost:3000/api/v1/auth/mfa/enable \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"verificationCode": "123456"}'
  ```

- **API Key Authentication**

  ```bash
  # Create API key
  API_KEY=$(curl -X POST http://localhost:3000/api/v1/auth/api-keys \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Production Key",
      "expiresIn": 31536000,
      "scopes": ["inference:read", "inference:write"]
    }' | jq -r '.key')

  # Use API key instead of JWT
  curl -H "X-API-Key: $API_KEY" \
    http://localhost:3000/api/v1/models
  ```

- **Streaming Responses**

  ```javascript
  const response = await fetch('/api/v1/inference/stream', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Tell me a story' }],
      model: 'gpt-3.5-turbo',
      config: { stream: true },
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    console.log(chunk);
  }
  ```

### Get Help

- **Documentation**: [README.md](README.md)
- **API Reference**: [Swagger UI](swagger-ui.html)
- **Code Examples**: [examples/](examples/)
- **GitHub Issues**: Report bugs and request features
- **Email Support**: support@noa-server.io

### Best Practices

1. **Always use HTTPS in production**
2. **Store tokens securely** (environment variables, secure vaults)
3. **Implement token refresh** before expiration
4. **Handle rate limits** with exponential backoff
5. **Use pagination** for large datasets
6. **Enable MFA** for production accounts
7. **Monitor API usage** and set up alerts
8. **Validate input** before sending to API
9. **Log errors** for debugging
10. **Test in staging** before production deployment

## Troubleshooting

### Common Issues

**1. 401 Unauthorized**

```bash
# Check token expiration
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  http://localhost:3000/api/v1/users/me

# Refresh token if expired
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

**2. 429 Rate Limit Exceeded**

```javascript
// Implement exponential backoff
async function callWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

**3. 500 Internal Server Error**

```bash
# Check server health
curl http://localhost:3000/health/detailed

# Check server logs
docker logs noa-server

# Or check local logs
tail -f logs/error.log
```

## Support Resources

- **Documentation**: [https://noa-server.io/docs](README.md)
- **API Reference**: [Swagger UI](swagger-ui.html)
- **GitHub**: https://github.com/your-org/noa-server
- **Discord**: https://discord.gg/noa-server
- **Email**: support@noa-server.io

---

**Ready to build?** Start with [Swagger UI](swagger-ui.html) or explore
[code examples](examples/)!
