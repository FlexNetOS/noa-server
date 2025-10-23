# Phase 2: Quick Reference Guide

**For:** Engineering team implementing the unified AgenticOS architecture
**See Also:** phase2-architecture-blueprint.md (full details), phase2-architecture-diagrams.md (visuals)

---

## TL;DR - What We're Building

**Goal:** Consolidate 29 fragmented packages into a unified AgenticOS platform with clear layer boundaries and single-source-of-truth implementations.

**Target Metrics:**
- 40% codebase reduction (3,831 → ~2,300 files)
- 50% bundle size reduction
- 80% test coverage
- <200ms API latency (P95)

**Timeline:** 21 weeks (10 phases)

---

## New Package Structure

```
packages/@agenticos/
├── core/                    # Foundation layer (no dependencies)
│   ├── common/              # Shared utilities
│   ├── config/              # Unified configuration
│   ├── types/               # Platform types
│   └── logger/              # Centralized logging
│
├── orchestration/           # Platform services
│   ├── agent-engine/        # Agent orchestration
│   ├── neural/              # Neural processing
│   └── memory/              # State management
│
├── infrastructure/          # Integration services
│   ├── api-gateway/         # Unified API
│   ├── database/            # Data layer
│   └── monitoring/          # Observability
│
└── services/                # Domain services
    ├── auth/                # Authentication
    ├── feature-flags/       # Feature management
    ├── audit/               # Audit logging
    └── compliance/          # GDPR compliance

packages/@agenticos-ui/
├── dashboard/               # Main UI
├── admin/                   # Admin interface
└── components/              # Shared components
```

---

## Key Consolidations

| Before (Multiple Implementations) | After (Single Implementation) |
|-----------------------------------|-------------------------------|
| `agent-swarm` + `claude-flow/swarm` + `workflow-orchestration` | `@agenticos/orchestration-agent-engine` |
| 20+ config systems across packages | `@agenticos/core-config` |
| `monitoring` + `audit-logger` + scattered logging | `@agenticos/infrastructure-monitoring` |
| `database-optimizer` + `database-sharding` + `connection-pool` + `cache-manager` | `@agenticos/infrastructure-database` |
| `llama.cpp` + `ai-provider` + `claude-flow/neural` | `@agenticos/orchestration-neural` |
| Multiple API gateways | `@agenticos/infrastructure-api-gateway` |

---

## 10-Phase Migration Timeline

| Phase | Weeks | Objective | Deliverables |
|-------|-------|-----------|--------------|
| **2.1** | 1-2 | Foundation Setup | Core common, config, types packages |
| **2.2** | 3-4 | Data Layer | Unified database, cache, migrations |
| **2.3** | 5-6 | API Gateway | Single gateway, auth, security |
| **2.4** | 7-9 | Agent Engine | Agent orchestration, workflows, swarm |
| **2.5** | 10-11 | Neural Processing | llama.cpp wrapper, AI providers, Queen |
| **2.6** | 12-13 | Monitoring | Metrics, logging, tracing |
| **2.7** | 14-15 | UI Layer | Dashboard, admin, components |
| **2.8** | 16-17 | Testing | Integration, performance, security tests |
| **2.9** | 18-19 | Documentation | Docs, CI/CD, deployment |
| **2.10** | 20-21 | Cleanup | Deprecation, optimization, validation |

---

## Layer Architecture Rules

**Layer 1 (Foundation):**
- Zero internal dependencies
- Provides: utilities, config, types, logging
- Examples: `@agenticos/core-common`, `@agenticos/core-config`

**Layer 2 (Platform Services):**
- Depends on: Layer 1 only
- Provides: business logic, orchestration
- Examples: `@agenticos/orchestration-agent-engine`, `@agenticos/orchestration-neural`

**Layer 3 (Integration Services):**
- Depends on: Layers 1-2
- Provides: external I/O, infrastructure
- Examples: `@agenticos/infrastructure-api-gateway`, `@agenticos/infrastructure-database`

**Layer 4 (Application):**
- Depends on: All lower layers
- Provides: user interfaces
- Examples: `@agenticos-ui/dashboard`

**Rule:** Lower layers NEVER depend on upper layers. No circular dependencies.

---

## Key Configuration Changes

### Old (Fragmented)
```typescript
// Each package had own config loader
import config from './config.json';
```

### New (Unified)
```typescript
import { ConfigProvider } from '@agenticos/core-config';

const config = await ConfigProvider.getInstance();
const dbUrl = config.get('database.primary.url');
```

### Configuration File
```yaml
# config/environments/production.yaml
platform:
  name: "AgenticOS"
  environment: production

services:
  api-gateway:
    port: ${API_GATEWAY_PORT:-8080}
  agent-engine:
    maxConcurrentAgents: ${MAX_AGENTS:-50}

database:
  primary:
    type: postgres
    url: ${POSTGRES_URL}
```

---

## Migration Patterns

### Pattern 1: Facade for Backward Compatibility

```typescript
// packages/legacy/agent-swarm/src/index.ts
import { AgentEngine } from '@agenticos/orchestration-agent-engine';

/**
 * @deprecated Use @agenticos/orchestration-agent-engine
 */
export class AgentSwarm {
  private engine: AgentEngine;

  constructor(config: any) {
    console.warn('AgentSwarm is deprecated. Migrate to @agenticos/orchestration-agent-engine');
    this.engine = new AgentEngine(config);
  }

  // Map old API to new API
  async spawnAgent(config: any) {
    return this.engine.createAgent(config);
  }
}
```

### Pattern 2: Progressive Migration

```typescript
// Week 1-10: Both old and new work
import { AgentSwarm } from 'agent-swarm'; // Still works via facade

// Week 11-19: Warnings added
// Week 20+: Old package removed, must use new API
import { AgentEngine } from '@agenticos/orchestration-agent-engine';
```

---

## Testing Strategy

**Unit Tests (60% of tests):**
- Pure functions, business logic
- Framework: Vitest
- Target: 80% coverage

**Integration Tests (30% of tests):**
- API endpoints, database ops
- Framework: Vitest + Testcontainers
- Target: 70% coverage

**E2E Tests (10% of tests):**
- Critical user flows
- Framework: Playwright
- Target: 20 key scenarios

**Total Target:** 2,000 tests, <5 min run time

---

## Performance Targets

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Bundle Size | 120 MB | 60 MB | ↓ 50% |
| Cold Start | 12s | 8s | ↓ 33% |
| Memory Usage | 4 GB | 3 GB | ↓ 25% |
| API Latency P95 | 350ms | 200ms | ↓ 43% |
| Throughput | 3K req/s | 10K req/s | ↑ 233% |
| File Count | 3,831 | 2,300 | ↓ 40% |

---

## Security Layers (Defense in Depth)

1. **Network Security:** TLS 1.3, firewall, DDoS protection
2. **API Gateway:** Rate limiting, IP filtering, request validation
3. **Authentication:** JWT, OAuth 2.0, session management
4. **Authorization:** RBAC, permissions, resource access
5. **Input Validation:** Schema checks, SQL injection prevention, XSS protection
6. **Data Security:** Encryption at rest/transit, audit logging

---

## Common Tasks

### Create New Package

```bash
# Use generator script
npm run generate:package @agenticos/my-new-package

# Manual structure
packages/@agenticos/my-new-package/
├── src/
│   └── index.ts
├── tests/
│   └── index.test.ts
├── package.json
└── tsconfig.json
```

### Add Dependency Between Packages

```json
// packages/@agenticos/my-package/package.json
{
  "dependencies": {
    "@agenticos/core-common": "workspace:*",
    "@agenticos/core-config": "workspace:*"
  }
}
```

### Run Tests for Specific Package

```bash
cd packages/@agenticos/my-package
pnpm test
```

### Build All Packages

```bash
pnpm build:all
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build:all
```

---

## Rollback Procedure

**If migration fails:**

1. **Identify Issue:** Check logs, monitoring dashboards
2. **Assess Impact:** Determine if rollback needed
3. **Execute Rollback:**
   ```bash
   # Kubernetes
   kubectl rollout undo deployment/noa-api-gateway -n noa-server

   # Docker
   docker-compose down
   git checkout previous-tag
   docker-compose up -d
   ```
4. **Verify Health:** Check all services operational
5. **Post-Mortem:** Document what went wrong, plan fix

---

## Key Contacts

| Area | Owner | Contact |
|------|-------|---------|
| Architecture | Backend Architect | @architect |
| Agent Engine | Platform Team | @platform |
| Neural Processing | ML Team | @ml |
| Database | Data Team | @data |
| UI/Frontend | Frontend Team | @frontend |
| DevOps | Infrastructure Team | @infra |

---

## Quick Links

**Documentation:**
- [Full Blueprint](/home/deflex/noa-server/docs/phase2-architecture-blueprint.md)
- [Architecture Diagrams](/home/deflex/noa-server/docs/phase2-architecture-diagrams.md)
- [Infrastructure Guide](/home/deflex/noa-server/INFRASTRUCTURE.md)

**Tools:**
- [SPARC Commands](/home/deflex/noa-server/CLAUDE.md#sparc-commands)
- [Package Generator](/home/deflex/noa-server/scripts/generators/generate.js)
- [Testing Guide](/home/deflex/noa-server/docs/TEST_INFRASTRUCTURE_SUMMARY.md)

**Monitoring:**
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- Jaeger: http://localhost:16686

---

## FAQ

**Q: Can I use old packages during migration?**
A: Yes, facade layer provides backward compatibility through Week 19.

**Q: What if my service depends on a package being consolidated?**
A: Use the new unified package. Facades available for smooth transition.

**Q: How do I know which layer my package belongs to?**
A: Check dependencies. No dependencies = Layer 1. Depends on Layer 1 = Layer 2, etc.

**Q: What happens to tests from old packages?**
A: Migrate to new package test suites. Maintain coverage targets.

**Q: Can I add new features during migration?**
A: Add to new unified packages. Avoid adding to legacy packages.

**Q: How do we handle configuration changes?**
A: Use unified config system. Old configs migrated via adapter layer.

---

**Last Updated:** 2025-10-22
**Status:** Ready for Implementation
**Next Step:** Review blueprint with team → Start Phase 2.1
