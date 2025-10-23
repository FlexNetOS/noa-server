# Phase 2 Architecture - Visual Diagrams

**Companion Document to:** phase2-architecture-blueprint.md
**Version:** 1.0
**Date:** 2025-10-22

---

## 1. Current vs. Target Architecture

### 1.1 Current State (Fragmented)

```
┌─────────────────────────────────────────────────────────────────┐
│                      CURRENT FRAGMENTED STATE                    │
└─────────────────────────────────────────────────────────────────┘

packages/                               claude-flow/src/
├── agent-swarm/                       ├── swarm/
│   └── src/ (duplicate logic)         │   └── (duplicate logic)
├── workflow-orchestration/            ├── workflows/
│   └── src/ (duplicate logic)         │   └── (duplicate logic)
├── monitoring/                        ├── monitoring/
│   └── src/ (duplicate logic)         │   └── (duplicate logic)
├── cache-manager/                     ├── config/
├── connection-pool/                   │   └── (duplicate config)
├── database-optimizer/                src/automation/
├── database-sharding/                 └── (scattered utilities)
├── rate-limiter/
├── message-queue/                     Individual package configs:
├── auth-service/                      - 20+ different config systems
├── audit-logger/                      - 15+ logging implementations
├── feature-flags/                     - 12+ validation functions
├── llama.cpp/                         - 10+ string utilities
│   ├── config/ (isolated)
│   └── src/ (C++/Python)
└── ... (29 total packages)

❌ PROBLEMS:
   - Duplicate implementations (swarm, workflow, monitoring)
   - No clear boundaries (agent logic scattered)
   - Inconsistent patterns (20+ config systems)
   - High complexity (3,831 TypeScript files)
   - Difficult maintenance (unclear ownership)
```

### 1.2 Target State (Unified)

```
┌─────────────────────────────────────────────────────────────────┐
│                      UNIFIED AGENTICOS PLATFORM                  │
└─────────────────────────────────────────────────────────────────┘

packages/@agenticos/
│
├── core/                              ← Foundation Layer (Layer 1)
│   ├── common/                           Single source of truth
│   │   ├── utils/                        for shared logic
│   │   ├── helpers/
│   │   └── constants/
│   ├── config/                           Unified config system
│   │   ├── loaders/
│   │   ├── schemas/
│   │   └── providers/
│   ├── types/                            Platform-wide types
│   │   └── interfaces/
│   └── logger/                           Centralized logging
│       ├── transports/
│       └── formatters/
│
├── orchestration/                     ← Platform Services (Layer 2)
│   ├── agent-engine/                     Single agent engine
│   │   ├── core/                         (unified agent-swarm +
│   │   ├── coordination/                  claude-flow/swarm)
│   │   ├── workflows/                    Single workflow engine
│   │   └── integrations/                 (unified orchestration)
│   ├── neural/                           Neural processing
│   │   ├── llama/                        (llama.cpp wrapper)
│   │   ├── providers/
│   │   └── queen/
│   └── memory/                           Shared memory layer
│       ├── state-manager.ts
│       └── event-store.ts
│
├── infrastructure/                    ← Integration Services (Layer 3)
│   ├── api-gateway/                      Single API entry point
│   │   ├── gateway/
│   │   ├── security/
│   │   ├── messaging/
│   │   └── protocols/
│   ├── database/                         Unified data layer
│   │   ├── connectors/
│   │   ├── orm/
│   │   ├── pooling/
│   │   └── cache/
│   └── monitoring/                       Centralized observability
│       ├── metrics/
│       ├── logging/
│       └── tracing/
│
└── services/                          ← Domain Services
    ├── auth/                             Authentication
    ├── feature-flags/                    Feature management
    ├── audit/                            Audit logging
    └── compliance/                       GDPR compliance

packages/@agenticos-ui/                ← Application Layer (Layer 4)
├── dashboard/                            Main UI
├── admin/                                Admin interface
└── components/                           Shared components

✅ BENEFITS:
   - Single implementation per capability
   - Clear layer boundaries
   - Consistent patterns across platform
   - Reduced complexity (~2,300 files, 40% reduction)
   - Easy maintenance (clear ownership)
```

---

## 2. Layer Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                         LAYER 4: APPLICATION                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  UI Dashboard   │  │  Admin Panel    │  │   CLI Tools     │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                     │            │
└───────────┼────────────────────┼─────────────────────┼────────────┘
            │                    │                     │
            └────────────────────┼─────────────────────┘
                                 │
┌───────────────────────────────▼───────────────────────────────────┐
│                      LAYER 3: INTEGRATION SERVICES                 │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                      API Gateway                            │  │
│  │  - REST endpoints     - GraphQL        - MCP protocol      │  │
│  │  - Authentication     - Rate limiting  - CORS              │  │
│  └───────────┬─────────────────────────────────┬───────────────┘  │
│              │                                 │                   │
│  ┌───────────▼──────────┐         ┌───────────▼──────────┐       │
│  │   Message Queue      │         │     Database         │       │
│  │  - Kafka/RabbitMQ    │         │  - PostgreSQL        │       │
│  │  - Redis Queue       │         │  - Redis Cache       │       │
│  └──────────────────────┘         │  - Connection Pool   │       │
│                                    └──────────────────────┘       │
└───────────────────────────────────────────────────────────────────┘
                                 │
                                 │
┌───────────────────────────────▼───────────────────────────────────┐
│                    LAYER 2: PLATFORM SERVICES                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │  Agent Engine    │  │ Workflow Engine  │  │ Neural Processing│ │
│  │  - Lifecycle     │  │ - Task scheduler │  │ - llama.cpp     │ │
│  │  - Swarm coord   │  │ - DAG execution  │  │ - Model selector│ │
│  │  - Communication │  │ - State machines │  │ - Queen coord   │ │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘ │
│                                 │                                  │
│  ┌──────────────────────────────▼────────────────────────────┐   │
│  │              Shared Memory & State Management             │   │
│  │  - Event store    - State manager    - Cache layer       │   │
│  └───────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
                                 │
                                 │
┌───────────────────────────────▼───────────────────────────────────┐
│                       LAYER 1: FOUNDATION                          │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Core Common Utilities                      │ │
│  │  - File I/O       - String utils    - Date/time helpers     │ │
│  │  - Validation     - Crypto          - Error handling        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                  Configuration Management                     │ │
│  │  - YAML/JSON loaders   - Env interpolation   - Validation   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                  Platform-wide Types & Logger                 │ │
│  │  - Interfaces   - Types   - Logger   - Constants            │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘

DATA FLOW:
  User Request → API Gateway → Platform Services → Foundation → Database
  Events ← Event Bus ← Platform Services ← Business Logic
```

---

## 3. Module Consolidation Map

### 3.1 Agent Orchestration Consolidation

```
BEFORE:                                  AFTER:
┌──────────────────────┐                ┌────────────────────────────┐
│ packages/            │                │ @agenticos/               │
│ ├── agent-swarm/     │                │ orchestration-agent-engine/│
│ │   └── src/         │  ──────┐       │ ├── core/                 │
│ │       ├── swarm.ts │        │       │ │   ├── agent.ts          │
│ │       └── agent.ts │        │       │ │   ├── lifecycle.ts      │
│ ├── workflow-orch/   │        ├─────► │ │   └── registry.ts       │
│ │   └── src/         │        │       │ ├── coordination/         │
│ │       └── engine.ts│        │       │ │   ├── swarm-manager.ts  │
│ claude-flow/src/     │        │       │ │   └── topology.ts       │
│ ├── swarm/           │  ──────┘       │ ├── workflows/            │
│ │   └── manager.ts   │                │ │   ├── workflow-engine.ts│
│ ├── agents/          │                │ │   └── task-graph.ts     │
│ │   └── base.ts      │                │ └── integrations/         │
│ └── workflows/       │                │     ├── claude-flow.ts    │
│     └── executor.ts  │                │     └── mcp.ts            │
└──────────────────────┘                └────────────────────────────┘

REDUCTION: 4 implementations → 1 unified engine
```

### 3.2 Configuration Consolidation

```
BEFORE:                                  AFTER:
┌──────────────────────┐                ┌────────────────────────────┐
│ Multiple configs:    │                │ @agenticos/core-config/    │
│ ├── /config/         │                │ ├── loaders/               │
│ ├── packages/llama/  │  ──────┐       │ │   ├── yaml-loader.ts     │
│ │   └── config/      │        │       │ │   ├── env-loader.ts      │
│ ├── packages/auth/   │        ├─────► │ │   └── json-loader.ts     │
│ │   └── config/      │        │       │ ├── schemas/               │
│ ├── claude-flow/     │        │       │ │   ├── base-schema.ts     │
│ │   └── src/config/  │        │       │ │   └── validation.ts      │
│ └── ... (20+ more)   │  ──────┘       │ └── providers/             │
│                      │                │     └── config-provider.ts │
└──────────────────────┘                └────────────────────────────┘

REDUCTION: 20+ config systems → 1 unified provider
```

### 3.3 Data Layer Consolidation

```
BEFORE:                                  AFTER:
┌──────────────────────┐                ┌────────────────────────────┐
│ packages/            │                │ @agenticos/               │
│ ├── database-opt/    │                │ infrastructure-database/   │
│ │   └── optimizer.ts │  ──────┐       │ ├── connectors/            │
│ ├── database-shard/  │        │       │ │   ├── postgres.ts        │
│ │   └── sharding.ts  │        │       │ │   ├── mongodb.ts         │
│ ├── connection-pool/ │        ├─────► │ │   └── redis.ts           │
│ │   └── pool.ts      │        │       │ ├── orm/                   │
│ ├── cache-manager/   │        │       │ │   └── repository.ts      │
│ │   └── cache.ts     │        │       │ ├── pooling/               │
│ └── (individual ORMs)│  ──────┘       │ │   └── pool-manager.ts    │
│                      │                │ ├── optimization/          │
│                      │                │ │   ├── query-optimizer.ts │
│                      │                │ │   └── sharding.ts        │
│                      │                │ └── cache/                 │
│                      │                │     └── cache-provider.ts  │
└──────────────────────┘                └────────────────────────────┘

REDUCTION: 5+ packages → 1 unified data layer
```

---

## 4. Service Communication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                             │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │       API Gateway             │
         │  - Authentication             │
         │  - Rate limiting              │
         │  - Request validation         │
         └───────────┬───────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐  ┌────────┐  ┌──────────┐
   │  REST   │  │GraphQL │  │   MCP    │
   │  API    │  │ Server │  │ Protocol │
   └────┬────┘  └───┬────┘  └────┬─────┘
        │           │            │
        └───────────┼────────────┘
                    │
         ┌──────────▼──────────┐
         │    Service Router   │
         │  - Route to service │
         │  - Load balancing   │
         └──────────┬──────────┘
                    │
    ┌───────────────┼────────────────┐
    │               │                │
    ▼               ▼                ▼
┌──────────┐  ┌───────────┐  ┌─────────────┐
│  Agent   │  │ Workflow  │  │   Neural    │
│  Engine  │  │  Engine   │  │ Processing  │
└────┬─────┘  └─────┬─────┘  └──────┬──────┘
     │              │                │
     └──────────────┼────────────────┘
                    │
         ┌──────────▼──────────┐
         │   Event Bus         │
         │  - Async events     │
         │  - Pub/Sub          │
         └──────────┬──────────┘
                    │
    ┌───────────────┼────────────────┐
    │               │                │
    ▼               ▼                ▼
┌──────────┐  ┌───────────┐  ┌─────────────┐
│ Database │  │  Message  │  │    Cache    │
│  Layer   │  │   Queue   │  │    Layer    │
└──────────┘  └───────────┘  └─────────────┘

COMMUNICATION TYPES:
  Synchronous:  ──────►  (gRPC, HTTP/2)
  Asynchronous: - - - ►  (Message Queue)
  Event-driven: ═════►  (Event Bus)
```

---

## 5. Migration Roadmap Timeline

```
WEEK →  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21
        ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤

Phase 2.1: Foundation Setup
[████████]   │
  - Core common
  - Core config
  - Core types

Phase 2.2: Data Layer
        [████████]   │
          - Database unification
          - Cache consolidation
          - Migration framework

Phase 2.3: API Gateway
                [████████]   │
                  - Gateway consolidation
                  - Auth unification
                  - Security layer

Phase 2.4: Agent Engine
                        [████████████]   │
                          - Agent orchestration
                          - Workflow engine
                          - Swarm coordination

Phase 2.5: Neural Processing
                                    [████████]   │
                                      - llama.cpp wrapper
                                      - AI providers
                                      - Queen coordinator

Phase 2.6: Monitoring
                                            [████████]   │
                                              - Metrics
                                              - Logging
                                              - Tracing

Phase 2.7: UI Layer
                                                    [████████]   │
                                                      - Dashboard
                                                      - Admin
                                                      - Components

Phase 2.8: Testing
                                                            [████████]   │
                                                              - Integration
                                                              - Performance
                                                              - Security

Phase 2.9: Documentation
                                                                    [████████]   │
                                                                      - Docs
                                                                      - CI/CD
                                                                      - Deploy

Phase 2.10: Cleanup
                                                                            [████████]
                                                                              - Deprecation
                                                                              - Optimization
                                                                              - Validation

MILESTONES:
  ◆  Week 2:  Foundation complete
  ◆  Week 4:  Data layer unified
  ◆  Week 6:  API gateway operational
  ◆  Week 9:  Agent engine consolidated
  ◆  Week 11: Neural processing integrated
  ◆  Week 13: Monitoring centralized
  ◆  Week 15: UI layer migrated
  ◆  Week 17: Testing complete
  ◆  Week 19: Production deployment
  ◆  Week 21: Migration finalized
```

---

## 6. Dependency Graph

```
┌───────────────────────────────────────────────────────────────────┐
│                        PACKAGE DEPENDENCIES                        │
└───────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │  @agenticos-ui/  │
                    │    dashboard     │
                    └────────┬─────────┘
                             │
                             ▼
               ┌─────────────────────────┐
               │  @agenticos/services/*  │
               │  - auth                 │
               │  - feature-flags        │
               │  - audit                │
               └──────────┬──────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ infrastructure│  │ orchestration │  │ infrastructure│
│ /api-gateway │  │ /agent-engine │  │  /database   │
└──────┬───────┘  └───────┬───────┘  └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ orchestration│  │ orchestration │  │infrastructure│
│   /neural    │  │   /memory    │  │ /monitoring  │
└──────┬───────┘  └───────┬───────┘  └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ core/common  │  │ core/config  │  │ core/types   │
└──────────────┘  └──────────────┘  └──────────────┘

DEPENDENCY RULES:
  1. Core packages have zero internal dependencies
  2. Infrastructure packages depend only on core
  3. Orchestration packages depend on core + infrastructure
  4. Services depend on all lower layers
  5. UI depends on services layer

CIRCULAR DEPENDENCIES: ❌ NOT ALLOWED
```

---

## 7. Deployment Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                       KUBERNETES CLUSTER                           │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    Ingress Controller                     │    │
│  │  - TLS termination                                        │    │
│  │  - Load balancing                                         │    │
│  │  - Routing rules                                          │    │
│  └────────────────────┬─────────────────────────────────────┘    │
│                       │                                            │
│  ┌────────────────────▼─────────────────────────────────────┐    │
│  │                  API Gateway Pods (3-15)                  │    │
│  │  Deployment: noa-api-gateway                              │    │
│  │  - Horizontal Pod Autoscaler (CPU > 70%)                  │    │
│  │  - Readiness probe: /health/ready                         │    │
│  │  - Liveness probe: /health                                │    │
│  └─┬──────────────────────────────────────────────────────┬──┘    │
│    │                                                        │       │
│  ┌─▼────────────────────┐                    ┌─────────────▼───┐  │
│  │ Agent Engine Pods    │                    │ Neural Pods     │  │
│  │ (2-10 replicas)      │                    │ (1-5 replicas)  │  │
│  │ - StatefulSet        │                    │ - GPU affinity  │  │
│  │ - Persistent volumes │                    │ - Model cache   │  │
│  └─┬────────────────────┘                    └─────────────┬───┘  │
│    │                                                        │       │
│  ┌─▼────────────────────────────────────────────────────────▼───┐  │
│  │                      Service Mesh (Istio)                    │  │
│  │  - Service discovery                                         │  │
│  │  - mTLS encryption                                           │  │
│  │  - Traffic management                                        │  │
│  │  - Observability                                             │  │
│  └─┬──────────────────────────────────────────────────────────┬─┘  │
│    │                                                            │    │
│  ┌─▼───────────────┐  ┌────────────────┐  ┌──────────────────▼─┐  │
│  │ PostgreSQL Pod  │  │  Redis Cluster │  │  Kafka Cluster     │  │
│  │ - StatefulSet   │  │  (3 nodes)     │  │  (3 brokers)       │  │
│  │ - PVC (200GB)   │  │  - Sentinel    │  │  - Zookeeper       │  │
│  └─────────────────┘  └────────────────┘  └────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

EXTERNAL SERVICES:
  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
  │   Prometheus   │  │    Grafana     │  │     Jaeger     │
  │   (Metrics)    │  │  (Dashboards)  │  │   (Tracing)    │
  └────────────────┘  └────────────────┘  └────────────────┘
```

---

## 8. State Management Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                      STATE MANAGEMENT FLOW                         │
└───────────────────────────────────────────────────────────────────┘

  USER ACTION
      │
      ▼
┌─────────────┐
│   Service   │  1. Receives request
│   Handler   │  2. Validates input
└──────┬──────┘  3. Starts transaction
       │
       ▼
┌─────────────────────────────────────┐
│      State Manager                  │
│  ┌───────────────────────────────┐  │
│  │  Local Cache (In-Memory LRU) │  │  4. Check local cache
│  │  - Hot data                   │  │     (fastest)
│  │  - TTL: 5 minutes             │  │
│  └───────┬───────────────────────┘  │
│          │ Cache miss               │
│          ▼                           │
│  ┌───────────────────────────────┐  │
│  │  Distributed Cache (Redis)    │  │  5. Check Redis
│  │  - Session data               │  │     (fast)
│  │  - Shared state               │  │
│  │  - TTL: 1 hour                │  │
│  └───────┬───────────────────────┘  │
│          │ Cache miss               │
│          ▼                           │
│  ┌───────────────────────────────┐  │
│  │   Event Store (PostgreSQL)    │  │  6. Reconstruct from events
│  │  - Event log                  │  │     (slower, authoritative)
│  │  - Snapshots                  │  │
│  │  - Full history               │  │
│  └───────┬───────────────────────┘  │
└──────────┼───────────────────────────┘
           │
           ▼
    ┌────────────┐
    │  Response  │  7. Return to user
    │  + Update  │  8. Update caches
    │  Caches    │  9. Append event
    └────────────┘

WRITE PATH:
  1. Write to Event Store (source of truth)
  2. Update Distributed Cache (Redis)
  3. Update Local Cache (in-memory)
  4. Publish event to Event Bus
  5. Async: Update read replicas

READ PATH:
  1. Try Local Cache → Return if hit
  2. Try Redis Cache → Update local + return if hit
  3. Reconstruct from Event Store → Update all caches
```

---

## 9. Security Layers Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                         SECURITY ONION MODEL                       │
└───────────────────────────────────────────────────────────────────┘

                     ╔═══════════════════╗
                     ║   OUTER LAYER 1   ║
                     ║  Network Security ║
                     ║  - TLS 1.3        ║
                     ║  - Firewall       ║
                     ║  - DDoS protect   ║
                     ╚════════┬══════════╝
                              │
                     ╔════════▼══════════╗
                     ║   LAYER 2         ║
                     ║ API Gateway       ║
                     ║ - Rate limiting   ║
                     ║ - IP whitelist    ║
                     ║ - Request filter  ║
                     ╚════════┬══════════╝
                              │
                     ╔════════▼══════════╗
                     ║   LAYER 3         ║
                     ║ Authentication    ║
                     ║ - JWT validation  ║
                     ║ - OAuth 2.0       ║
                     ║ - Session mgmt    ║
                     ╚════════┬══════════╝
                              │
                     ╔════════▼══════════╗
                     ║   LAYER 4         ║
                     ║ Authorization     ║
                     ║ - RBAC            ║
                     ║ - Permissions     ║
                     ║ - Resource access ║
                     ╚════════┬══════════╝
                              │
                     ╔════════▼══════════╗
                     ║   LAYER 5         ║
                     ║ Input Validation  ║
                     ║ - Schema check    ║
                     ║ - SQL injection   ║
                     ║ - XSS protection  ║
                     ╚════════┬══════════╝
                              │
                     ╔════════▼══════════╗
                     ║   INNER CORE      ║
                     ║ Data Security     ║
                     ║ - Encryption      ║
                     ║ - Audit logging   ║
                     ║ - Data masking    ║
                     ╚═══════════════════╝

DEFENSE IN DEPTH:
  Each layer provides independent security
  Compromise of one layer doesn't expose inner layers
  Logging and monitoring at every layer
```

---

## 10. Performance Optimization Targets

```
┌───────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE OPTIMIZATION MAP                    │
└───────────────────────────────────────────────────────────────────┘

METRIC                  CURRENT    TARGET     IMPROVEMENT
──────────────────────────────────────────────────────────────────
Bundle Size             120 MB     60 MB      ↓ 50%
Cold Start Time         12s        8s         ↓ 33%
Memory Usage            4 GB       3 GB       ↓ 25%
API Latency (P95)       350ms      200ms      ↓ 43%
API Latency (P99)       800ms      500ms      ↓ 38%
DB Query Time (avg)     150ms      50ms       ↓ 67%
Cache Hit Rate          65%        90%        ↑ 38%
Agent Spawn Time        1.5s       1s         ↓ 33%
Throughput (req/s)      3,000      10,000     ↑ 233%
File Count              3,831      2,300      ↓ 40%

OPTIMIZATION STRATEGIES:
──────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│ 1. CODE OPTIMIZATION                                        │
│    - Tree shaking: Remove unused code                       │
│    - Code splitting: Lazy load modules                      │
│    - Minification: Compress JavaScript                      │
│    - Dead code elimination: Remove unreachable code         │
│    ► Expected: 50% bundle size reduction                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. DATABASE OPTIMIZATION                                    │
│    - Query optimization: Analyze slow queries               │
│    - Indexing: Add indexes to frequently queried columns    │
│    - Connection pooling: Reuse connections                  │
│    - Read replicas: Distribute read load                    │
│    ► Expected: 67% query time reduction                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. CACHING STRATEGY                                         │
│    - Cache frequently accessed data (>10 req/min)           │
│    - Implement cache warming on startup                     │
│    - Use Redis for distributed caching                      │
│    - Local in-memory cache for hot data                     │
│    ► Expected: 90% cache hit rate                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 4. HORIZONTAL SCALING                                       │
│    - Auto-scale based on CPU/memory                         │
│    - Load balance across replicas                           │
│    - Partition data for parallelism                         │
│    ► Expected: 233% throughput increase                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Testing Strategy Pyramid

```
                    ┌─────────────┐
                    │   E2E (10%) │       200 tests
                    │  - Playwright│       Critical paths
                    │  - User flows│       Full integration
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │  Integration (30%)      │   600 tests
              │  - Vitest + Containers  │   Service communication
              │  - API endpoints        │   Database operations
              │  - Service interactions │
              └────────┬────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │      Unit (60%)              │   1,200 tests
        │      - Vitest                │   Business logic
        │      - Pure functions        │   Utilities
        │      - Component testing     │   Fast feedback
        └──────────────────────────────┘

TOTAL TESTS: 2,000 tests
COVERAGE TARGET: 80%
RUN TIME: <5 minutes for full suite
CI/CD INTEGRATION: Run on every commit
```

---

**END OF DIAGRAMS**

These diagrams provide visual representation of the unified architecture described in the Phase 2 Architecture Blueprint. Use them alongside the main document for comprehensive understanding of the migration strategy.
