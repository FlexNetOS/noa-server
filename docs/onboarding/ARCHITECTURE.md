# Architecture Overview

This document provides a comprehensive overview of the NOA Server architecture,
including system design, component interactions, and key design decisions.

## Table of Contents

- [System Architecture](#system-architecture)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)
- [Design Principles](#design-principles)
- [Architecture Diagrams](#architecture-diagrams)

## System Architecture

NOA Server is built as a **monorepo** using a **microservices-inspired modular
architecture**. While all packages are in a single repository, they are designed
to be independently deployable and loosely coupled.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Applications                      │
│  (Web Apps, Mobile Apps, CLI Tools, Third-party Services)       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway / Load Balancer                 │
│                      (NGINX, AWS ALB, Cloudflare)               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Inference API Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Authentication│  │  Validation  │  │Rate Limiting │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────────────────────────────────────────┐           │
│  │           OpenAPI/Swagger Documentation          │           │
│  └──────────────────────────────────────────────────┘           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI Provider System                          │
│  ┌────────────────────────────────────────────────────┐         │
│  │              Model Registry & Router               │         │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │         │
│  │  │ OpenAI       │  │ Claude       │  │llama.cpp│ │         │
│  │  │ (GPT-4, etc) │  │ (Sonnet, etc)│  │ (Local) │ │         │
│  │  └──────────────┘  └──────────────┘  └─────────┘ │         │
│  └────────────────────────────────────────────────────┘         │
│  ┌────────────────────────────────────────────────────┐         │
│  │            Fallback & Health Monitoring            │         │
│  │         (Automatic failover, health checks)        │         │
│  └────────────────────────────────────────────────────┘         │
│  ┌────────────────────────────────────────────────────┐         │
│  │              Caching System                        │         │
│  │  Memory Cache → Redis → Database (3-tier)         │         │
│  └────────────────────────────────────────────────────┘         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Message Queue System                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │RabbitMQ  │  │  Kafka   │  │  Redis   │  │   SQS    │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│  ┌────────────────────────────────────────────────────┐         │
│  │         Job Processing & Async Operations          │         │
│  │    (Batch jobs, webhooks, notifications)           │         │
│  └────────────────────────────────────────────────────┘         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Monitoring & Observability                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Metrics    │  │     Logs     │  │    Traces    │          │
│  │ (Prometheus) │  │  (Winston)   │  │   (Sentry)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌────────────────────────────────────────────────────┐         │
│  │            Real-time Dashboard                     │         │
│  │       (Health checks, performance metrics)         │         │
│  └────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. AI Inference API (`packages/ai-inference-api`)

**Purpose**: REST API for AI model inference and management

**Key Features**:

- RESTful endpoints for chat completion, embeddings, and model info
- OpenAPI/Swagger documentation
- Request validation with Zod schemas
- Authentication and authorization
- Rate limiting per API key
- CORS and security headers

**Main Files**:

- `src/index.ts` - Express server setup
- `src/routes/` - API route handlers
- `src/middleware/` - Authentication, validation, rate limiting
- `src/config/swagger.ts` - OpenAPI specification

**Endpoints**:

```
POST   /api/v1/inference/chat        - Chat completion
POST   /api/v1/inference/embeddings  - Generate embeddings
GET    /api/v1/models                - List available models
GET    /api/v1/models/:id            - Get model details
GET    /health                       - Health check
GET    /api-docs                     - Swagger UI
```

### 2. AI Provider System (`packages/ai-provider`)

**Purpose**: Unified interface for multiple AI providers with intelligent
routing

**Key Features**:

- **Model Registry**: Central catalog of all available models
- **Provider Adapters**: Unified interface for OpenAI, Claude, llama.cpp
- **Fallback System**: Automatic failover when providers fail
- **Health Monitoring**: Real-time provider health checks
- **Caching**: Multi-tier caching for responses
- **Rate Limiting**: Provider-specific rate limits

**Architecture**:

```typescript
// Simplified provider architecture
interface AIProvider {
  chat(request: ChatRequest): Promise<ChatResponse>;
  embeddings(request: EmbeddingsRequest): Promise<EmbeddingsResponse>;
  healthCheck(): Promise<HealthStatus>;
}

class ModelRegistry {
  registerModel(model: ModelConfig): void;
  getModel(modelId: string): Model | null;
  listModels(filters?: ModelFilter): Model[];
  selectBestModel(requirements: ModelRequirements): Model;
}

class FallbackManager {
  execute<T>(providers: Provider[], operation: Operation): Promise<T>;
  // Automatically tries providers in order until success
}
```

**Main Files**:

- `src/index.ts` - Main export and provider factory
- `src/managers/model-registry.ts` - Model catalog and selection
- `src/managers/fallback-manager.ts` - Failover logic
- `src/managers/cache-manager.ts` - Caching system
- `src/providers/openai.ts` - OpenAI adapter
- `src/providers/claude.ts` - Anthropic Claude adapter
- `src/providers/llamacpp.ts` - llama.cpp adapter

**Provider Selection Logic**:

1. Check model availability and health
2. Consider rate limits and quotas
3. Evaluate cost and performance
4. Select optimal provider or fallback chain

### 3. Message Queue System (`packages/message-queue`)

**Purpose**: Asynchronous job processing and event-driven communication

**Key Features**:

- **Multiple Backends**: RabbitMQ, Kafka, Redis, AWS SQS
- **Job Scheduling**: Cron jobs and delayed execution
- **Retry Logic**: Automatic retry with exponential backoff
- **Dead Letter Queues**: Failed job handling
- **Priority Queues**: Job prioritization
- **Webhooks**: HTTP callback notifications

**Use Cases**:

- Batch AI inference jobs
- Email notifications
- Webhook delivery
- Data processing pipelines
- Scheduled tasks

**Main Files**:

- `src/queue-manager.ts` - Queue abstraction
- `src/adapters/` - Backend-specific implementations
- `src/jobs/` - Job definitions
- `src/server.ts` - Worker server

**Example Usage**:

```typescript
// Enqueue a job
await queueManager.enqueue('ai-inference', {
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
  callback: 'https://app.example.com/webhook',
});

// Process jobs
queueManager.process('ai-inference', async (job) => {
  const result = await aiProvider.chat(job.data);
  await sendWebhook(job.data.callback, result);
});
```

### 4. Monitoring & Dashboard (`packages/monitoring`)

**Purpose**: Real-time monitoring, health checks, and observability

**Key Features**:

- **Health Checks**: Kubernetes-compatible liveness/readiness probes
- **Metrics Collection**: Request counts, latencies, error rates
- **Error Tracking**: Sentry integration for error reporting
- **Performance Monitoring**: API response times, throughput
- **Dashboard UI**: Real-time visualization of metrics
- **Alerting**: Configurable alerts for anomalies

**Main Files**:

- `src/health-check.ts` - Health check endpoints
- `src/error-tracking.ts` - Sentry integration
- `src/metrics-collector.ts` - Metrics aggregation
- `src/dashboard/` - Dashboard UI components

**Health Check Endpoints**:

```
GET /health/live     - Liveness probe (is service running?)
GET /health/ready    - Readiness probe (can service handle requests?)
GET /health/startup  - Startup probe (has service fully started?)
```

### 5. llama.cpp Integration (`packages/llama.cpp`)

**Purpose**: Local AI model inference with CUDA acceleration

**Key Features**:

- **Local Inference**: Run models without external API calls
- **CUDA Support**: GPU acceleration with NVIDIA GPUs
- **Model Management**: Download and manage GGUF model files
- **MCP Server**: Model Context Protocol server for Claude Code
- **HTTP Bridge**: REST API for llama.cpp inference

**Main Files**:

- `shims/http_bridge.py` - HTTP server for llama.cpp
- `models/` - GGUF model files directory
- Integration with AI Provider System

## Data Flow

### Synchronous Request Flow (Chat Completion)

```
1. Client → API Gateway → AI Inference API
   ↓
2. API Inference API:
   - Authenticate request (JWT/API key)
   - Validate input (Zod schema)
   - Check rate limits
   ↓
3. AI Provider System:
   - Check cache (memory → Redis → DB)
   - If cached: return immediately
   - If not cached: continue
   ↓
4. Model Registry:
   - Select optimal model/provider
   - Build fallback chain
   ↓
5. Provider Adapter (OpenAI/Claude/llama.cpp):
   - Execute API call
   - If fails: try fallback provider
   ↓
6. Response Processing:
   - Cache response
   - Log metrics
   - Track usage
   ↓
7. Return to Client:
   - Format response
   - Add metadata (model used, cache hit, etc.)
```

### Asynchronous Job Flow

```
1. Client → Enqueue Job → Message Queue
   ↓
2. Worker picks up job
   ↓
3. Process job (same flow as synchronous)
   ↓
4. Store result
   ↓
5. Send webhook notification to client
   ↓
6. Job completed / moved to dead letter queue if failed
```

### Monitoring Data Flow

```
Application → Metrics Collector → Time-series DB → Dashboard
                                ↓
                          Alerting System
                                ↓
                          Slack/Email/PagerDuty
```

## Technology Stack

### Backend

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5+
- **Framework**: Express.js
- **Validation**: Zod
- **Testing**: Vitest, Playwright
- **Linting**: ESLint + Prettier

### AI Providers

- **OpenAI SDK**: `openai` package
- **Anthropic Claude**: `@anthropic-ai/sdk` package
- **llama.cpp**: `node-llama-cpp` package + Python HTTP bridge

### Data Layer

- **Cache**: Redis (ioredis)
- **Database**: PostgreSQL (pg)
- **ORM**: Prisma (if applicable)

### Message Queue

- **RabbitMQ**: `amqplib`
- **Kafka**: `kafkajs`
- **Redis Queue**: `bull` or native Redis
- **AWS SQS**: `aws-sdk`

### Monitoring

- **Error Tracking**: Sentry
- **Logging**: Winston
- **Metrics**: Prometheus (planned)
- **Tracing**: OpenTelemetry (planned)

### Infrastructure

- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Cloud**: AWS, GCP, Azure (multi-cloud)

### Development Tools

- **Monorepo**: pnpm workspaces
- **Build**: TypeScript compiler
- **Package Manager**: pnpm
- **MCP**: Claude Flow, Flow Nexus
- **Version Control**: Git + GitHub

## Design Principles

### 1. Modularity

- Each package is independently testable and deployable
- Clear interfaces between components
- Minimal coupling, high cohesion

### 2. Reliability

- Automatic failover for AI providers
- Health checks and graceful degradation
- Retry logic with exponential backoff
- Circuit breakers for external services

### 3. Performance

- Multi-tier caching (memory → Redis → DB)
- Connection pooling
- Async processing for long-running tasks
- Efficient resource utilization

### 4. Scalability

- Horizontal scaling of API servers
- Queue-based async processing
- Stateless service design
- Database sharding (planned)

### 5. Observability

- Comprehensive logging
- Metrics for all critical paths
- Distributed tracing
- Real-time dashboards

### 6. Security

- Authentication and authorization
- Rate limiting per API key
- Input validation
- Secrets management
- HTTPS/TLS encryption

### 7. Developer Experience

- Clear API documentation
- Type safety with TypeScript
- Comprehensive test coverage
- Easy local development setup

## Architecture Diagrams

### Request Processing Sequence

```
┌──────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│Client│     │   API   │     │   AI     │     │ Provider │
│      │     │  Layer  │     │ Provider │     │(OpenAI)  │
└──┬───┘     └────┬────┘     └────┬─────┘     └────┬─────┘
   │              │               │                │
   │ POST /chat   │               │                │
   ├─────────────>│               │                │
   │              │ authenticate  │                │
   │              ├──────────┐    │                │
   │              │          │    │                │
   │              │<─────────┘    │                │
   │              │               │                │
   │              │ check cache   │                │
   │              ├──────────────>│                │
   │              │               │ query Redis    │
   │              │               ├────────┐       │
   │              │               │        │       │
   │              │  cache miss   │<───────┘       │
   │              │<──────────────┤                │
   │              │               │                │
   │              │               │  API call      │
   │              │               ├───────────────>│
   │              │               │                │
   │              │               │   response     │
   │              │               │<───────────────┤
   │              │               │                │
   │              │               │ cache result   │
   │              │               ├────────┐       │
   │              │               │        │       │
   │              │               │<───────┘       │
   │              │  response     │                │
   │              │<──────────────┤                │
   │   response   │               │                │
   │<─────────────┤               │                │
   │              │               │                │
```

### Fallback Chain

```
Primary: OpenAI GPT-4
    ↓ (on failure)
Fallback 1: Claude Sonnet
    ↓ (on failure)
Fallback 2: OpenAI GPT-3.5-turbo
    ↓ (on failure)
Fallback 3: llama.cpp local model
    ↓ (on failure)
Error: All providers failed
```

### Caching Strategy

```
Request → Memory Cache (in-process)
              ↓ miss
          Redis Cache (shared)
              ↓ miss
          Database (persistent)
              ↓ miss
          Fetch from Provider
              ↓
          Cache in all layers
```

## Next Steps

Now that you understand the architecture:

1. **[Codebase Tour](CODEBASE_TOUR.md)** - Explore the code in detail
2. **[Development Workflow](WORKFLOW.md)** - Learn our Git workflow
3. **[API Development Guide](API_DEVELOPMENT.md)** - Build your first endpoint

## Further Reading

- [System Design Document](../architecture/SYSTEM_DESIGN.md)
- [Component Architecture](../architecture/COMPONENT_ARCHITECTURE.md)
- [Architecture Decision Records](../architecture/adr/)
- [Performance Optimization](../performance/README.md)

---

**Next**: [Codebase Tour →](CODEBASE_TOUR.md)
