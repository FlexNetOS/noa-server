# MCP Model Gateway

Production-ready model gateway with OpenAI-compatible API, multi-provider support, tenant management, cost tracking, and observability.

## Features

### Consolidated from All Versions

- ✅ **Base Features**
  - OpenAI-compatible API endpoints
  - Multi-provider routing (OpenRouter, Anthropic, llama.cpp)
  - Request/response transformation
  - Basic statistics tracking

- ✅ **Upgrade 1 Features**
  - OpenTelemetry GenAI spans
  - Structured output validation with Ajv
  - WebRTC/TURN realtime lane

- ✅ **Upgrade 2 Features**
  - SSE streaming support
  - Per-tenant management and isolation
  - Token budget tracking and enforcement
  - Cost calculation and limits
  - Trace recording with IDs

### Production Enhancements

- 🆕 Rate limiting per tenant
- 🆕 Request caching
- 🆕 Health check endpoints
- 🆕 Prometheus metrics
- 🆕 Security headers (Helmet)
- 🆕 Request logging (Morgan)
- 🆕 Error handling and recovery
- 🆕 Graceful shutdown

## Architecture

```
Gateway → Router → Upstream Adapter → LLM Provider
           ↓
      Middleware Stack:
      - Authentication
      - Rate Limiting
      - Tenant Resolution
      - Budget Checking
      - Tracing
      - Logging
```

## Supported Providers

- **OpenRouter / LiteLLM** - Multiple models via single API
- **Anthropic** - Claude models
- **llama.cpp** - Local inference
- **OpenAI** - GPT models (via OpenAI-compatible adapter)

## API Endpoints

### Chat Completion

```bash
POST /v1/chat/completions
Content-Type: application/json
Authorization: Bearer <api-key>

{
  "model": "gpt-4",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "tenant": "my-tenant",
  "stream": false
}
```

### Streaming

```bash
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "gpt-4",
  "messages": [...],
  "stream": true
}
```

### Stats

```bash
GET /api/stats
```

Returns:
```json
{
  "requests": 1000,
  "tokens_in": 50000,
  "tokens_out": 75000,
  "cost_total_usd": 1.25
}
```

### Traces

```bash
GET /api/traces?limit=100
```

### Tenants

```bash
GET /api/tenants
GET /api/tenants/:id
GET /api/tenants/:id/records
POST /api/tenants
PUT /api/tenants/:id
DELETE /api/tenants/:id
```

### Health

```bash
GET /health
GET /ready
```

## Configuration

Environment variables:

```env
# Server
PORT=8080
NODE_ENV=production

# API Keys
OPENROUTER_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Upstream URLs
LLAMACPP_URL=http://localhost:8080

# Features
ENABLE_STREAMING=true
ENABLE_WEBRTC=true
ENABLE_RATE_LIMIT=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_SERVICE_NAME=model-gateway

# OPA (Policy)
OPA_URL=http://opa:8181

# Database (for tenant/cost tracking)
DATABASE_URL=postgresql://user:pass@localhost/gateway
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run with OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 npm start
```

## Cost Calculation

The gateway calculates costs using these pricing models:

- **GPT-4**: $0.03/1K input tokens, $0.06/1K output tokens
- **GPT-3.5-turbo**: $0.001/1K tokens
- **Claude-3-Opus**: $0.015/1K input, $0.075/1K output
- **Claude-3-Sonnet**: $0.003/1K input, $0.015/1K output

Costs are tracked per-tenant and enforced against budget limits.

## Tenant Management

### Creating a Tenant

```javascript
await fetch('/api/tenants', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'acme-corp',
    budget_usd: 1000.00
  })
})
```

### Budget Enforcement

Requests are rejected if:
- Tenant doesn't exist
- Tenant budget is exceeded
- Request would exceed budget

## Observability

### OpenTelemetry Traces

All requests generate OTel traces with:
- Request ID
- Model used
- Token counts
- Cost calculated
- Latency
- Errors

View traces in Jaeger/Grafana Tempo using the trace ID from `x-trace-id` header.

### Metrics (Prometheus)

- `http_requests_total` - Total requests
- `http_request_duration_seconds` - Request latency
- `llm_tokens_total` - Token usage by model/tenant
- `llm_cost_total` - Cost by tenant
- `llm_budget_exceeded_total` - Budget violations

### Logs

Structured JSON logs with:
- Timestamp
- Request ID
- Tenant
- Model
- Tokens
- Cost
- Latency
- Errors

## WebRTC Support

Enable real-time communication with:

```javascript
const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'turn:localhost:3478' }]
})

// Setup data channel for streaming
const channel = pc.createDataChannel('llm-stream')
```

## Security

- **Helmet**: Security headers
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Zod schemas
- **Budget Enforcement**: Cost controls
- **API Key Auth**: Bearer tokens
- **Tenant Isolation**: Data separation

## Production Checklist

- [ ] Set strong API keys
- [ ] Enable HTTPS/TLS
- [ ] Configure rate limits
- [ ] Set tenant budgets
- [ ] Enable OpenTelemetry
- [ ] Set up alerts
- [ ] Configure backup
- [ ] Enable monitoring
- [ ] Review security headers
- [ ] Test failover scenarios

## License

MIT
