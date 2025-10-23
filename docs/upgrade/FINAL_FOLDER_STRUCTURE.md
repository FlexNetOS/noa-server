# Noa Server Final Folder Structure Design

**Version:** 1.0 | **Date:** October 22, 2025 | **Status:** Design Complete
**Purpose:** Integrate srv/agenticos into home-lab-server/agentic-homelab hierarchy

## Executive Summary

This document defines the final folder structure that integrates the srv/agenticos components into the home-lab-server/agentic-homelab deployment planes while maintaining logical service separation and alignment with the infrastructure architecture.

## Design Principles

1. **Three-Plane Architecture**: Sandbox (work/data-heavy) → Deployed (production/blue-green) → Coordinator (lightweight/failover)
2. **Failover Hierarchy**: Deployed (primary) → Coordinator (backup) → Sandbox (emergency)
3. **Zero-Downtime Deployment**: Blue/green capability in deployed plane
4. **Resource Optimization**: Sandbox (heavy) → Coordinator (light) → Deployed (balanced)
5. **Shared Resources**: Common artifacts, configs, and state in shared/ directory

## Final Folder Structure

```
home-lab-server/agentic-homelab/
├── shared/                          # Shared resources across all planes
│   ├── config/                      # Global configuration files
│   │   ├── system/                  # System-wide settings
│   │   ├── applications/            # Application registry and settings
│   │   └── dashboards/              # Monitoring dashboard configs
│   ├── logs/                        # Centralized logging
│   │   ├── coordinator-plane/       # Control plane logs
│   │   ├── deployed-plane/          # Production logs
│   │   └── sandbox-plane/           # Development logs
│   ├── models/                      # ML models and artifacts
│   │   ├── llama/                   # Llama.cpp models
│   │   └── embeddings/              # Embedding models
│   ├── state/                       # Shared state databases
│   │   ├── hive.db                  # Hive mind database
│   │   ├── memory.db                # Memory systems database
│   │   └── swarm-state/             # Agent swarm state
│   ├── artifacts/                   # Build artifacts and releases
│   └── releases/                    # Versioned releases
├── coordinator-plane/               # Control plane - lightweight orchestration & failover backup
│   ├── services/                    # Core orchestration services
│   │   ├── mcp-service/            # Port 8001 - Model Context Protocol
│   │   │   ├── src/                 # Source code
│   │   │   ├── config/              # Service configuration
│   │   │   ├── bin/                 # Executables
│   │   │   └── tests/               # Service tests
│   │   ├── claude-flow/            # Port 9100 - AI workflow orchestration
│   │   │   ├── src/                 # Source code
│   │   │   ├── config/              # Service configuration
│   │   │   ├── bin/                 # Executables
│   │   │   └── tests/               # Service tests
│   │   └── agentic-os/             # Port 9400 - Agent system management
│   │       ├── src/                 # Source code
│   │       ├── config/              # Service configuration
│   │       ├── bin/                 # Executables
│   │       └── tests/               # Service tests
│   ├── agents/                      # Integrated agent systems (from srv/agenticos)
│   │   ├── core/                    # Core agent implementations
│   │   ├── swarms/                  # Agent swarm configurations
│   │   ├── tools/                   # Agent tools and integrations
│   │   └── registry/                # Agent registry and metadata
│   ├── orchestration/               # Workflow and coordination logic
│   │   ├── workflows/               # Workflow definitions
│   │   ├── coordinators/            # Coordination services
│   │   └── schedulers/              # Task scheduling
│   ├── config/                      # Plane-specific configuration
│   │   ├── services/                # Service configurations
│   │   ├── agents/                  # Agent configurations
│   │   └── orchestration/           # Orchestration configs
│   ├── bin/                         # Control plane executables
│   └── logs/                        # Control plane logs (symlinked to shared)
├── deployed-plane-green/            # Production deployment plane - blue/green with zero downtime
│   ├── services/                    # Production services
│   │   ├── ui-dashboard/           # Port 9200 - Web interface
│   │   │   ├── src/                 # Source code
│   │   │   ├── config/              # Service configuration
│   │   │   ├── bin/                 # Executables
│   │   │   └── tests/               # Service tests
│   │   ├── llama-cpp/              # Port 9300 - Neural processing
│   │   │   ├── src/                 # Source code
│   │   │   ├── config/              # Service configuration
│   │   │   ├── bin/                 # Executables
│   │   │   └── tests/               # Service tests
│   │   └── databases/               # Database services
│   │       ├── postgresql/          # Port 5432 - Primary database
│   │       └── redis/               # Port 6379 - Cache layer
│   ├── releases/                    # Production releases
│   │   ├── current/                 # Current production release
│   │   ├── previous/                # Previous release (rollback)
│   │   └── artifacts/               # Release artifacts
│   ├── config/                      # Production configuration
│   │   ├── services/                # Service configurations
│   │   ├── security/                # Security configurations
│   │   └── monitoring/              # Monitoring configs
│   ├── bin/                         # Production executables
│   └── logs/                        # Production logs (symlinked to shared)
└── sandbox-plane-blue/              # Development and work environment - most data-heavy
    ├── services/                    # All services for development/testing
    │   ├── mcp-service/            # Development MCP service
    │   ├── claude-flow/            # Development Claude Flow
    │   ├── agentic-os/             # Development Agentic OS
    │   ├── ui-dashboard/           # Development UI Dashboard
    │   ├── llama-cpp/              # Development Llama.cpp
    │   └── databases/              # Development databases
    ├── workspaces/                  # Development workspaces
    │   ├── experiments/             # Experimental features
    │   ├── prototypes/              # Service prototypes
    │   └── integrations/            # Third-party integrations
    ├── agents/                      # Agent development and testing
    │   ├── development/             # Agent development
    │   ├── testing/                 # Agent testing
    │   └── benchmarks/              # Agent performance benchmarks
    ├── config/                      # Development configuration
    │   ├── services/                # Service development configs
    │   ├── agents/                  # Agent development configs
    │   └── testing/                 # Testing configurations
    ├── bin/                         # Development executables
    └── logs/                        # Development logs (symlinked to shared)
```

## Service Mapping to Infrastructure

| Service | Port | Plane | Purpose | Source |
|---------|------|-------|---------|--------|
| MCP Service | 8001 | coordinator-plane | Model Context Protocol coordination | packages/mcp-agent/ |
| Claude Flow | 9100 | coordinator-plane | AI workflow orchestration | packages/claude-flow-alpha/ |
| Agentic OS | 9400 | coordinator-plane | Agent system management | srv/agenticos/ |
| UI Dashboard | 9200 | deployed-plane-green | Web interface | packages/ui-dashboard/ |
| Llama.cpp | 9300 | deployed-plane-green | Neural processing | packages/llama.cpp/ |
| PostgreSQL | 5432 | deployed-plane-green | Primary database | infrastructure |
| Redis | 6379 | deployed-plane-green | Cache layer | infrastructure |

## Integration Points

### srv/agenticos Integration

**Source:** `srv/agenticos/`
**Destination:** `home-lab-server/agentic-homelab/coordinator-plane/agents/`

**Mapping:**
- `srv/agenticos/agents/` → `coordinator-plane/agents/core/`
- `srv/agenticos/artifacts/` → `shared/artifacts/`
- `srv/agenticos/bin/` → `coordinator-plane/bin/`
- `srv/agenticos/configs/` → `coordinator-plane/config/agents/`
- `srv/agenticos/data/` → `shared/state/`
- `srv/agenticos/logs/` → `shared/logs/coordinator-plane/`
- `srv/agenticos/tests/` → `coordinator-plane/agents/tests/`

### packages/ Integration

**Source:** `packages/*/`
**Destination:** `home-lab-server/agentic-homelab/{plane}/services/{service}/`

**Mapping:**
- `packages/mcp-agent/` → `coordinator-plane/services/mcp-service/`
- `packages/claude-flow-alpha/` → `coordinator-plane/services/claude-flow/`
- `packages/ui-dashboard/` → `deployed-plane-green/services/ui-dashboard/`
- `packages/llama.cpp/` → `deployed-plane-green/services/llama-cpp/`

## Symlink Strategy

### Log Symlinks
```bash
# Coordinator plane logs
ln -s ../../../shared/logs/coordinator-plane coordinator-plane/logs

# Deployed plane logs
ln -s ../../../shared/logs/deployed-plane deployed-plane-green/logs

# Sandbox plane logs
ln -s ../../../shared/logs/sandbox-plane sandbox-plane-blue/logs
```

### Shared State Symlinks
```bash
# Hive mind database
ln -s ../../shared/state/hive.db coordinator-plane/config/hive.db

# Memory systems database
ln -s ../../shared/state/memory.db coordinator-plane/config/memory.db
```

## Migration Strategy

### Phase 1: Structure Creation
1. Create new directory structure
2. Set up symlinks for shared resources
3. Copy configuration files to appropriate locations

### Phase 2: Content Migration
1. Move srv/agenticos content to coordinator-plane/agents/
2. Move packages/*/ content to appropriate service directories
3. Update all configuration files with new paths

### Phase 3: Validation
1. Verify all services can find their configurations
2. Test symlinks and shared resource access
3. Validate infrastructure alignment

## Benefits

1. **Failover Hierarchy**: Deployed (primary) → Coordinator (backup) → Sandbox (emergency)
2. **Resource Optimization**: Sandbox (data-heavy) → Coordinator (lightweight) → Deployed (balanced)
3. **Zero-Downtime Deployment**: Blue/green capability in deployed plane
4. **Clear Separation**: Services organized by deployment plane and function
5. **Shared Resources**: Common artifacts and state accessible across planes
6. **Infrastructure Alignment**: Direct mapping to INFRASTRUCTURE_OVERVIEW.md
7. **Automation Ready**: Structure supports Phase 0 hive mind and swarm integration
8. **Scalability**: Easy to add new services and planes
9. **Maintainability**: Logical organization reduces cognitive load

## Implementation Checklist

- [ ] Create base directory structure
- [ ] Set up shared resources (config, logs, state, models, artifacts)
- [ ] Create deployment planes (coordinator, deployed, sandbox)
- [ ] Set up service directories with proper structure
- [ ] Create symlinks for logs and shared state
- [ ] Migrate srv/agenticos content
- [ ] Migrate packages/*/ content
- [ ] Update configuration files
- [ ] Test service discovery and configuration loading
- [ ] Validate infrastructure alignment
- [ ] Update documentation

## Success Criteria

1. **Structural Integrity**: All directories created with correct permissions
2. **Symlink Functionality**: All symlinks resolve correctly
3. **Service Accessibility**: All services can find their configurations and dependencies
4. **Infrastructure Alignment**: Structure matches INFRASTRUCTURE_OVERVIEW.md
5. **Automation Support**: Structure enables Phase 0 automation requirements
6. **No Broken References**: All internal references updated to new paths</content>
<parameter name="filePath">/home/deflex/noa-server/docs/upgrade/FINAL_FOLDER_STRUCTURE.md
