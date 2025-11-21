# Model Gateway Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Application                       │
└────────────────┬────────────────────────────────┬────────────────┘
                 │                                │
                 │ HTTP/SSE                       │ WebRTC
                 │                                │
┌────────────────▼────────────────────────────────▼────────────────┐
│                      Model Gateway (Port 8080)                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Security Layer                          │  │
│  │  - Helmet (Security Headers)                               │  │
│  │  - Rate Limiting (600 req/min)                             │  │
│  │  - Body Size Limit (1MB)                                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Logging Layer                           │  │
│  │  - Morgan (HTTP Logging)                                   │  │
│  │  - OpenTelemetry (Distributed Tracing)                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Routing Layer                           │  │
│  │  POST /v1/chat/completions  ──> Chat Router                │  │
│  │  POST /realtime/offer       ──> WebRTC Handler             │  │
│  │  POST /api/opa/decide       ──> OPA Client                 │  │
│  │  GET  /api/traces           ──> Traces API                 │  │
│  │  GET  /api/tenants          ──> Tenant Summary             │  │
│  │  GET  /api/tenants/:id      ──> Tenant Records             │  │
│  │  GET  /api/stats            ──> Statistics                 │  │
│  │  GET  /health               ──> Health Check               │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  Business Logic Layer                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │   Tenant     │  │   Policy     │  │   Traces     │    │  │
│  │  │  Management  │  │  Enforcement │  │   Tracking   │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │    Route     │  │  Structured  │  │    Cost      │    │  │
│  │  │   Selection  │  │    Output    │  │  Tracking    │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  Provider Abstraction Layer                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │   OpenAI     │  │  Anthropic   │  │  llama.cpp   │    │  │
│  │  │  Compatible  │  │   Provider   │  │   Provider   │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────┬────────────────────┬───────────────────┬────────────────┘
         │                    │                   │
         │                    │                   │
┌────────▼────────┐  ┌────────▼────────┐  ┌──────▼─────────┐
│   OpenRouter    │  │   Anthropic     │  │  llama.cpp     │
│      API        │  │      API        │  │    Server      │
└─────────────────┘  └─────────────────┘  └────────────────┘
```

## Request Processing Flow

### Standard Request Flow
```
Client Request
    │
    ▼
[Rate Limiter] ──> 600 requests per minute
    │
    ▼
[Security Headers] ──> Helmet middleware
    │
    ▼
[Request Logging] ──> Morgan combined format
    │
    ▼
[Body Parsing] ──> JSON (1MB limit)
    │
    ▼
[Route Handler] ──> /v1/chat/completions
    │
    ▼
[OTel Span Start] ──> genai.chat.request
    │
    ├──> Set x-trace-id header
    │
    ▼
[Tenant Ensure] ──> ensureTenant(tenant)
    │
    ▼
[Schema Validation] ──> Zod ChatSchema
    │
    ▼
[Route Selection] ──> pickRoute(model) with weights
    │
    ▼
[Policy Enforcement]
    │
    ├──> Check allowModels
    ├──> Check maxOutputTokens
    └──> Check maxRequestUsd (cost estimate)
    │
    ▼
[OTel Span] ──> genai.chat.route
    │
    ├──> Set gen_ai.system
    ├──> Set gen_ai.request.model
    └──> Set gen_ai.request.max_tokens
    │
    ▼
[Provider Selection] ──> Based on route.provider
    │
    ├──> openai_compatible ──> callOpenAICompat()
    ├──> anthropic ──────────> callAnthropic()
    └──> llamacpp ───────────> callLlamaCpp()
    │
    ▼
[OTel Span] ──> genai.provider.*
    │
    ▼
[HTTP Request] ──> Upstream API call
    │
    ▼
[Response Processing]
    │
    ├──> [Optional] Structured Output
    │    └──> extractJson() + coerceAndValidate()
    │
    ▼
[Cost Calculation] ──> bill(route, usage)
    │
    ├──> Calculate input token cost
    ├──> Calculate output token cost
    └──> Total cost in USD
    │
    ▼
[Tenant Accounting] ──> account(tenant, trace, model, tokens, cost)
    │
    ├──> Update spend_usd
    ├──> Update tokens_in/tokens_out
    └──> Add to ring buffer
    │
    ▼
[OTel Attributes]
    │
    ├──> gen_ai.usage.prompt_tokens
    ├──> gen_ai.usage.completion_tokens
    └──> gen_ai.cost.estimated_usd
    │
    ▼
[Trace Recording] ──> recordTrace(traceId, metadata)
    │
    ▼
[Response] ──> JSON response to client
    │
    ▼
[OTel Span End]
```

### Streaming Request Flow
```
Client Request (stream: true)
    │
    ▼
[Same validation as standard flow]
    │
    ▼
[Set SSE Headers]
    │
    ├──> Content-Type: text/event-stream
    ├──> Cache-Control: no-cache
    └──> Connection: keep-alive
    │
    ▼
[Provider Stream Call]
    │
    ├──> callOpenAICompatStream()
    ├──> callAnthropicStream()
    └──> callLlamaCppStream()
    │
    ▼
[Chunk Processing Loop]
    │
    ├──> Read chunk from upstream
    ├──> Parse for usage data
    ├──> Forward to client immediately
    └──> Repeat until stream ends
    │
    ▼
[Usage Callback] ──> onUsage(usage)
    │
    ▼
[Cost Calculation] ──> bill(route, usage)
    │
    ▼
[Tenant Accounting] ──> account(...)
    │
    ▼
[Stream Termination]
    │
    ├──> Write "data: [DONE]\n\n"
    └──> End response
    │
    ▼
[OTel Span End]
```

### WebRTC Flow
```
Client SDP Offer
    │
    ▼
POST /realtime/offer
    │
    ▼
[Create RTCPeerConnection]
    │
    ├──> Load ICE servers from env
    └──> Configure peer connection
    │
    ▼
[Set Remote Description] ──> Client's SDP offer
    │
    ▼
[Setup Data Channel Handler]
    │
    └──> ondatachannel callback
    │
    ▼
[Create SDP Answer]
    │
    ├──> createAnswer()
    └──> setLocalDescription()
    │
    ▼
[Return Answer to Client] ──> { type: "answer", sdp: ... }
    │
    ▼
[Data Channel Opens]
    │
    ▼
[Message Loop]
    │
    ├──> Receive: JSON message from client
    │    └──> Parse message
    │         └──> Call routeChat(data, reqId)
    │              └──> Process through standard flow
    │                   └──> Return response
    │                        └──> Send: JSON response to client
    │
    └──> Repeat for each message
```

## Component Architecture

### Core Components

#### 1. Express Server (`src/index.ts`)
- **Purpose:** HTTP server and routing
- **Middleware Stack:**
  1. helmet() - Security headers
  2. express.json() - Body parsing
  3. morgan() - Request logging
  4. rateLimit() - Rate limiting
- **Routes:** 8 endpoints (see API section)

#### 2. Router (`src/router_chat.ts`)
- **Purpose:** Request routing and orchestration
- **Functions:**
  - `routeChat()` - Non-streaming requests
  - `routeChatStream()` - Streaming requests
  - `pickRoute()` - Load balancing with weights
  - `enforcePolicy()` - Policy validation
  - `bill()` - Cost calculation

#### 3. Tenant Manager (`src/tenants.ts`)
- **Purpose:** Multi-tenant cost tracking
- **Data Structure:** In-memory tenant records
- **Functions:**
  - `ensureTenant()` - Create/get tenant
  - `account()` - Record usage & cost
  - `summary()` - All tenant summaries
  - `records()` - Tenant request history
- **Capacity:** 200 records per tenant (ring buffer)

#### 4. Configuration (`src/config.ts`)
- **Purpose:** Route and policy definitions
- **Types:**
  - `Route` - Provider endpoint configuration
  - `Policy` - Tenant access rules
  - `GatewayConfig` - Main config structure
- **Features:**
  - Multiple routes per model alias
  - Weight-based load balancing
  - Per-route cost configuration
  - Per-tenant policies

#### 5. Structured Output (`src/structured.ts`)
- **Purpose:** JSON schema validation
- **Library:** Ajv with type coercion
- **Functions:**
  - `extractJson()` - Extract from various formats
  - `coerceAndValidate()` - Validate against schema
- **Supports:**
  - Direct JSON
  - Markdown code blocks
  - Embedded JSON in text

#### 6. OpenTelemetry (`src/otel-preload.ts`)
- **Purpose:** Distributed tracing
- **Exporter:** OTLP gRPC
- **Configuration:**
  - Service name from env
  - Endpoint from env
  - BatchSpanProcessor
- **Preload:** Loaded before application start

#### 7. Traces API (`src/traces.ts`)
- **Purpose:** Trace ID history
- **Storage:** In-memory ring buffer
- **Capacity:** 200 traces
- **Functions:**
  - `recordTrace()` - Add trace record
  - `tracesApi()` - Get recent traces

#### 8. WebRTC Handler (`src/webrtc.ts`)
- **Purpose:** Real-time communication
- **Library:** wrtc (WebRTC for Node.js)
- **Flow:**
  1. Accept SDP offer
  2. Create peer connection
  3. Setup data channel
  4. Return SDP answer
  5. Process messages via routeChat()

#### 9. OPA Client (`src/opa_client.ts`)
- **Purpose:** Policy decision integration
- **Protocol:** HTTP POST to OPA
- **Configuration:**
  - OPA_URL - Service endpoint
  - OPA_PATH - Policy path
- **Timeout:** 5 seconds
- **Fallback:** Default allow when not configured

### Provider Implementations

#### OpenAI Compatible (`src/upstreams/openai_compat.ts`)
- **Supports:** OpenRouter, OpenAI, Azure OpenAI
- **Protocol:** OpenAI Chat Completions API
- **Authentication:** Bearer token via apiKeyEnv
- **Functions:**
  - `callOpenAICompat()` - Standard completion
  - `callOpenAICompatStream()` - Streaming completion
- **Streaming:** SSE with usage tracking

#### Anthropic (`src/upstreams/anthropic.ts`)
- **Supports:** Claude models
- **Protocol:** Anthropic Messages API
- **Authentication:** x-api-key header
- **Message Transform:** User-only messages
- **Functions:**
  - `callAnthropic()` - Standard completion
  - `callAnthropicStream()` - Streaming completion
- **Response Transform:** Anthropic → OpenAI format

#### llama.cpp (`src/upstreams/llamacpp.ts`)
- **Supports:** Local llama.cpp server
- **Protocol:** OpenAI-compatible endpoint
- **Authentication:** None (local)
- **Functions:**
  - `callLlamaCpp()` - Standard completion
  - `callLlamaCppStream()` - Streaming completion
- **Use Case:** Free local inference

## Data Models

### Request Schema (Zod)
```typescript
{
  model?: string,              // Model alias
  messages: Array<{
    role: "system" | "user" | "assistant",
    content: string
  }>,
  max_tokens?: number,         // Output token limit
  temperature?: number,        // Sampling temperature
  tenant?: string,             // Tenant identifier
  response_schema?: object,    // JSON Schema for validation
  coerce?: boolean,           // Enable type coercion
  stream?: boolean            // Enable streaming
}
```

### Route Configuration
```typescript
{
  model: string,              // Model alias
  provider: Provider,         // "openai_compatible" | "anthropic" | "llamacpp"
  endpoint: string,           // API endpoint URL
  apiKeyEnv?: string,         // Environment variable for API key
  models?: string[],          // Upstream model names
  weight?: number,            // Load balancing weight
  costPer1kInput?: number,    // Input token cost (USD)
  costPer1kOutput?: number    // Output token cost (USD)
}
```

### Policy Configuration
```typescript
{
  tenants: {
    [tenantId: string]: {
      allowModels: string[],      // Allowed model aliases
      maxRequestUsd: number,       // Max cost per request
      maxOutputTokens: number      // Max output tokens
    }
  }
}
```

### Tenant Record
```typescript
{
  budget_usd: number,         // Tenant budget
  spend_usd: number,          // Total spend
  tokens_in: number,          // Total input tokens
  tokens_out: number,         // Total output tokens
  ring: Array<{               // Request history
    ts: number,               // Timestamp
    trace: string,            // Trace ID
    model: string,            // Model used
    prompt_tokens: number,    // Input tokens
    completion_tokens: number,// Output tokens
    cost_usd: number          // Request cost
  }>
}
```

## OpenTelemetry Spans

### Span Hierarchy
```
genai.chat.request (root)
  attributes:
    - Custom: x-trace-id (in response header)
  |
  +-- genai.chat.route (or genai.chat.stream)
      attributes:
        - gen_ai.system: provider name
        - gen_ai.request.model: model identifier
        - gen_ai.request.max_tokens: token limit
        - gen_ai.usage.prompt_tokens: actual input tokens
        - gen_ai.usage.completion_tokens: actual output tokens
        - gen_ai.cost.estimated_usd: request cost
        - parent.trace_id: parent span trace ID
      |
      +-- genai.provider.{openai_compat|anthropic|llamacpp}
          attributes:
            - Provider-specific attributes
```

### GenAI Semantic Conventions
Following OpenTelemetry GenAI semantic conventions:
- System identification
- Model identification
- Token usage tracking
- Cost tracking (custom extension)

## Security Architecture

### Defense in Depth

1. **Network Layer**
   - Rate limiting (600 req/min)
   - Request size limits (1MB)

2. **Application Layer**
   - Helmet security headers
   - Input validation (Zod)
   - Policy enforcement

3. **Business Logic Layer**
   - Per-tenant budgets
   - Per-request cost caps
   - Model access controls

4. **Data Layer**
   - No persistent storage (stateless)
   - Ring buffers limit memory usage

### Security Headers (Helmet)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (HSTS)
- Content-Security-Policy
- Referrer-Policy

## Scalability Considerations

### Horizontal Scaling
- **Stateless Design:** No shared state between instances
- **Load Balancer Ready:** Health check endpoint available
- **Session Affinity:** Not required
- **Container Ready:** Dockerfile included

### Memory Management
- **Ring Buffers:** Fixed size (200 items)
- **Tenant Records:** Grows with tenant count
- **Request Body:** Limited to 1MB
- **Streaming:** Low memory (chunked processing)

### Performance Optimizations
- **Connection Pooling:** Axios default keep-alive
- **Batch Span Processor:** Efficient telemetry export
- **Async/Await:** Non-blocking I/O
- **Stream Processing:** Real-time chunk forwarding

## Deployment Architecture

### Docker Container
```
FROM node:20-alpine
├── Install dependencies (pnpm/npm)
├── Copy source code
├── Build TypeScript → JavaScript
└── Run with OpenTelemetry preload
```

### Environment Variables
```bash
# Required
OPENROUTER_API_KEY=sk-or-...

# Optional
PORT=8080
OTEL_SERVICE_NAME=model-gateway
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
LLAMA_CPP_BASE=http://localhost:8081
ANTHROPIC_API_KEY=sk-ant-...
OPA_URL=http://opa:8181
OPA_PATH=v1/data/rtt/allow
ICE_SERVERS=[{"urls":"stun:..."}]
```

### Health Monitoring
- **Health Endpoint:** GET /health
- **Statistics:** GET /api/stats
- **Logging:** Morgan combined format
- **Tracing:** OpenTelemetry to OTLP endpoint

## Extension Points

### Adding New Providers
1. Create `src/upstreams/newprovider.ts`
2. Implement `callNewProvider()` and `callNewProviderStream()`
3. Add provider type to `config.ts`
4. Add case in `router_chat.ts`

### Adding New Policies
1. Extend `Policy` interface in `config.ts`
2. Add validation in `enforcePolicy()`
3. Update tenant configuration

### Adding New Endpoints
1. Add route in `src/index.ts`
2. Implement handler function
3. Add OpenTelemetry span if needed

### Custom Middleware
1. Add before route handlers in `src/index.ts`
2. Use Express middleware pattern
3. Consider ordering in middleware stack

## Monitoring & Observability

### Metrics (Available via external tools)
- Request rate (via traces)
- Error rate (via logs)
- Response time (via traces)
- Token usage (via tenant API)
- Cost per tenant (via tenant API)

### Logs (Morgan)
- HTTP method
- URL
- Status code
- Response time
- Response size
- Timestamp

### Traces (OpenTelemetry)
- Full request lifecycle
- Provider calls
- Span duration
- GenAI attributes
- Error recording

### Cost Tracking (Built-in)
- Per-request cost
- Per-tenant accumulation
- Historical records
- Budget monitoring

## Error Handling

### Error Response Format
```json
{
  "error": {
    "message": "error description"
  }
}
```

### HTTP Status Codes
- 200: Success
- 400: Bad request (validation, policy)
- 500: Internal server error

### Error Sources
1. **Validation Errors:** Zod schema failures
2. **Policy Errors:** Budget/model restrictions
3. **Provider Errors:** Upstream API failures
4. **Schema Errors:** Structured output validation

### Error Propagation
- Errors recorded in OpenTelemetry spans
- Logged via Morgan
- Returned to client with appropriate status

## Best Practices

### Configuration
- Use environment variables for secrets
- Keep routes and policies in config file
- Document all environment variables

### Development
- Use TypeScript strict mode
- Validate all inputs with Zod
- Add OpenTelemetry spans for async operations
- Handle errors gracefully

### Production
- Enable OpenTelemetry for observability
- Monitor tenant budgets
- Set appropriate rate limits
- Use HTTPS in production
- Configure proper TURN servers for WebRTC

### Testing
- Test each provider independently
- Verify policy enforcement
- Test streaming responses
- Load test rate limiting
- Validate cost calculations
