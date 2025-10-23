# Targeted Folder Structure Design
**Version:** 1.0
**Date:** 2025-10-22
**Status:** Proposed for Review

## Executive Summary

This document defines the targeted folder structure for consolidating ~206,069 files from `/deflex` into `/home/deflex/noa-server`, building upon the incomplete skeleton at `/home/deflex/noa-server/agentic-homelab` and the reference architecture in `FINAL_FOLDER_STRUCTURE.md`.

**Key Design Principles:**
- Three-plane architecture: sandbox (dev), deployed (prod), coordinator (orchestration)
- Shared resources minimize duplication
- Clear service-to-plane mapping
- Supports 543-task migration plan (38 MER + 505 POL)
- Queen model assignments for autonomous orchestration
- Flexible enough to accommodate discovered edge cases

---

## Directory Hierarchy

```
/home/deflex/noa-server/agentic-homelab/
│
├── shared/                                    # Shared resources (all planes)
│   ├── config/
│   │   ├── global.yml                        # Global configuration
│   │   ├── models/                           # Model configurations
│   │   │   ├── queen-models.json            # Queen model profiles
│   │   │   └── model-selection.json         # Auto-selection rules
│   │   ├── audit/                            # Audit system config
│   │   │   └── audit-config.json
│   │   └── swarm/                            # Swarm coordination config
│   │       ├── topologies.json
│   │       └── agent-definitions.json
│   ├── logs/
│   │   ├── coordinator/                      # Coordinator plane logs
│   │   ├── deployed/                         # Production logs
│   │   ├── sandbox/                          # Development logs
│   │   └── audit/                            # Audit trail logs
│   ├── models/                               # ML models (llama.cpp GGUF)
│   │   ├── queens/                           # Queen coordinator models
│   │   │   ├── phi-3.5-mini-instruct-q4.gguf
│   │   │   ├── gemma2-2b-instruct-q5.gguf
│   │   │   └── qwen2-7b-instruct-q4.gguf
│   │   ├── specialists/                      # Specialist agent models
│   │   └── embeddings/                       # Embedding models
│   ├── state/
│   │   ├── redis/                            # Redis state storage
│   │   ├── postgres/                         # PostgreSQL databases
│   │   └── memory/                           # Agent memory persistence
│   │       ├── long-term/                    # Cross-session memory
│   │       └── short-term/                   # Session memory
│   ├── artifacts/
│   │   ├── builds/                           # Build outputs
│   │   ├── tests/                            # Test results
│   │   └── reports/                          # Generated reports
│   └── releases/
│       ├── v1.0.0/
│       ├── v1.1.0/
│       └── current -> v1.1.0                 # Symlink to current release
│
├── coordinator-plane/                         # Lightweight orchestration & control
│   ├── services/
│   │   ├── mcp-service/                      # From: packages/mcp-agent
│   │   │   ├── src/
│   │   │   ├── config/
│   │   │   └── package.json
│   │   ├── claude-flow/                      # From: packages/claude-flow-integration
│   │   │   ├── src/
│   │   │   ├── hooks/
│   │   │   └── package.json
│   │   └── agentic-os/                       # Core agent OS
│   │       ├── src/
│   │       ├── config/
│   │       └── package.json
│   ├── agents/                               # Integrated agent systems
│   │   ├── core/                             # From: srv/agenticos
│   │   │   ├── orchestrator/
│   │   │   ├── perception/
│   │   │   ├── memory/
│   │   │   ├── system/
│   │   │   └── observability/
│   │   ├── swarms/                           # Swarm definitions
│   │   │   ├── audit-swarm/
│   │   │   ├── code-review-swarm/
│   │   │   └── tdd-swarm/
│   │   └── queens/                           # Queen coordinator agents
│   │       ├── primary-queen/
│   │       │   ├── model: phi-3.5-mini-instruct-q4
│   │       │   └── role: strategic coordination
│   │       ├── audit-queen/
│   │       │   ├── model: gemma2-2b-instruct-q5
│   │       │   └── role: verification & validation
│   │       └── code-queen/
│   │           ├── model: qwen2-7b-instruct-q4
│   │           └── role: code generation & review
│   ├── orchestration/
│   │   ├── workflows/                        # Workflow definitions
│   │   ├── pipelines/                        # CI/CD pipelines
│   │   └── automation/                       # Automation scripts
│   ├── config/
│   │   ├── plane.yml                         # Plane-specific config
│   │   └── services.yml                      # Service configurations
│   └── monitoring/
│       ├── metrics/
│       └── alerts/
│
├── deployed-plane-green/                      # Production (blue/green)
│   ├── services/
│   │   ├── ui-dashboard/                     # From: packages/ui-dashboard
│   │   │   ├── src/
│   │   │   ├── public/
│   │   │   └── package.json
│   │   ├── llama-cpp/                        # From: packages/llama.cpp
│   │   │   ├── models/                       # Symlink to shared/models
│   │   │   ├── src/
│   │   │   └── shims/
│   │   ├── database/
│   │   │   ├── postgres/                     # PostgreSQL service
│   │   │   └── redis/                        # Redis service
│   │   ├── api-gateway/                      # From: packages/microservices
│   │   └── message-queue/                    # From: packages/message-queue
│   ├── releases/
│   │   ├── blue/                             # Blue deployment
│   │   └── green/                            # Green deployment (active)
│   ├── config/
│   │   ├── production.yml
│   │   └── security.yml
│   └── monitoring/
│       ├── uptime/
│       └── performance/
│
├── deployed-plane-blue/                       # Standby (blue/green)
│   └── [Mirror structure of deployed-plane-green]
│
└── sandbox-plane/                             # Development & testing (data-heavy)
    ├── services/
    │   ├── [All services for dev/testing]
    │   ├── mcp-service-dev/
    │   ├── claude-flow-dev/
    │   ├── llama-cpp-dev/
    │   └── ui-dashboard-dev/
    ├── workspaces/                           # Development workspaces
    │   ├── workspace-1/                      # From: /deflex/workspace (303GB)
    │   ├── go-development/                   # From: /deflex/go (4.1GB)
    │   ├── ai-repos/                         # From: /deflex/ai-dev-repos (798MB)
    │   └── data-processing/                  # From: /deflex/data (596MB)
    ├── agents/                               # Agent development
    │   ├── experimental/
    │   └── testing/
    ├── config/
    │   ├── development.yml
    │   └── testing.yml
    └── monitoring/
        ├── debug/
        └── profiling/
```

---

## Service-to-Plane Mapping

### Coordinator Plane (Lightweight Orchestration)
| Package Source | Destination | Purpose | Queen Model |
|----------------|-------------|---------|-------------|
| `packages/mcp-agent/` | `coordinator-plane/services/mcp-service/` | Model Context Protocol | N/A |
| `packages/claude-flow-integration/` | `coordinator-plane/services/claude-flow/` | AI workflow orchestration | Primary Queen (Phi-3.5) |
| `packages/workflow-orchestration/` | `coordinator-plane/orchestration/workflows/` | Workflow engine | Primary Queen |
| `srv/agenticos/` | `coordinator-plane/agents/core/` | Core agent OS | All Queens |
| `packages/agent-swarm/` | `coordinator-plane/agents/swarms/` | Swarm coordination | Primary Queen |

### Deployed Plane (Production)
| Package Source | Destination | Purpose | Port |
|----------------|-------------|---------|------|
| `packages/ui-dashboard/` | `deployed-plane-green/services/ui-dashboard/` | Web interface | 9200 |
| `packages/llama.cpp/` | `deployed-plane-green/services/llama-cpp/` | Neural processing | 9300 |
| `packages/microservices/` | `deployed-plane-green/services/api-gateway/` | API gateway | 8080 |
| `packages/message-queue/` | `deployed-plane-green/services/message-queue/` | RabbitMQ/Kafka | 5672 |
| `packages/database-optimizer/` | `deployed-plane-green/services/database/postgres/` | PostgreSQL | 5432 |
| `packages/cache-manager/` | `deployed-plane-green/services/database/redis/` | Redis cache | 6379 |

### Sandbox Plane (Development)
| Package Source | Destination | Purpose |
|----------------|-------------|---------|
| All packages (dev mode) | `sandbox-plane/services/*-dev/` | Development testing |
| `/deflex/workspace/` (303GB) | `sandbox-plane/workspaces/workspace-1/` | Main workspace |
| `/deflex/go/` (4.1GB) | `sandbox-plane/workspaces/go-development/` | Go projects |
| `/deflex/ai-dev-repos/` (798MB) | `sandbox-plane/workspaces/ai-repos/` | AI repositories |
| `/deflex/data/` (596MB) | `sandbox-plane/workspaces/data-processing/` | Data files |

### Shared Resources (All Planes)
| Package Source | Destination | Purpose |
|----------------|-------------|---------|
| `packages/llama.cpp/models/*.gguf` | `shared/models/queens/` | Queen models |
| `packages/monitoring/` | `shared/logs/` | Centralized logging |
| `packages/audit-logger/` | `shared/logs/audit/` | Audit trail |
| `packages/secrets-manager/` | `shared/config/` | Secrets management |
| `packages/feature-flags/` | `shared/config/` | Feature toggles |

---

## Queen Model Assignment Strategy

### Primary Queen (Strategic Coordination)
- **Model:** Phi-3.5-mini-instruct Q4_K_M
- **Location:** `shared/models/queens/phi-3.5-mini-instruct-q4.gguf`
- **Responsibilities:**
  - Overall swarm coordination
  - Task orchestration across 543 migration tasks
  - Resource allocation decisions
  - Topology optimization
- **Profile:** Balanced (from queen-models.json)
- **Hardware:** CPU-friendly, 4GB memory budget
- **Fitness Scores:** Queen 0.88, Reasoning 0.85, JSON 0.90

### Audit Queen (Verification & Validation)
- **Model:** Gemma2-2b-instruct Q5_K_M
- **Location:** `shared/models/queens/gemma2-2b-instruct-q5.gguf`
- **Responsibilities:**
  - Triple-verification protocol
  - Truth Gate validation
  - SHA-256 evidence chain management
  - 95%+ confidence enforcement
- **Profile:** Fast Coordination
- **Hardware:** Lightweight, 2GB memory budget
- **Fitness Scores:** Queen 0.85, Reasoning 0.80, JSON 0.85

### Code Queen (Generation & Review)
- **Model:** Qwen2-7B-Instruct Q4_K_M
- **Location:** `shared/models/queens/qwen2-7b-instruct-q4.gguf`
- **Responsibilities:**
  - Code merge operations
  - Refactoring and polishing (POL tasks)
  - Code review swarm coordination
  - Quality enforcement
- **Profile:** Reasoning Focused
- **Hardware:** 5GB memory budget (CPU or small GPU)
- **Fitness Scores:** Queen 0.90, Reasoning 0.93, JSON 0.88

---

## Migration Paths (543-Task Execution Plan)

### Phase 1: Foundation Setup (MER-0001 to MER-0038)
**Tasks:** 38 merge protocol tasks
**Queens:** Primary Queen + Audit Queen
**Actions:**
1. Create `agentic-homelab/` directory structure
2. Initialize shared resources (`shared/config/`, `shared/models/`, `shared/state/`)
3. Setup Queen model files and configurations
4. Establish audit system and Truth Gate
5. Configure swarm topologies (mesh for 60+ agents)

**Example Migration:**
```bash
# MER-0001: Create coordinator plane
mkdir -p agentic-homelab/coordinator-plane/{services,agents,orchestration,config,monitoring}

# MER-0002: Setup Primary Queen
cp packages/llama.cpp/models/phi-3.5-mini-instruct-q4.gguf shared/models/queens/
cp claude-flow/src/hive-mind/config/queen-models.json shared/config/models/

# MER-0003: Initialize audit system
cp -r claude-flow/src/audit/ coordinator-plane/agents/swarms/audit-swarm/
```

### Phase 2: Service Migration (POL-0001 to POL-0200)
**Tasks:** 200 polish protocol tasks
**Queens:** Code Queen + Primary Queen
**Parallelism:** 60 agents, 100 parallel-safe tasks
**Actions:**
1. Migrate 26 packages to appropriate planes
2. Update import paths and dependencies
3. Polish code quality and consistency
4. Run comprehensive tests
5. Audit Queen validates each migration

**Example Migration:**
```bash
# POL-0001: Migrate MCP service
rsync -av packages/mcp-agent/ coordinator-plane/services/mcp-service/
# Update imports, run tests, audit

# POL-0015: Migrate llama.cpp
rsync -av packages/llama.cpp/ deployed-plane-green/services/llama-cpp/
ln -s ../../../shared/models deployed-plane-green/services/llama-cpp/models
# Configure, test, audit
```

### Phase 3: Workspace Consolidation (POL-0201 to POL-0400)
**Tasks:** 200 polish protocol tasks
**Queens:** Primary Queen (resource allocation)
**Data Volume:** ~308GB
**Actions:**
1. Move `/deflex/workspace/` (303GB) → `sandbox-plane/workspaces/workspace-1/`
2. Move `/deflex/go/` (4.1GB) → `sandbox-plane/workspaces/go-development/`
3. Move `/deflex/ai-dev-repos/` (798MB) → `sandbox-plane/workspaces/ai-repos/`
4. Move `/deflex/data/` (596MB) → `sandbox-plane/workspaces/data-processing/`
5. Validate file integrity (SHA-256 checksums)

**Example Migration:**
```bash
# POL-0201: Migrate workspace (chunked with progress)
rsync -av --progress /deflex/workspace/ agentic-homelab/sandbox-plane/workspaces/workspace-1/
sha256sum -c workspace-checksums.txt
# Audit Queen validates integrity
```

### Phase 4: Agent System Integration (POL-0401 to POL-0505)
**Tasks:** 105 polish protocol tasks
**Queens:** All three Queens (coordinated)
**Actions:**
1. Migrate `srv/agenticos/` → `coordinator-plane/agents/core/`
2. Integrate swarm definitions
3. Wire Queens to agent roles
4. Configure cross-plane communication
5. Final comprehensive audit (all 7 agents + Truth Gate)

**Example Migration:**
```bash
# POL-0401: Migrate agentic OS core
rsync -av srv/agenticos/ coordinator-plane/agents/core/
# Update paths, configure Queens, test integration

# POL-0500: Final audit
node claude-flow/hooks/run-audit.js --target agentic-homelab/ --min-confidence 0.95
# All Queens + 7 audit agents + Truth Gate validation
```

---

## Resource Allocation

### CPU Cores per Task Type
- **MER tasks:** 2-4 cores (lighter, foundational)
- **POL tasks:** 4-8 cores (heavier, processing)
- **Queen coordination:** 4 cores reserved
- **Audit swarm:** 8 cores reserved

### Memory Budget per Plane
- **Coordinator Plane:** 8GB (Queens: 4+2+5=11GB peak, managed by Primary Queen)
- **Deployed Plane:** 16GB (production databases + services)
- **Sandbox Plane:** 32GB (development + 308GB workspace on disk)
- **Shared Resources:** 8GB (models in memory-mapped mode)

### Disk Allocation
- **Shared:** 50GB (models 20GB, logs 10GB, state 10GB, releases 10GB)
- **Coordinator:** 20GB (lightweight services + agents)
- **Deployed:** 100GB (databases + production data)
- **Sandbox:** 400GB (308GB workspaces + dev services + headroom)

### Parallelism Strategy
- **Level 0:** 543 tasks, 339 parallel-safe (62%)
- **Concurrency:** 60 agents (as recommended by execution plan)
- **Estimated Duration:** 48-72 hours (vs 1,094 hours serial)
- **Critical Path:** Managed by Primary Queen with dynamic scheduling

---

## Flexibility & Edge Cases

### Discovered Content Handling
If migration discovers unexpected directories or files not in the 543-task plan:

1. **Archive Path:** `sandbox-plane/workspaces/discovered/`
2. **Process:** Audit Queen evaluates → Primary Queen decides (consolidate, archive, or delete)
3. **Logging:** All decisions logged to `shared/logs/coordinator/discovery.log`

### Package Conflicts
If packages have overlapping functionality or names:

1. **Resolution:** Code Queen analyzes dependencies
2. **Strategy:** Merge, rename with `-v1`/`-v2` suffix, or deprecate
3. **Documentation:** Record in `docs/upgrade/PACKAGE_CONFLICTS.md`

### Large File Handling
For individual files >1GB:

1. **Location:** Keep in sandbox-plane, symlink from other planes if needed
2. **Optimization:** Use sparse files, compression, or external storage
3. **Tracking:** Register in `shared/state/large-files.db`

### Incremental Migration
Design supports pausing and resuming:

1. **Checkpoints:** Every 50 tasks (10 checkpoints total)
2. **State:** Saved to `shared/state/migration-state.json`
3. **Resume:** Primary Queen reads checkpoint and continues

---

## Validation & Success Criteria

### Audit Requirements
- **Comprehensive Audit:** All 7 specialized agents + Truth Gate
- **Confidence Threshold:** ≥95%
- **Evidence Chain:** SHA-256 cryptographic validation
- **Triple Verification:** Pass A, B, C protocol

### Success Metrics
1. **File Integrity:** 100% of 206,069 files validated (SHA-256)
2. **Service Health:** All services passing health checks in deployed plane
3. **Test Coverage:** ≥90% code coverage maintained post-migration
4. **Queen Performance:** All Queens achieving target fitness scores
5. **Zero Data Loss:** All source files preserved in `sandbox-plane/archives/pre-migration/`

### Rollback Plan
- **Snapshots:** Filesystem snapshot before each phase
- **Archives:** Original `/deflex` archived to `sandbox-plane/archives/deflex-backup-[timestamp]/`
- **Restore:** Script at `agentic-homelab/tools/rollback.sh`

---

## Implementation Command

Once approved, execute migration with:

```bash
# Initialize Primary Queen and audit system
npx claude-flow@alpha sparc tdd "Execute 543-task migration plan with Queen orchestration"

# Or use direct audit runner
node claude-flow/hooks/run-audit.js \
  --task-id migration-543 \
  --target agentic-homelab/ \
  --description "Consolidate /deflex to noa-server with Queen orchestration" \
  --report docs/upgrade/TARGETED_FOLDER_STRUCTURE_DESIGN.md \
  --min-confidence 0.95
```

---

## Approval Checklist

- [ ] Folder structure hierarchy reviewed
- [ ] Service-to-plane mapping confirmed
- [ ] Queen model assignments approved
- [ ] Migration path phases acceptable
- [ ] Resource allocation sufficient
- [ ] Flexibility mechanisms adequate
- [ ] Validation criteria agreed upon
- [ ] Rollback plan in place

**Status:** Awaiting user review and approval
**Next Action:** Upon approval, execute Phase 1 foundation setup with Primary Queen + Audit Queen
