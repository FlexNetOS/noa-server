---
title: API Documentation Hub
category: API
last_updated: 2025-10-23
related: [INDEX.md, ARCHITECTURE.md, DEPLOYMENT.md]
---

# API Documentation Hub

> Complete API reference for NOA Server AI infrastructure platform

## Overview

NOA Server provides RESTful APIs for AI inference, system management,
authentication, and monitoring. All APIs follow OpenAPI 3.0 specification and
support JSON request/response formats.

**Base URL:** `https://api.noa-server.io/v1`

---

## 🚀 Quick Start

### Authentication

All API requests require authentication via API key:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.noa-server.io/v1/inference
```

**Get an API Key:**

1. [Sign up for an account](https://noa-server.io/signup)
2. Navigate to Settings → API Keys
3. Click "Create New API Key"
4. Copy and securely store your key

---

## 📚 API Categories

### AI Inference API

**Endpoint:** `/v1/inference`

Run AI/ML inference across multiple providers.

- [Inference API Reference](api/ai-inference-api.md)
- [OpenAPI Spec](api/openapi.yaml#/inference)
- [Code Examples](api/examples/inference.md)

**Common Operations:**

- Text generation
- Chat completion
- Embeddings generation
- Image generation
- Function calling

### Authentication API

**Endpoint:** `/v1/auth`

User authentication and authorization.

- [Auth API Reference](api/auth-api.md)
- [OAuth 2.0 Guide](api/oauth2.md)
- [SAML Integration](api/saml.md)

**Common Operations:**

- User login/logout
- Token refresh
- Password reset
- Multi-factor authentication
- SSO integration

### Management API

**Endpoint:** `/v1/manage`

System configuration and management.

- [Management API Reference](api/management-api.md)
- [Admin Guide](api/admin-guide.md)

**Common Operations:**

- Provider configuration
- Rate limit management
- Cache control
- Usage analytics
- System health checks

### Monitoring API

**Endpoint:** `/v1/metrics`

Real-time metrics and monitoring.

- [Monitoring API Reference](api/monitoring-api.md)
- [Metrics Guide](../MONITORING_QUICKSTART.md)

**Common Operations:**

- System metrics
- Performance data
- Error tracking
- Usage statistics
- Health checks

---

## 📖 API Reference

### Core Endpoints

| Endpoint                   | Method | Description         | Rate Limit |
| -------------------------- | ------ | ------------------- | ---------- |
| `/v1/inference/chat`       | POST   | Chat completion     | 100/min    |
| `/v1/inference/embeddings` | POST   | Generate embeddings | 200/min    |
| `/v1/inference/image`      | POST   | Image generation    | 50/min     |
| `/v1/auth/login`           | POST   | User login          | 10/min     |
| `/v1/auth/token/refresh`   | POST   | Refresh token       | 20/min     |
| `/v1/manage/providers`     | GET    | List providers      | 100/min    |
| `/v1/metrics/usage`        | GET    | Usage statistics    | 50/min     |
| `/v1/health`               | GET    | Health check        | 1000/min   |

**[View Complete API Reference →](quick-reference/API_ENDPOINTS.md)**

---

## 🔑 Authentication

### API Key Authentication

**Header:**

```
Authorization: Bearer sk-your-api-key-here
```

**Example:**

```bash
curl -X POST https://api.noa-server.io/v1/inference/chat \
  -H "Authorization: Bearer sk-abc123xyz" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
```

### OAuth 2.0

For web applications, use OAuth 2.0 flow:

1. Redirect user to `/auth/authorize`
2. Receive authorization code
3. Exchange code for access token
4. Use access token in API requests

**[OAuth 2.0 Documentation →](api/oauth2.md)**

### SAML Single Sign-On

Enterprise SSO via SAML 2.0:

- [SAML Configuration Guide](api/saml.md)
- [IdP Integration](api/saml-idp.md)
- [SP Metadata](api/saml-metadata.xml)

---

## 📝 Request/Response Format

### Request Format

**Headers:**

```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
X-Request-ID: optional-unique-id
```

**Body (JSON):**

```json
{
  "model": "gpt-4",
  "messages": [{ "role": "user", "content": "Hello!" }],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

### Response Format

**Success Response (200 OK):**

```json
{
  "id": "req_abc123",
  "object": "chat.completion",
  "created": 1699000000,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  }
}
```

**Error Response (4xx/5xx):**

```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Invalid API key provided",
    "param": "authorization",
    "code": "invalid_api_key"
  }
}
```

---

## 🛠️ SDKs & Client Libraries

### Official SDKs

**JavaScript/TypeScript**

```bash
npm install @noa/sdk
```

```typescript
import { NoaClient } from '@noa/sdk';

const client = new NoaClient({ apiKey: 'YOUR_API_KEY' });
const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

**[JavaScript SDK Documentation →](MCP_CLIENT_LIBRARIES.md)**

**Python**

```bash
pip install noa-sdk
```

```python
from noa import NoaClient

client = NoaClient(api_key='YOUR_API_KEY')
response = client.chat.completions.create(
    model='gpt-4',
    messages=[{'role': 'user', 'content': 'Hello!'}]
)
```

**[Python SDK Documentation →](api/python-sdk.md)**

### Community SDKs

- **Go:** [noa-go](https://github.com/noa-server/noa-go)
- **Ruby:** [noa-ruby](https://github.com/noa-server/noa-ruby)
- **Java:** [noa-java](https://github.com/noa-server/noa-java)
- **PHP:** [noa-php](https://github.com/noa-server/noa-php)

---

## 📊 Rate Limiting

### Rate Limit Headers

Every API response includes rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699000060
```

### Rate Limit Tiers

| Tier       | Requests/Min | Tokens/Min | Concurrent Requests |
| ---------- | ------------ | ---------- | ------------------- |
| Free       | 100          | 10,000     | 5                   |
| Pro        | 1,000        | 100,000    | 50                  |
| Enterprise | Custom       | Custom     | Custom              |

**[Upgrade Your Plan →](https://noa-server.io/pricing)**

### Handling Rate Limits

When rate limited (HTTP 429):

```json
{
  "error": {
    "type": "rate_limit_error",
    "message": "Rate limit exceeded. Retry after 30 seconds.",
    "retry_after": 30
  }
}
```

**Best Practices:**

- Implement exponential backoff
- Monitor `X-RateLimit-Remaining` header
- Use batch requests when possible
- Cache responses

---

## 🔧 Error Handling

### Error Codes

| Code                  | HTTP Status | Description        | Action               |
| --------------------- | ----------- | ------------------ | -------------------- |
| `invalid_api_key`     | 401         | Invalid API key    | Check API key        |
| `rate_limit_exceeded` | 429         | Too many requests  | Retry with backoff   |
| `invalid_request`     | 400         | Malformed request  | Check request format |
| `resource_not_found`  | 404         | Resource not found | Verify resource ID   |
| `server_error`        | 500         | Internal error     | Retry request        |
| `service_unavailable` | 503         | Service down       | Check status page    |

### Error Response Structure

```json
{
  "error": {
    "type": "error_type",
    "message": "Human-readable error message",
    "param": "field_name",
    "code": "error_code",
    "request_id": "req_abc123"
  }
}
```

**[Complete Error Reference →](api/errors.md)**

---

## 🧪 Testing & Development

### Sandbox Environment

Test APIs without affecting production:

**Base URL:** `https://sandbox-api.noa-server.io/v1`

**Features:**

- Separate API keys
- Synthetic data
- No rate limits
- Free to use

### API Playground

Interactive API testing:

- **[API Playground](https://noa-server.io/playground)** - Test APIs in browser
- **[Postman Collection](api/postman-collection.json)** - Import into Postman
- **[cURL Examples](api/curl-examples.sh)** - Command-line examples

### Mock Server

Local API mocking for development:

```bash
npm install -g @noa/mock-server
noa-mock-server --port 3000
```

**[Mock Server Documentation →](api/mock-server.md)**

---

## 📈 Usage & Analytics

### Usage Dashboard

Monitor API usage:

- **[Dashboard](https://noa-server.io/dashboard)** - Real-time usage
- **[Analytics API](api/analytics-api.md)** - Programmatic access
- **[Export Data](api/exports.md)** - Download usage reports

### Usage Metrics

Track key metrics:

- Request volume
- Token consumption
- Response times
- Error rates
- Cost analysis

---

## 🔐 Security

### Best Practices

**API Key Security:**

- ✅ Store keys in environment variables
- ✅ Use different keys for dev/prod
- ✅ Rotate keys regularly
- ✅ Implement key rotation without downtime
- ❌ Never commit keys to git
- ❌ Never expose keys in client-side code

**Request Security:**

- Use HTTPS only
- Validate all inputs
- Implement CORS properly
- Use request signing for sensitive operations
- Monitor for anomalies

**[Security Best Practices →](api/security.md)**

### Compliance

- **SOC 2 Type II** certified
- **GDPR** compliant
- **HIPAA** ready (Enterprise)
- **ISO 27001** certified

**[Compliance Documentation →](../COMPLIANCE_ASSESSMENT.md)**

---

## 📚 Additional Resources

### Documentation

- [OpenAPI Specification](api/openapi.yaml) - Complete OpenAPI 3.0 spec
- [API Changelog](api/CHANGELOG.md) - API version history
- [Migration Guides](api/migrations/) - Version migration guides
- [Deprecation Schedule](api/deprecations.md) - Upcoming changes

### Examples

- [Code Examples](api/examples/) - All code examples
- [Use Cases](api/use-cases/) - Common integration patterns
- [Sample Apps](api/sample-apps/) - Reference implementations

### Support

- [API Status](https://status.noa-server.io) - Service status
- [Support](mailto:support@noa-server.io) - Email support
- [Community Discord](https://discord.gg/noa-server) - Chat support
- [GitHub Issues](https://github.com/noa-server/issues) - Bug reports

---

> 📝 **Need help?** Check the
> [Troubleshooting Guide](quick-reference/TROUBLESHOOTING.md) or
> [open an issue](https://github.com/noa-server/issues/new).

**[← Back to Documentation Index](INDEX.md)**
