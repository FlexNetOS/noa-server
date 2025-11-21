# RTT Automation Pipeline

## Overview

The RTT automation pipeline provides a 6-stage zero-configuration workflow for agent discovery, dependency resolution, connector generation, optimal routing, and atomic deployment. Each stage builds upon the previous, creating a comprehensive automated path from agent manifests to production deployment.

## Pipeline Architecture

```
00-bootstrap.py → 10-scan_symbols.py → 20-depdoctor.py → 30-generate_connectors.py → 40-plan_solver.py → 50-apply_plan.py
      │                    │                    │                      │                       │                   │
   Initialize          Discover             Validate              Generate               Optimize             Deploy
   Environment         Symbols             Dependencies          Connectors              Routes              Atomically
```

## Stage 00: Bootstrap (Environment Initialization)

**File**: `/home/deflex/rtt/rtt-v1/rtt-final/auto/00-bootstrap.py`

**Purpose**: Initialize the RTT runtime environment by creating all required directories.

**Actions**:
- Creates `.rtt/cache/` for runtime cache
- Creates `.rtt/wal/` for write-ahead log
- Creates `.rtt/sockets/` for Unix domain sockets
- Creates `.rtt/manifests/` for agent manifests
- Creates `.rtt/drivers/` for connector drivers
- Creates `.rtt/tuned/` for tuned configurations

**Usage**:
```bash
cd /home/deflex/rtt/rtt-v1/rtt-final
python3 auto/00-bootstrap.py
```

**Output**:
```
[OK] Bootstrap complete: /home/deflex/rtt/rtt-v1/rtt-final
```

**When to Run**:
- First time setup
- After cleaning runtime directories
- Before running any other pipeline stage

**Exit Codes**:
- 0: Success
- Non-zero: Directory creation failure

---

## Stage 10: Scan Symbols (Symbol Discovery)

**File**: `/home/deflex/rtt/rtt-v1/rtt-final/auto/10-scan_symbols.py`

**Purpose**: Discover and catalog all agent symbols from manifests in the workspace.

**Actions**:
- Scans `agents/`, `providers/`, `.rtt/manifests/` directories
- Extracts symbol definitions from agent manifest files
- Validates symbol schema compliance
- Creates symbol registry for routing

**Usage**:
```bash
cd /home/deflex/rtt/rtt-v1/rtt-final
python3 auto/10-scan_symbols.py
```

**Input Files**:
- `agents/**/*.agent.json` - Agent manifests
- `providers/**/*.json` - Provider configurations
- `.rtt/manifests/*.json` - Runtime manifests

**Output**:
- Symbol registry (in-memory or cached)
- Discovered agent count
- Symbol collision warnings

**Schema Validation**:
Uses `schemas/rtt.symbol.schema.json` to validate:
- Symbol name format
- Protocol specifications
- Interface contracts
- Version constraints

**When to Run**:
- After adding new agent manifests
- After updating agent definitions
- Before running dependency validation
- During continuous integration

---

## Stage 20: DepDoctor (Dependency Validation)

**File**: `/home/deflex/rtt/rtt-v1/rtt-final/auto/20-depdoctor.py`

**Purpose**: Validate all agent dependencies and detect missing or incompatible components.

**Actions**:
- Analyzes dependency graphs across all discovered agents
- Detects missing dependencies
- Identifies version conflicts
- Validates protocol compatibility
- Checks circular dependencies
- Reports unresolved symbols

**Usage**:
```bash
cd /home/deflex/rtt/rtt-v1/rtt-final
python3 auto/20-depdoctor.py
```

**Input**:
- Symbol registry from Stage 10
- Agent dependency declarations
- Version constraints

**Output**:
- Dependency health report
- List of missing components
- Compatibility warnings
- Suggested resolutions

**Validation Types**:
1. **Existence Check**: All referenced symbols exist
2. **Version Check**: Semantic version compatibility
3. **Protocol Check**: Interface contract matching
4. **Circular Check**: No circular dependency chains
5. **Capability Check**: Required capabilities available

**Exit Codes**:
- 0: All dependencies valid
- 1: Missing dependencies detected
- 2: Version conflicts detected
- 3: Circular dependencies detected

**When to Run**:
- After symbol discovery
- Before connector generation
- During CI/CD validation
- Before production deployment

---

## Stage 30: Generate Connectors (Auto-Connector Generation)

**File**: `/home/deflex/rtt/rtt-v1/rtt-final/auto/30-generate_connectors.py`

**Purpose**: Automatically generate connector code for missing or updated agent integrations.

**Actions**:
- Analyzes agent interfaces and required connectors
- Generates language-specific connector stubs
- Creates protocol adapters
- Produces boilerplate integration code
- Validates generated code syntax

**Usage**:
```bash
cd /home/deflex/rtt/rtt-v1/rtt-final
python3 auto/30-generate_connectors.py
```

**Input**:
- Symbol registry
- Dependency graph
- Language templates from `stubs/`

**Output**:
- Generated connector files in `.rtt/drivers/`
- Python connectors: `.rtt/drivers/python/*.py`
- Go connectors: `.rtt/drivers/go/*.go`
- Node.js connectors: `.rtt/drivers/node/*.js`
- Rust connectors: `.rtt/drivers/rust/*.rs`

**Template Sources**:
- `stubs/python/` - Python connector templates
- `stubs/javascript/` - JavaScript connector templates
- `stubs/typescript/` - TypeScript connector templates
- `stubs/go/` - Go connector templates
- `stubs/rust/` - Rust connector templates
- (+ 68 more language stubs)

**Generation Strategy**:
1. Parse agent interface definition
2. Select appropriate language template
3. Fill template with agent-specific parameters
4. Generate protocol marshaling code
5. Add error handling and logging
6. Validate generated code syntax

**When to Run**:
- After dependency validation passes
- When adding new agents
- When agent interfaces change
- Before plan generation

---

## Stage 40: Plan Solver (Optimal Routing Computation)

**File**: `/home/deflex/rtt/rtt-v1/rtt-final/auto/40-plan_solver.py`

**Purpose**: Compute optimal routing plan using constraint solving with QoS, NUMA, and policy awareness.

**Actions**:
- Loads current routes from `.rtt/routes.json`
- Loads policy constraints from `.rtt/policy.json`
- Analyzes available connectors and capabilities
- Computes optimal routing using constraint solver
- Applies NUMA-aware placement optimization
- Enforces QoS requirements
- Applies policy filters (ACLs, pins, failover)
- Generates deterministic routing plan

**Usage**:
```bash
cd /home/deflex/rtt/rtt-v1/rtt-final
python3 auto/40-plan_solver.py
```

**Input Files**:
- `.rtt/routes.json` - Desired route state
- `.rtt/policy.json` - Policy constraints (ACL, QoS, pins)
- Symbol registry
- Connector availability
- System topology (NUMA, CPU, memory)

**Output Files**:
- `plans/*.plan.json` - Generated routing plan
- `plans/LATEST` - Symlink to latest plan
- Plan signature (Ed25519)

**Solver Strategy**:
1. **ILP Formulation**: Integer Linear Programming for exact solutions
2. **Constraint Propagation**: Eliminate infeasible routes early
3. **NUMA Awareness**: Minimize cross-NUMA communication
4. **QoS Optimization**: Prioritize latency/throughput requirements
5. **Policy Enforcement**: Hard constraints from policy.json
6. **Cost Minimization**: Optimize for resource usage

**Optimization Objectives** (in priority order):
1. Satisfy all hard policy constraints
2. Minimize QoS violations
3. Optimize NUMA locality
4. Minimize total communication cost
5. Maximize failover redundancy

**Plan Format**:
```json
{
  "version": "1.0.0",
  "timestamp": "2025-10-27T12:00:00Z",
  "routes": [
    {
      "from": "agent.api.metrics",
      "to": "agent.storage.tsdb",
      "via": "shm",
      "numa_node": 0,
      "qos": {"latency_ms": 5, "throughput_mbps": 1000}
    }
  ],
  "signature": "ed25519:..."
}
```

**When to Run**:
- After connector generation
- When routes.json changes
- When policy.json updates
- Before atomic deployment
- During rebalancing

---

## Stage 50: Apply Plan (Atomic 2PC Application)

**File**: `/home/deflex/rtt/rtt-v1/rtt-final/auto/50-apply_plan.py`

**Purpose**: Atomically apply routing plan using two-phase commit (2PC) protocol.

**Actions**:
- Loads plan from `plans/LATEST` or specified plan file
- Verifies plan signature (Ed25519)
- Validates plan against current system state
- Performs dry-run validation
- Executes two-phase commit:
  - **Phase 1 (PREPARE)**: Lock resources, validate preconditions
  - **Phase 2 (COMMIT)**: Apply changes atomically or ROLLBACK
- Updates `.rtt/wal/*.wal.json` with change log
- Activates new routing configuration
- Verifies post-deployment state

**Usage**:
```bash
cd /home/deflex/rtt/rtt-v1/rtt-final
python3 auto/50-apply_plan.py
```

**Optional Arguments**:
```bash
# Specify plan file
python3 auto/50-apply_plan.py --plan plans/specific-plan.plan.json

# Dry-run mode (validation only)
python3 auto/50-apply_plan.py --dry-run

# Skip signature verification (development only)
python3 auto/50-apply_plan.py --no-verify
```

**Input**:
- `plans/LATEST` or specified plan file
- Current routing state
- `.rtt/registry/trust/keys/*.pub` - Public keys for verification

**Output**:
- `.rtt/wal/*.wal.json` - Write-ahead log entry
- Updated `.rtt/routes.json` (current state)
- `plans/last_applied.json` - Backup of applied plan

**Two-Phase Commit Protocol**:

**Phase 1: PREPARE**
1. Validate plan signature
2. Check plan schema compliance
3. Lock all affected resources
4. Verify preconditions (dependencies, capabilities)
5. Allocate required resources
6. All participants vote READY or ABORT

**Phase 2: COMMIT or ROLLBACK**
- If all READY: Apply changes atomically
- If any ABORT: Rollback all changes
- Log outcome to WAL
- Release all locks

**Safety Guarantees**:
- **Atomicity**: All changes apply or none do
- **Consistency**: System never in invalid state
- **Isolation**: Concurrent plans don't interfere
- **Durability**: Applied plans persisted to WAL

**Failure Handling**:
- Coordinator failure: Automatic recovery from WAL
- Participant failure: Rollback entire transaction
- Network partition: Fail-safe to previous state
- Corrupted plan: Reject before any changes

**When to Run**:
- After successful plan generation
- During scheduled deployments
- For configuration updates
- After policy changes
- During disaster recovery

---

## Complete Pipeline Execution

### Full Automation Workflow

Run the complete pipeline in sequence:

```bash
#!/bin/bash
cd /home/deflex/rtt/rtt-v1/rtt-final

# Stage 00: Initialize environment
python3 auto/00-bootstrap.py || exit 1

# Stage 10: Discover all agent symbols
python3 auto/10-scan_symbols.py || exit 2

# Stage 20: Validate dependencies
python3 auto/20-depdoctor.py || exit 3

# Stage 30: Generate missing connectors
python3 auto/30-generate_connectors.py || exit 4

# Stage 40: Compute optimal routing plan
python3 auto/40-plan_solver.py || exit 5

# Stage 50: Apply plan atomically
python3 auto/50-apply_plan.py || exit 6

echo "[OK] Pipeline complete: RTT is fully deployed"
```

### Incremental Workflow

For iterative development, run only changed stages:

```bash
# After adding new agents
python3 auto/10-scan_symbols.py
python3 auto/20-depdoctor.py
python3 auto/40-plan_solver.py
python3 auto/50-apply_plan.py

# After policy changes
python3 auto/40-plan_solver.py
python3 auto/50-apply_plan.py

# After route changes
python3 auto/40-plan_solver.py
python3 auto/50-apply_plan.py
```

---

## Pipeline Dependencies

```
Stage 00 (Bootstrap)
    └── Required: None
    └── Creates: Runtime directories

Stage 10 (Scan)
    └── Required: Stage 00
    └── Input: Agent manifests
    └── Output: Symbol registry

Stage 20 (DepDoctor)
    └── Required: Stage 10
    └── Input: Symbol registry
    └── Output: Dependency report

Stage 30 (Generate)
    └── Required: Stage 20
    └── Input: Dependency graph, stubs/
    └── Output: Generated connectors

Stage 40 (Solver)
    └── Required: Stage 30
    └── Input: Routes, policy, connectors
    └── Output: Routing plan

Stage 50 (Apply)
    └── Required: Stage 40
    └── Input: Routing plan
    └── Output: Active configuration
```

---

## Integration with Other Tools

### With MCP Ingestion
```bash
# Ingest MCP tools first
python3 tools/mcp_ingest.py claude mcp/claude/tools.json

# Then run pipeline
python3 auto/10-scan_symbols.py
python3 auto/40-plan_solver.py
python3 auto/50-apply_plan.py
```

### With CAS (Content-Addressed Storage)
```bash
# Ingest agents into CAS
python3 tools/cas_ingest.py agents/common/*.agent.json

# Run pipeline with CAS-backed agents
python3 auto/10-scan_symbols.py
python3 auto/40-plan_solver.py
python3 auto/50-apply_plan.py
```

### With Signed Plans
```bash
# Generate plan with signing
python3 auto/40-plan_solver.py

# Sign plan manually (if needed)
python3 tools/sign_view.py plans/LATEST

# Apply signed plan
python3 auto/50-apply_plan.py
```

---

## Troubleshooting

### Bootstrap Fails
```
Error: Permission denied creating .rtt/cache/
Solution: Check directory permissions, run with appropriate user
```

### Scan Symbols Fails
```
Error: Invalid agent manifest format
Solution: Validate manifest against schemas/rtt.symbol.schema.json
```

### DepDoctor Fails
```
Error: Missing dependency 'agent.api.auth'
Solution: Add missing agent or remove dependency
```

### Generate Connectors Fails
```
Error: No template found for language 'xyz'
Solution: Check stubs/ directory for language template
```

### Plan Solver Fails
```
Error: No feasible solution found
Solution: Relax QoS constraints or add more resources
```

### Apply Plan Fails
```
Error: Plan signature verification failed
Solution: Regenerate plan with valid signing key
```

---

## Performance Optimization

### Parallel Execution
The pipeline stages are sequential, but individual operations within stages can be parallelized:

- Stage 10: Scan manifests in parallel
- Stage 20: Validate dependencies concurrently
- Stage 30: Generate connectors in parallel
- Stage 40: Solver can use multiple threads
- Stage 50: 2PC prepare phase can parallelize participant coordination

### Caching
- Stage 10: Cache symbol registry between runs
- Stage 30: Reuse generated connectors if unchanged
- Stage 40: Cache solver intermediate results

### Incremental Updates
Skip unchanged stages when possible:
- Agent changes: Run 10 → 20 → 40 → 50
- Policy changes: Run 40 → 50
- Route changes: Run 40 → 50

---

## Monitoring and Observability

### Pipeline Metrics
- Execution time per stage
- Symbol count discovered
- Dependency validation errors
- Connectors generated
- Plan optimality score
- 2PC success rate

### Logging
Each stage outputs structured logs:
```
[Stage] [Level] Message
[00] [INFO] Bootstrap complete
[10] [INFO] Discovered 42 symbols
[20] [WARN] Dependency 'xyz' version mismatch
[30] [INFO] Generated 12 connectors
[40] [INFO] Plan generated with cost 150
[50] [INFO] Plan applied successfully
```

### Telemetry Integration
Pipeline integrates with RTT flight recorder:
```bash
# View pipeline execution history
python3 telemetry/flight_recorder/flight.py --filter pipeline
```

---

## Security Considerations

### Plan Signing
All plans generated by Stage 40 are signed with Ed25519:
- Private key: `.rtt/registry/trust/keys/signer.priv`
- Public key: `.rtt/registry/trust/keys/signer.pub`

### Signature Verification
Stage 50 verifies plan signatures before application:
- Prevents unauthorized plan modification
- Ensures plan integrity
- Supports multiple trusted signers

### Policy Enforcement
Stage 40 enforces policy constraints:
- ACL: Access control lists for agents
- QoS: Quality of service requirements
- Pins: Fixed routing decisions
- Failover: Redundancy and fault tolerance

---

## CI/CD Integration

### GitHub Actions
```yaml
name: RTT Pipeline
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Bootstrap
        run: python3 auto/00-bootstrap.py
      - name: Scan Symbols
        run: python3 auto/10-scan_symbols.py
      - name: Validate Dependencies
        run: python3 auto/20-depdoctor.py
      - name: Generate Connectors
        run: python3 auto/30-generate_connectors.py
      - name: Generate Plan
        run: python3 auto/40-plan_solver.py
      - name: Validate Plan (Dry-Run)
        run: python3 auto/50-apply_plan.py --dry-run
```

### GitLab CI
```yaml
stages:
  - bootstrap
  - scan
  - validate
  - generate
  - plan
  - deploy

bootstrap:
  stage: bootstrap
  script:
    - python3 auto/00-bootstrap.py

scan:
  stage: scan
  script:
    - python3 auto/10-scan_symbols.py

validate:
  stage: validate
  script:
    - python3 auto/20-depdoctor.py

generate:
  stage: generate
  script:
    - python3 auto/30-generate_connectors.py

plan:
  stage: plan
  script:
    - python3 auto/40-plan_solver.py

deploy:
  stage: deploy
  script:
    - python3 auto/50-apply_plan.py
  only:
    - main
```

---

## Related Documentation

- **[../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)** - System architecture overview
- **[../docs/AGENT-COORDINATION.md](../docs/AGENT-COORDINATION.md)** - Agent coordination patterns
- **[../tools/README.md](../tools/README.md)** - Toolchain documentation
- **[../tests/README.md](../tests/README.md)** - Testing and validation
- **[../QUICKSTART.md](../QUICKSTART.md)** - Quick start guide
- **[../INSTALL.md](../INSTALL.md)** - Installation guide

---

**RTT Automation Pipeline** - Zero-Config Agent Orchestration
