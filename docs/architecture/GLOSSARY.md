# NOA Server - Glossary

## Technical Terms and Acronyms

### A

**ADR (Architecture Decision Record)**: Document capturing important
architectural decisions, their context, and rationale.

**AI Provider**: External service (OpenAI, Anthropic) or local system
(llama.cpp) that provides AI model inference capabilities.

**API Gateway**: Entry point for all client requests, handles routing,
authentication, and rate limiting.

**API Key**: Secret token used for authenticating API requests without user
session.

**Async Processing**: Non-blocking execution of long-running tasks using job
queues and workers.

**Audit Log**: Immutable record of security-relevant events and user actions.

### B

**BaseProvider**: Abstract class defining common interface for all AI provider
implementations.

**Bcrypt**: Password hashing algorithm using adaptive hash function based on
Blowfish cipher.

**Bearer Token**: Authentication token transmitted in HTTP Authorization header.

**Bull/BullMQ**: Redis-based job queue library for Node.js.

**Byzantine Fault Tolerance**: System's ability to reach consensus despite
malicious actors.

### C

**C4 Model**: Context, Containers, Components, Code - hierarchical software
architecture diagrams.

**Cache Hit Rate**: Percentage of requests served from cache vs. database.

**Circuit Breaker**: Design pattern that prevents cascading failures by failing
fast when errors exceed threshold.

**CORS (Cross-Origin Resource Sharing)**: HTTP mechanism allowing web
applications from one origin to access resources from different origin.

**CRUD**: Create, Read, Update, Delete - basic operations on persistent storage.

**CSRF (Cross-Site Request Forgery)**: Attack forcing authenticated users to
perform unwanted actions.

### D

**Dead Letter Queue (DLQ)**: Queue for messages that cannot be processed after
retry attempts.

**Dependency Injection**: Design pattern providing dependencies from external
source rather than hard-coding.

**DDoS (Distributed Denial of Service)**: Attack overwhelming system with
traffic from multiple sources.

**Docker**: Platform for developing, shipping, and running applications in
containers.

### E

**Exponential Backoff**: Retry strategy with increasing delay between attempts.

**Express.js**: Minimal web framework for Node.js.

### F

**Fallback Provider**: Alternative AI provider used when primary provider fails.

**Fault Tolerance**: System's ability to continue operating despite component
failures.

### G

**GGUF**: File format for llama.cpp quantized models.

**Graceful Degradation**: System design continuing with reduced functionality
when components fail.

**Grafana**: Open-source analytics and monitoring platform.

### H

**Helmet.js**: Express middleware for securing HTTP headers.

**Horizontal Scaling**: Adding more machines/instances to handle increased load.

**HPA (Horizontal Pod Autoscaler)**: Kubernetes automatic scaling based on
metrics.

**HTTPS**: HTTP Secure - encrypted HTTP using TLS/SSL.

### I

**Idempotent**: Operation producing same result regardless of how many times
executed.

**Inference**: Process of using trained AI model to make predictions/generate
text.

### J

**Job Queue**: Asynchronous task processing system with priority and retry
logic.

**JSON Web Token (JWT)**: Compact URL-safe token for authentication claims.

### K

**Kubernetes (K8s)**: Container orchestration platform for automating
deployment, scaling, and management.

### L

**Latency**: Time between request initiation and response completion.

**llama.cpp**: C++ implementation of Meta's LLaMA model for efficient inference.

**Load Balancer**: Distributes incoming network traffic across multiple servers.

**LRU (Least Recently Used)**: Cache eviction policy removing least recently
accessed items.

### M

**MCP (Model Context Protocol)**: Protocol for unified AI provider interface.

**Metrics**: Quantitative measurements of system behavior (latency, throughput,
errors).

**Middleware**: Software components processing requests before reaching route
handlers.

**Monorepo**: Single repository containing multiple related packages/projects.

**Multi-Tier Caching**: Layered caching strategy (memory, Redis, database).

### N

**NOA (Neural Orchestration & Automation)**: System name for this AI inference
platform.

**Node.js**: JavaScript runtime built on Chrome's V8 engine.

### O

**OAuth 2.0**: Industry-standard authorization protocol.

**Observability**: Ability to measure internal states by examining outputs
(metrics, logs, traces).

**OpenAPI**: Specification for describing RESTful APIs.

**OWASP**: Open Web Application Security Project.

### P

**p50/p95/p99**: Latency percentiles (50th, 95th, 99th percentile).

**Pagination**: Dividing large result sets into smaller chunks/pages.

**PII (Personally Identifiable Information)**: Data that can identify specific
individuals.

**pnpm**: Fast, disk-efficient package manager for Node.js.

**PostgreSQL**: Open-source relational database.

**Prometheus**: Open-source monitoring and alerting toolkit.

**Provider Factory**: Factory pattern for creating AI provider instances.

### Q

**Quantization**: Reducing model precision (e.g., float32 to int8) for faster
inference.

**Quota**: Limit on resource usage (requests per hour, tokens per day).

### R

**Rate Limiting**: Controlling frequency of actions within time window.

**RBAC (Role-Based Access Control)**: Authorization model based on user roles.

**Redis**: In-memory data store used for caching and job queues.

**Resilience**: System's ability to recover from failures.

**REST (Representational State Transfer)**: Architectural style for web APIs.

**RTO (Recovery Time Objective)**: Target time to restore service after
incident.

**RPO (Recovery Point Objective)**: Maximum acceptable data loss.

### S

**SAST (Static Application Security Testing)**: Analyzing source code for
vulnerabilities.

**Schema Validation**: Verifying data structure matches expected format (using
Zod).

**Secrets Management**: Secure storage and access to sensitive configuration.

**Serverless**: Cloud execution model where cloud provider manages
infrastructure.

**Sharding**: Distributing data across multiple databases.

**SQLite**: Lightweight embedded relational database.

**SSE (Server-Sent Events)**: Server push technology over HTTP.

**Stateless**: Architecture where each request contains all information needed.

**Swagger**: Tools for OpenAPI specification (now OpenAPI spec itself).

### T

**TDD (Test-Driven Development)**: Writing tests before implementation.

**Throughput**: Number of operations processed per unit time.

**TLS (Transport Layer Security)**: Cryptographic protocol for secure
communication.

**Token Bucket**: Rate limiting algorithm using tokens refilled at fixed rate.

**TypeScript**: Typed superset of JavaScript.

**TTL (Time To Live)**: Duration data remains valid in cache.

### U

**UUID (Universally Unique Identifier)**: 128-bit identifier (e.g.,
550e8400-e29b-41d4-a716-446655440000).

### V

**Vertical Scaling**: Adding more resources (CPU, RAM) to existing machine.

**Vitest**: Fast unit testing framework for Vite projects.

### W

**WebSocket**: Full-duplex communication protocol over single TCP connection.

**Winston**: Logging library for Node.js.

**Worker Pool**: Set of worker processes handling background jobs.

### X

**XSS (Cross-Site Scripting)**: Injection attack inserting malicious scripts
into web pages.

### Z

**Zod**: TypeScript-first schema validation library.

**Zero Trust**: Security model requiring strict verification for every request.

## Metrics and Units

- **Requests Per Second (RPS)**: Number of HTTP requests handled per second
- **Tokens**: Units of text processed by AI models (roughly 0.75 words)
- **Latency (ms)**: Response time in milliseconds
- **Throughput (MB/s)**: Data transfer rate in megabytes per second
- **Cost (USD)**: Monetary cost in US dollars
- **Uptime (%)**: Percentage of time system is operational

## Status Codes

| Code | Name                  | Description                       |
| ---- | --------------------- | --------------------------------- |
| 200  | OK                    | Successful request                |
| 201  | Created               | Resource successfully created     |
| 400  | Bad Request           | Invalid request syntax            |
| 401  | Unauthorized          | Missing or invalid authentication |
| 403  | Forbidden             | Insufficient permissions          |
| 404  | Not Found             | Resource doesn't exist            |
| 429  | Too Many Requests     | Rate limit exceeded               |
| 500  | Internal Server Error | Server-side error                 |
| 502  | Bad Gateway           | Invalid upstream response         |
| 503  | Service Unavailable   | Temporary unavailability          |

## File Extensions

- **.ts**: TypeScript source file
- **.js**: JavaScript source file
- **.json**: JSON configuration file
- **.yaml/.yml**: YAML configuration file
- **.md**: Markdown documentation
- **.env**: Environment variables file
- **.gguf**: llama.cpp model file
- **.pem**: Privacy-Enhanced Mail (certificate/key)

## Environment Variables

- **NODE_ENV**: Runtime environment (development, production, test)
- **PORT**: HTTP server port
- **DATABASE_URL**: PostgreSQL connection string
- **REDIS_URL**: Redis connection string
- **JWT_SECRET**: Secret key for signing JWT tokens
- **OPENAI_API_KEY**: OpenAI API authentication key
- **ANTHROPIC_API_KEY**: Anthropic API authentication key
- **LOG_LEVEL**: Logging verbosity (debug, info, warn, error)

## Related Documentation

- [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)
- [Component Architecture](./COMPONENTS.md)
- [Data Architecture](./DATA_ARCHITECTURE.md)
- [API Architecture](./API_ARCHITECTURE.md)
- [Security Architecture](./SECURITY_ARCHITECTURE.md)
