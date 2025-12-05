# RTT Toolchain Utilities

**Supporting Tools for RTT Automation, Policy Management, and Solver Operations**

This directory contains the RTT toolchain - a collection of Python utilities that power the RTT automation pipeline, content-addressed storage operations, policy enforcement, and routing optimization.

## Overview

RTT tools provide the building blocks for:
- **Content-Addressed Storage (CAS)** - Ingesting, packing, and distributing agents
- **MCP Integration** - Ingesting and materializing Model Context Protocol tools
- **Plan Building** - Creating and verifying signed routing plans
- **Policy Enforcement** - Matching routes against ACL policies
- **Solver Operations** - Constraint solving and NUMA-aware placement
- **Cryptographic Signing** - Ed25519 signing and verification
- **View Management** - Provider overlays and materialization

## Tool Categories

### Content-Addressed Storage (CAS)

#### cas_ingest.py
Ingest agents into the content-addressed storage registry.

```bash
# Ingest multiple agents
python tools/cas_ingest.py agents/common/*.agent.json

# Output:
# [OK] search@1.0.0 -> .rtt/registry/cas/sha256/f073d7...json
# [OK] summarize@1.0.0 -> .rtt/registry/cas/sha256/bcbe05...json
# [OK] updated index -> .rtt/registry/index.json
```

**Purpose**: Store agents immutably by SHA256 hash, enabling deterministic routing and trust chain verification.

#### cas_pack.py
Create distributable packs from CAS registry.

```bash
# Create pack for distribution
python tools/cas_pack.py

# Output:
# [OK] wrote .rtt/registry/pack/agents.pack and index.lut
```

**Purpose**: Bundle agents for efficient distribution, deployment, and offline installation.

### MCP Integration

#### mcp_ingest.py
Ingest Model Context Protocol tools from providers.

```bash
# Ingest Claude MCP tools
python tools/mcp_ingest.py claude mcp/claude/tools.json

# Output:
# [OK] MCP claude/summarize@1.0.0 -> CAS sha256:9404eea...
# [OK] MCP claude/search@1.0.0 -> CAS sha256:93c94f7...
```

**Purpose**: Bridge MCP tools into RTT's content-addressed storage for unified agent orchestration.

#### agents_ingest.py
Register agent manifests in the CAS registry.

```bash
# Register agents
python tools/agents_ingest.py agents/common/*.agent.json
```

**Purpose**: Similar to `cas_ingest.py` but with additional validation and indexing for agent-specific metadata.

#### skills_ingest.py
Ingest skill definitions for capability-based routing.

```bash
# Register skills
python tools/skills_ingest.py skills/*.skill.json
```

**Purpose**: Enable capability-based autowiring by registering skill definitions that group related agent capabilities.

### View Management

#### view_materialize.py
Materialize provider-specific views with overlays.

```bash
# Materialize Claude provider view
python tools/view_materialize.py views/claude.view.json

# Output:
# [OK] claude materialized summarize_1.0.0.agent.json
# [OK] claude materialized search_1.0.0.agent.json
```

**Purpose**: Apply provider-specific patches and customizations to base agent definitions.

#### view_to_rtt.py
Convert provider views to RTT format.

```bash
# Convert view to RTT format
python tools/view_to_rtt.py views/openai.view.json
```

**Purpose**: Translate provider-specific view formats into RTT's canonical representation.

#### sign_view.py
Cryptographically sign provider views.

```bash
# Sign view with Ed25519
python tools/sign_view.py views/claude.view.json mykey
```

**Purpose**: Ensure view integrity and authenticity using Ed25519 signatures.

#### verify_view.py
Verify view signatures and integrity.

```bash
# Verify view signature
python tools/verify_view.py views/claude.view.json
```

**Purpose**: Validate cryptographic signatures before materializing provider views.

#### apply_overlay.py
Apply overlays to base agent definitions.

```bash
# Apply provider-specific overlay
python tools/apply_overlay.py base.agent.json overlay.json
```

**Purpose**: Merge provider customizations (QoS, capabilities, metadata) with base agent definitions.

### Plan Management

#### plan_build.py
Build signed routing plans with autowiring support.

```bash
# Build plan with autowiring
python tools/plan_build.py .rtt/routes.json .rtt/manifests/ mykey agents/ claude skills/ --autowire

# Output:
# [OK] wrote plans/sha256-6b9ac723fd36ec81.json
```

**Purpose**: Generate deterministic routing plans with cryptographic signatures, supporting both manual routes and automatic capability-based wiring.

**Features**:
- Autowire agents to MCP tools by name matching
- Skill-based capability matching
- Invariant checking (no self-loops, no missing endpoints)
- Deterministic plan ID generation (SHA256 hash)
- Ed25519 cryptographic signing

#### plan_verify.py
Verify plan signatures and integrity.

```bash
# Verify plan signature
python tools/plan_verify.py plans/latest.plan.json

# Output:
# [OK] Plan signature valid
```

**Purpose**: Validate plan authenticity before application, ensuring plans haven't been tampered with.

### Policy Enforcement

#### policy_match.py
Match routes against ACL policies.

```python
from tools.policy_match import allowed

policy = {
    "allow": [
        {"from": "rtt://agent/*", "to": "rtt://mcp/claude/*"}
    ]
}

# Check if route is allowed
if allowed(policy, "rtt://agent/api/search@1.0.0", "rtt://mcp/claude/tool/search@1.0.0"):
    print("Route allowed")
```

**Purpose**: Enforce security policies using wildcard pattern matching for source and destination addresses.

### Solver & Optimization

#### solver_constraints.py
Constraint solving for route admission and lane selection.

```python
from tools.solver_constraints import supports_lane, LANE_BASE_LAT_MS

# Check if agent supports shared memory transport
if supports_lane(agent_manifest, 'shm'):
    latency = LANE_BASE_LAT_MS['shm']  # 0.1ms
```

**Purpose**:
- Determine feasible transport lanes (SHM, UDS, TCP)
- Compute base latency for each lane type
- Enforce QoS constraints (latency budget, throughput)

**Lane Latencies**:
- `shm`: 0.1ms (shared memory, same NUMA node only)
- `uds`: 0.5ms (Unix domain sockets)
- `tcp`: 2.0ms (network transport)

#### solver_placement.py
NUMA-aware placement optimization with churn minimization.

```python
from tools.solver_placement import optimize

place, lane_map, cost = optimize(
    manifests=manifests,
    routes=routes,
    topology=numa_topology,
    prev_place=previous_placement,
    prev_lanes=previous_lanes,
    prefer=['shm', 'uds', 'tcp'],
    churn_weight=0.5,
    change_threshold_ms=0.2
)
```

**Purpose**:
- Optimize agent placement across NUMA nodes
- Minimize cross-NUMA communication latency (0.4ms penalty)
- Select optimal transport lanes based on placement
- Minimize churn (unnecessary agent moves)
- Enforce capacity constraints (CPU, memory)

**Features**:
- **Initial placement**: Seeds from previous placement, then topology hints, then round-robin
- **Pack feasibility**: Ensures node capacity not exceeded
- **Local search**: Iteratively improves placement to reduce cost
- **Lane stability**: Keeps previous lanes if improvement < threshold
- **Churn penalty**: Weighted cost for moving agents between nodes

### Cryptography

#### keys_ed25519.py
Generate Ed25519 key pairs for signing.

```bash
# Generate new key pair
python tools/keys_ed25519.py mykey

# Output:
# [OK] Generated .rtt/registry/keys/private/mykey.priv
# [OK] Generated .rtt/registry/keys/public/mykey.pub
```

**Purpose**: Create cryptographic keys for signing plans, views, and agents.

#### ed25519_helper.py
Ed25519 signing and verification utilities.

```python
from tools.ed25519_helper import sign, verify

# Sign message
signature = sign(private_key, message_bytes)

# Verify signature
is_valid = verify(public_key, message_bytes, signature)
```

**Purpose**: Low-level cryptographic operations for RTT's trust chain.

### Utilities

#### json_canon.py
Canonical JSON serialization for deterministic hashing.

```python
from tools.json_canon import canonicalize

# Produces deterministic byte representation
canonical_bytes = canonicalize({"z": 1, "a": 2})  # {"a":2,"z":1}
```

**Purpose**: Ensure identical objects always hash to same SHA256, critical for content-addressed storage.

#### semver.py
Semantic versioning utilities.

```python
from tools.semver import parse, satisfies

version = parse("1.2.3")
if satisfies(version, ">=1.0.0 <2.0.0"):
    print("Compatible")
```

**Purpose**: Version constraint checking for agent dependencies.

#### invariants_check.py
Verify routing invariants and consistency.

```bash
# Check invariants
python tools/invariants_check.py .rtt/routes.json .rtt/manifests/

# Output:
# [OK] No self-loops
# [OK] No duplicate routes
# [OK] All endpoints exist
```

**Purpose**: Validate routing configuration before plan generation, catching errors early.

#### project_providers.py
Project provider metadata for multi-provider support.

```bash
# List supported providers
python tools/project_providers.py

# Output:
# claude
# openai
# mistral
```

**Purpose**: Enumerate available MCP providers for integration.

## Integration with Automation Pipeline

RTT tools are orchestrated by the automation pipeline in `auto/`:

```bash
# Stage 1: Bootstrap (creates directories)
python auto/00-bootstrap.py

# Stage 2: Scan (uses cas_ingest internally)
python auto/10-scan_symbols.py

# Stage 3: Dependency checking
python auto/20-depdoctor.py

# Stage 4: Connector generation
python auto/30-generate_connectors.py

# Stage 5: Plan solving (uses solver_placement.py)
python auto/40-plan_solver.py

# Stage 6: Plan application
python auto/50-apply_plan.py
```

See `auto/README.md` for complete pipeline documentation.

## Common Workflows

### Workflow 1: Register New Agent

```bash
# 1. Ingest agent into CAS
python tools/cas_ingest.py agents/my_new_agent.agent.json

# 2. Add route to routes.json
# Edit .rtt/routes.json manually or use plan_build.py --autowire

# 3. Build new plan
python tools/plan_build.py .rtt/routes.json .rtt/manifests/ mykey agents/ claude

# 4. Verify plan
python tools/plan_verify.py plans/latest.plan.json

# 5. Apply plan
python auto/50-apply_plan.py
```

### Workflow 2: Add MCP Provider

```bash
# 1. Ingest MCP tools
python tools/mcp_ingest.py newprovider mcp/newprovider/tools.json

# 2. Create provider view
# Edit views/newprovider.view.json

# 3. Sign view
python tools/sign_view.py views/newprovider.view.json mykey

# 4. Materialize view
python tools/view_materialize.py views/newprovider.view.json

# 5. Rebuild plan with new routes
python tools/plan_build.py .rtt/routes.json .rtt/manifests/ mykey agents/ newprovider
```

### Workflow 3: Optimize Placement

```bash
# 1. Define NUMA topology
# Create topology.json with node capacities

# 2. Run placement optimization
python tools/solver_placement.py --topology topology.json

# 3. Rebuild plan with optimized placement
python tools/plan_build.py .rtt/routes.json .rtt/manifests/ mykey agents/ claude
```

## Schema Validation

All tools respect RTT schemas in `schemas/`:
- `rtt.symbol.schema.json` - Agent manifests
- `rtt.policy.schema.json` - Policy definitions
- `rtt.routes.schema.json` - Route configurations

Run validation:
```bash
python tests/validate.py
```

## Error Handling

Tools follow consistent error reporting:
- `[OK]` prefix for successful operations
- `[FAIL]` prefix for errors
- Exit code 0 on success, non-zero on failure
- JSON output for programmatic consumption

Example error:
```
[FAIL] Missing key 'symbol' in .rtt/manifests/broken.json
```

## Related Documentation

- **[auto/README.md](../auto/README.md)** - Automation pipeline
- **[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)** - System architecture
- **[docs/API-REFERENCE.md](../docs/API-REFERENCE.md)** - Complete API reference
- **[tests/README.md](../tests/README.md)** - Testing and validation
- **[README.md](../README.md)** - RTT overview

---

**RTT Toolchain** - Production-grade utilities for content-addressed agent orchestration.
