# NOA Server - Architecture Documentation

## Overview

This directory contains comprehensive architecture documentation for the NOA
(Neural Orchestration & Automation) Server, a scalable, multi-provider AI
inference platform.

## Quick Navigation

### Core Architecture

- **[Architecture Overview](./ARCHITECTURE_OVERVIEW.md)** - System goals,
  high-level design, technology stack
- **[Component Architecture](./COMPONENTS.md)** - Detailed component design and
  interactions
- **[Data Architecture](./DATA_ARCHITECTURE.md)** - Data models, storage, and
  flows
- **[API Architecture](./API_ARCHITECTURE.md)** - REST API design and patterns
- **[Security Architecture](./SECURITY_ARCHITECTURE.md)** - Authentication,
  authorization, threat model

### Reference Documentation

- **[Glossary](./GLOSSARY.md)** - Technical terms and acronyms (100+
  definitions)
- **[Architecture Decision Records (ADRs)](./decisions/)** - Key architectural
  decisions

## Architecture Documents

### System Design

| Document                                               | Description                    | Key Topics                                        |
| ------------------------------------------------------ | ------------------------------ | ------------------------------------------------- |
| [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) | High-level system architecture | Goals, requirements, tech stack, principles       |
| [COMPONENTS.md](./COMPONENTS.md)                       | Component architecture         | AI Provider, API Layer, Message Queue, Monitoring |
| [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md)         | Data models and storage        | ER diagrams, schemas, data flows, caching         |

### API & Security

| Document                                               | Description        | Key Topics                                 |
| ------------------------------------------------------ | ------------------ | ------------------------------------------ |
| [API_ARCHITECTURE.md](./API_ARCHITECTURE.md)           | RESTful API design | Endpoints, auth, rate limiting, versioning |
| [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md) | Security layers    | OWASP Top 10, JWT, RBAC, encryption        |

### Decision Records (ADRs)

| ADR                                                       | Title                                 | Status      | Impact                            |
| --------------------------------------------------------- | ------------------------------------- | ----------- | --------------------------------- |
| [ADR-001](./decisions/ADR-001-monorepo-structure.md)      | Monorepo Structure with pnpm          | ✅ Accepted | Code sharing, atomic changes      |
| [ADR-002](./decisions/ADR-002-typescript-strict-mode.md)  | TypeScript Strict Mode                | ✅ Accepted | Type safety, fewer runtime errors |
| [ADR-003](./decisions/ADR-003-circuit-breaker-pattern.md) | Circuit Breaker for Provider Fallback | ✅ Accepted | Fast failure, auto-recovery       |
| [ADR-004](./decisions/ADR-004-caching-strategy.md)        | Multi-Tier Caching Strategy           | ✅ Accepted | 60-75% cost reduction             |
| [ADR-005](./decisions/ADR-005-rate-limiting-algorithm.md) | Token Bucket Rate Limiting            | ✅ Accepted | Burst support, smooth traffic     |

## Architecture at a Glance

### System Context

```
┌─────────────┐         ┌──────────────────┐         ┌────────────┐
│   Clients   │───────▶│   NOA Server     │───────▶│ AI Providers│
│  (Web/API)  │  HTTPS  │  (Express.js)    │   API   │ OpenAI/Claude│
└─────────────┘         └──────────────────┘         └────────────┘
                               │
                               │
                        ┌──────┴──────┐
                        │             │
                   ┌────▼────┐   ┌───▼────┐
                   │PostgreSQL│   │ Redis  │
                   │ (Data)   │   │(Cache) │
                   └──────────┘   └────────┘
```

### Key Metrics

- **Target Throughput**: 1,000+ requests/second
- **API Latency**: <100ms p95 (simple requests)
- **Uptime Target**: 99.9% availability
- **Cache Hit Rate**: 60-80%
- **Security**: OWASP Top 10 compliance

## Technology Stack

### Backend

- Node.js 20.x + TypeScript 5.7 (strict mode)
- Express.js 4.18 (REST API)
- pnpm 9.11 (monorepo)

### AI/ML

- OpenAI SDK, Anthropic SDK
- llama.cpp (local inference)

### Data Layer

- PostgreSQL 14+ (primary)
- Redis 7+ (cache/queue)
- SQLite 3 (local dev)

### DevOps

- Docker (containers)
- Kubernetes (orchestration)
- GitHub Actions (CI/CD)
- Vitest, Playwright (testing)

## Architecture Diagrams

This documentation includes 15+ architecture diagrams using Mermaid:

1. **System Context Diagram** (C4 Level 1) - Overall system boundaries
2. **Container Diagram** (C4 Level 2) - Major containers and dependencies
3. **Component Diagrams** (C4 Level 3) - Internal component structure
4. **Sequence Diagrams** - Request flows and interactions
5. **Entity-Relationship Diagrams** - Data models
6. **Deployment Diagrams** - Infrastructure topology
7. **Security Flow Diagrams** - Authentication and authorization

All diagrams are embedded in the documentation as Mermaid syntax for easy
updates.

## Architectural Principles

### 1. Separation of Concerns

Clear boundaries between API, business logic, and data layers.

### 2. Scalability First

Stateless API design, horizontal scaling, asynchronous processing.

### 3. Resilience & Fault Tolerance

Circuit breakers, retry logic, graceful degradation.

### 4. Security by Design

Input validation, authentication/authorization, audit logging.

### 5. Observability

Metrics (Prometheus), structured logging (Winston), health checks.

### 6. Developer Experience

TypeScript strict mode, comprehensive docs, clear error messages.

## Component Overview

### AI Provider System

- Unified interface for OpenAI, Claude, llama.cpp
- Circuit breaker for automatic failover
- Multi-tier caching (Memory/Redis/DB)
- Model capability discovery

### API Layer

- RESTful API with OpenAPI/Swagger
- JWT + API key authentication
- Token bucket rate limiting
- Request validation (Zod schemas)

### Message Queue

- Async job processing (Redis/RabbitMQ)
- Priority queues (high/medium/low)
- Retry logic with exponential backoff
- Dead letter queue

### Monitoring System

- Prometheus metrics export
- Winston structured logging
- Health checks (liveness/readiness)
- Performance tracking (p50/p95/p99)

## Data Models

### Core Entities

- **Users**: Authentication, roles, permissions
- **API Keys**: Authentication tokens with permissions
- **Providers**: AI provider configurations
- **Models**: AI model registry with capabilities
- **Jobs**: Async task queue
- **Request Logs**: Audit trail and analytics
- **Metrics**: Performance and cost tracking

See [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) for complete ER diagrams and
schemas.

## Security

### Authentication

- JWT Bearer tokens (1h expiry)
- API keys (long-lived)
- OAuth 2.0 client credentials
- Optional MFA (TOTP)

### Authorization

- Role-Based Access Control (RBAC)
- Three roles: admin, user, readonly
- Resource-level permissions

### Protection Layers

1. **Network**: Helmet.js security headers, CORS
2. **Input**: Zod validation, sanitization
3. **Storage**: Parameterized queries, encryption
4. **Output**: JSON encoding, XSS prevention
5. **Audit**: Structured logs with PII masking

See [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md) for complete threat
model.

## Performance & Scalability

### Caching Strategy

- **L1 (Memory)**: 5min TTL, ~5ms latency
- **L2 (Redis)**: 1h TTL, ~10ms latency
- **L3 (Database)**: 30d TTL, ~50ms latency
- **Target Hit Rate**: 70-80%

### Rate Limiting

- Token bucket algorithm
- Tier-based limits (free/pro/enterprise)
- Burst support up to bucket capacity
- Distributed state (Redis)

### Scaling

- Horizontal: Stateless API, multiple instances
- Vertical: Connection pooling, async processing
- Auto-scaling: Kubernetes HPA on CPU/memory

## Deployment

### Environments

- **Development**: Local (SQLite, mock providers)
- **Staging**: Docker Compose (PostgreSQL, Redis)
- **Production**: Kubernetes (3+ replicas, HA)

### Infrastructure

- **Containers**: Docker multi-stage builds
- **Orchestration**: Kubernetes 1.27+
- **Load Balancing**: Nginx/Traefik
- **Secrets**: Kubernetes Secrets, env variables

## Documentation Standards

### File Organization

```
docs/architecture/
├── README.md                    # This file
├── ARCHITECTURE_OVERVIEW.md     # High-level design
├── COMPONENTS.md                # Component details
├── DATA_ARCHITECTURE.md         # Data models
├── API_ARCHITECTURE.md          # API design
├── SECURITY_ARCHITECTURE.md     # Security layers
├── GLOSSARY.md                  # Terms & acronyms
├── decisions/                   # ADRs
│   ├── README.md
│   ├── ADR-001-*.md
│   └── ...
├── diagrams/                    # Standalone diagrams
└── api-reference/               # API specs
```

### Diagram Standards

- **Format**: Mermaid (embedded in Markdown)
- **Levels**: C4 model (Context → Container → Component → Code)
- **Style**: Consistent colors and naming
- **Updates**: Keep diagrams in sync with code

### ADR Standards

- **Numbering**: Sequential (ADR-001, ADR-002, ...)
- **Status**: Proposed → Accepted → [Deprecated/Superseded]
- **Format**: Context, Decision, Consequences, Alternatives
- **Review**: Required before acceptance

## Contributing

### Updating Architecture Docs

1. **Small Changes**: Direct edit with PR
2. **Large Changes**: Create ADR first
3. **New Components**: Update component diagrams
4. **Breaking Changes**: Require ADR and review

### Review Checklist

- [ ] Diagrams updated (if applicable)
- [ ] ADR created (for significant changes)
- [ ] Glossary updated (new terms)
- [ ] Links verified (no broken references)
- [ ] Code examples tested
- [ ] Spelling and grammar checked

## Related Documentation

### Code Documentation

- [Component READMEs](/packages/*/README.md) - Per-package documentation
- [API Documentation](/docs/api/) - OpenAPI specifications
- [Development Guide](/docs/DEVELOPMENT.md) - Setup and workflows

### Operations

- [Deployment Guide](/docs/DEPLOYMENT.md) - Deployment procedures
- [Monitoring Guide](/docs/MONITORING.md) - Observability setup
- [Runbooks](/docs/runbooks/) - Operational procedures

## Versioning

This architecture documentation follows semantic versioning:

- **Major**: Breaking architectural changes
- **Minor**: New components or features
- **Patch**: Clarifications, fixes

**Current Version**: 1.0.0 (December 2024)

## Feedback

Questions or suggestions about the architecture?

- **GitHub Issues**:
  [noa-server/issues](https://github.com/your-org/noa-server/issues)
- **Architecture Reviews**: Monthly review meetings
- **Documentation**: PRs welcome for improvements

---

**Last Updated**: October 23, 2025 **Maintainers**: NOA Server Architecture Team
