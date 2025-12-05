Below is the complete PRD for your Relay Terminal Tool (RTT) with MCP integration, content-addressed registry, virtual provider views, and fully automated build-operate loops. It folds in your existing drop-ins and upgrades them to the top-tier pattern.

# Product Requirements Document — Relay Terminal Tool (RTT)

## 0) One-line intent

Local, deterministic connection fabric that discovers symbols, solves routes, wires lanes, and hot-swaps endpoints across multi-agent, multi-provider stacks without duplication.

## 1) Objectives

- Zero duplication of agents and tools across providers.
- Instant connect, disconnect, and reconnection with SLO guarantees.
- Deterministic plans, signed and reversible.
- Fully offline and local-first.
- Extensible via drivers with strict capability security.

## 2) Non-goals

- Cloud dependency.
- Hidden background network calls.
- Per-provider forks of agent files.

## 3) Users and environments

- Single node dev and workstation clusters.
- Multi-agent orchestrations with Claude, OpenAI, Mistral, others.
- Linux, macOS, Windows.

---

## 4) “Secret formula” applied

Specify → Prove → Generate → Measure → Autotune.

- **Specify**: formal state machine for scan→plan→2PC→verify→rollback.
- **Prove**: invariants checked with a lightweight model (TLA+ or SMT).
- **Generate**: constraint planner emits signed immutable plans.
- **Measure**: p50/p95/p99 histograms and breaker states from a flight recorder.
- **Autotune**: trace-driven sweeps produce machine-specific tuned profiles.

---

## 5) Scope and requirements

### 5.1 Functional

1. **Discovery**: scan folder trees, index manifests, produce a typed registry.
2. **Registry**: content-addressed (CAS). Every agent, tool, and contract stored once by hash with signature verification.
3. **Virtual provider views**: provider trees mounted as views of CAS with overlays. No duplication on disk.
4. **Planner**: constraint solver computes a deterministic route plan that meets type, version, QoS, ACL, locality, and pinning.
5. **Apply**: 2-phase commit of a signed plan. Atomic flip. Rollback on any NACK or SLO violation.
6. **Fabric**: SHM SPSC rings for hot data, UDS/Npipe for control, TCP loopback as legacy fallback.
7. **Observability**: always-on flight recorder with zero-alloc metrics per route.
8. **Security**: capabilities on every `open/tx/rx/close`, strict manifests and signed plans, driver sandboxing.
9. **Autotune**: replay traces, sweep knobs, save `.rtt/tuned/profile.json` keyed by machine fingerprint.
10. **MCP bridge**: import MCP tools, expose them as RTT symbols, route via RTT.
11. **Feature-flagged non-owned integrations**: any integration with applications or services not owned by FlexNetOS MUST be guarded by feature flags with A/B switching semantics, with monitored rollout and rollback. These flags exist to safely control blast radius and experimentation, not to arbitrarily restrict legitimate use.

### 5.2 Non-functional

- **Latency SLO**: control p99 ≤ 300 µs; SHM data path p99 ≤ 1.5 ms @ 64 KiB.
- **Determinism**: same inputs → same plan hash.
- **Recovery**: WAL replay to last committed graph after crash.
- **Compliance**: SBOM embedded; signed artifacts; reproducible builds.

---

## 6) Architecture

```
[Agents CAS + Packfile]
        │
   [View Engine] ── mounts ──> /providers/<prov>/.<prov>/agents   (VFS: FUSE or WinFsp)
        │                                   │
        ├──────────────┐                    └── MCP Server(s)
        │              │                          │
        ▼              ▼                          ▼
 [RTT Planner]   [RTT Panel]  ⇄  [RTT Fabric: SHM | UDS | TCP]  ⇄  Drivers/Services/Plugins
          ▲             │
          └─ signed plans ──────────► 2PC Apply + Merkle WAL
```

**Data formats**

- Control: Cap’n Proto or FlatBuffers over UDS/Npipe.
- Data: framed binary `{route_id, frame_id, len, crc32c} + payload`.

---

## 7) Data model and files

### Already in your drop-ins

- `.rtt/panel.yaml`, `.rtt/policy.json`, `.rtt/routes.json`
- `.rtt/manifests/*` samples, `.rtt/{wal,cache,sockets}/`
- `agents/common/*.agent.json` canonical agents
- `providers/providers.yaml` + projection script
- `connector-mcp/*` bridge config + tools→manifest generator

### Directories

```
.rtt/registry/
  cas/sha256/<hash>.json           # immutable, signed
  index.json                       # ids → hashes, versions
  pack/agents.pack                 # mmap packfile
  pack/index.lut                   # sha256 → {offset,len}
  trust/keys/*.pub                 # trusted signers

cue/                               # typed configs for panel, routes, policy
plans/                             # signed, content-addressed plans
spec/tla/                          # model + invariants
planner/                           # solver and plan generator
fabric/{shm,uds,tcp}/              # lanes
telemetry/flight_recorder/         # recorder + histograms
placement/numa/                    # topology and pinning
schedulers/                        # token buckets, EDF/CBS, WFQ
security/                          # caps, sandbox profiles
autotune/                          # trace runner + sweeps
chaos/                             # failure scenarios
ci/                                # offline test runners
```

---

## 8) APIs

### Planner

- `Plan Solve(desired, policy, contracts, topology) -> Plan{hash, steps[], sign}`
- `Plan Verify(Plan) -> {ok, reason}`

### Panel

- `Apply(PlanHash)`
- `Rollback(SeqNo)`
- `QuickConnect(from, to)`
- `Health(selector) -> stream sample{p95, qdepth, drops, breaker}`
- `Audit(query) -> events`

### Connector driver

- `Probe(root) -> [Symbol]`
- `Open(Symbol, params) -> Link`
- `Tx(Link, frame)` / `Rx(Link) -> frame`
- `Close(Link)`
- `Health(Link)`

---

## 9) Security

- Manifests and plans must be signed (Ed25519).
- Capabilities bound to `saddr`, verb, scope, expiry.
- Drivers run out-of-process, minimal OS profile, no network by default.
- Strict mode refuses unsigned or unknown signers.
- Merkle-chained WAL for tamper evidence.

---

## 10) Observability

- Per-route histograms: p50/p95/p99, queue depth, drop reason, breaker state.
- eBPF/ETW syscall counters on hot paths.
- One-shot “flight recorder” dump: `rtt tap --flight 5s > flight.ndjson`.

---

## 11) Performance strategy

- SHM SPSC rings with power-of-two slots, length-prefix, atomics only.
- NUMA pairing and thread pinning.
- Busy-poll optional for sub-ms budgets.
- Admission via token buckets sized from QoS.
- Coalesce within ≤ 200 µs window when needed.

---

## 12) Automation: agents, tools, skills

### Core agents

- **SpecAgent**: maintain TLA+/invariants; emits invariant checks.
- **RegistryAgent**: ingest manifests to CAS, sign, pack, update index.
- **ViewFSAgent**: mount provider views from CAS with overlays.
- **PlannerAgent**: solve constraints, emit signed plans.
- **ReconcilerAgent**: apply 2PC, manage WAL, perform rollback.
- **FabricAgent**: configure SHM/UDS lanes, enforce schedulers.
- **TelemetryAgent**: collect histograms, expose flight recorder, SLO gates.
- **ChaosAgent**: schedule kill/slow/corrupt tests.
- **AutotuneAgent**: replay traces, sweep knobs, persist tuned profile.
- **ComplianceAgent**: generate SBOM, verify signatures, freeze build.
- **MCPBridgeAgent**: import MCP tools, generate RTT manifests, maintain provider views.
- **KeyMgmtAgent**: rotate keys, manage trusted signer list.

### Skills and tools

- CUE validation, Cap’n Proto schema gen, Ed25519 sign/verify, TLA+ check, SMT fallback for constraints, mmap packfile build, FUSE/WinFsp view mount, NUMA probe, eBPF/ETW capture, chaos hooks, perf guardrails.

### Orchestration DAG (concept)

``````mermaid
flowchart TD
  A[SpecAgent] --> B[RegistryAgent]
  B --> C[ViewFSAgent]
  B --> D[PlannerAgent]
  D --> E[ReconcilerAgent]
  E --> F[FabricAgent]
  F --> G[TelemetryAgent]
  G --> H[AutotuneAgent]
  ---

  ### Implementation Plan (inlined from historical `DELIVERY-PLAN.md`)

  The block below is a verbatim inlined copy of the original v1.0.0 implementation plan,
  normalized to use the canonical `rtt-gateway/` delivery root instead of the earlier
  `rtt-final/` name. All semantics and steps are preserved.

  `````markdown
  ## Implementation Plan

  ### Phase 1: Prepare rtt-gateway Structure

  ```bash
  # Create clean directory
  mkdir -p rtt-gateway

  # Copy all production directories
  rsync -av --exclude='.git' --exclude='rtt/' --exclude='matrix-skelton.tar.gz' \
    --exclude='rtt_elite_addon/' --exclude='tools/__pycache__' \
    --exclude='.rtt/cache/' --exclude='.rtt/wal/*.json' \
    --exclude='plans/*.plan.json' --exclude='plans/LATEST' \
    . rtt-gateway/

  # Create archive for reference materials
  mkdir -p archive
  mv rtt/ matrix-skelton.tar.gz archive/ 2>/dev/null || true
``````

### Phase 2: Add Missing Production Files

#### 2.1 Create .gitignore

```gitignore
# Runtime artifacts
.rtt/cache/
.rtt/wal/*.wal.json
.rtt/wal/LATEST
.rtt/registry/cas/sha256/*.json
.rtt/manifests/*.json
!.rtt/manifests/core.*.json
!.rtt/manifests/idp.*.json
!.rtt/manifests/obs.*.json
!.rtt/manifests/ui.*.json

# Plans (runtime generated)
plans/*.plan.json
plans/LATEST
plans/dep.unify.json

# Temporary directories
rtt_elite_addon/
tmp/
temp/

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
*.egg-info/
dist/
build/

# Rust
target/
Cargo.lock
**/*.rs.bk

# Go
*.exe
*.test
*.prof

# Node
node_modules/
npm-debug.log
yarn-error.log

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/
```

#### 2.2 Create Comprehensive README.md

```markdown
# Relay Terminal Tool (RTT) v1.0.0

**Production-Ready Multi-Agent Connection Fabric with Content-Addressed Storage and Deterministic Routing**

RTT is a sophisticated agent orchestration platform that provides:

- 🔒 Content-Addressed Storage with cryptographic verification
- 🎯 Deterministic constraint-based routing
- 🌐 Multi-provider MCP integration
- 📦 NUMA-aware placement optimization
- 🔐 Ed25519 signed plans and manifests
- 🚀 Zero-config automation pipeline
- 🌍 73 language connector stubs

## Quick Start

See [QUICKSTART.md](QUICKSTART.md) for immediate getting started guide.

## Documentation

- **[INSTALL.md](INSTALL.md)** - Detailed installation guide
- **[QUICKSTART.md](QUICKSTART.md)** - Quick start tutorial
- **[docs/](docs/)** - Comprehensive technical documentation
- **[validation-report.md](validation-report.md)** - Production validation results

## Features

### Content-Addressed Storage (CAS)

- SHA256-based immutable storage for agents and artifacts
- Pack/unpack for efficient distribution
- Trust chain with public key infrastructure

### Deterministic Routing

- Constraint solver with QoS awareness
- NUMA-aware placement optimization
- ILP admission control for exact solutions
- Policy-based route filtering

### Multi-Provider MCP Integration

- Claude, OpenAI, Mistral support
- MCP-to-RTT protocol bridge
- Tool ingestion pipeline
- Skills abstraction layer

### Production Components

- Native Rust planner for high performance
- Shared memory fabric for zero-copy IPC
- Ed25519 signers in Rust and Go
- Multi-language connector drivers

### Automation Pipeline

Six-stage zero-config automation:

1. Bootstrap - Initialize environment
2. Scan - Discover symbols
3. DepDoctor - Validate dependencies
4. Generate - Auto-create connectors
5. Solver - Compute optimal plan
6. Apply - Atomic 2PC application

## Architecture
```

┌─────────────────────────────────────────────┐
│ Application / Agents │
└────────────────┬────────────────────────────┘
│
┌────────────────▼────────────────────────────┐
│ RTT Routing Fabric │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ SHM │ │ UDS │ │ TCP │ │
│ └──────────┘ └──────────┘ └──────────┘ │
└────────────────┬────────────────────────────┘
│
┌────────────────▼────────────────────────────┐
│ Content-Addressed Storage (CAS) │
│ SHA256 → Agent/Tool Definitions │
└────────────────┬────────────────────────────┘
│
┌────────────────▼────────────────────────────┐
│ Constraint Solver & Planner │
│ QoS + NUMA + Policy + ILP │
└─────────────────────────────────────────────┘

````

## System Requirements

- **OS**: Linux, macOS, WSL2
- **Python**: 3.8+
- **Rust**: 1.70+ (for native components)
- **Go**: 1.19+ (for Go signer)
- **Node.js**: 18+ (for Node drivers)

## Installation

```bash
# Clone repository
1. **Ingest**: RegistryAgent writes into CAS, builds packfile, updates index.
cd rtt-v1

# Install Python dependencies
pip install -r requirements.txt

# Build native components (optional)
make build-native

# Initialize RTT
python auto/00-bootstrap.py
````

See [INSTALL.md](INSTALL.md) for detailed instructions.

## Usage

### Basic Usage

```bash
# Scan and discover agents
python auto/10-scan_symbols.py

# Generate routing plan
python auto/40-plan_solver.py

# Apply plan atomically
python auto/50-apply_plan.py
```

### MCP Integration

```bash
# Ingest MCP tools
python tools/mcp_ingest.py claude mcp/claude/tools.json

# Materialize provider view
python tools/view_materialize.py views/claude.view.json
```

### Content-Addressed Storage

```bash
# Ingest agents into CAS
python tools/cas_ingest.py agents/common/*.agent.json

# Create pack for distribution
python tools/cas_pack.py
```

## Configuration

Edit `.rtt/panel.yaml` for panel configuration:

```yaml
api:
  listen:
    unix: ./.rtt/sockets/panel.sock
scan:
  roots: [./agents, ./providers]
routing:
  prefer: [shm, uds, tcp]
```

## Production Deployment

### With Systemd

```bash
# Install service
sudo cp systemd/rtt-panel.service /etc/systemd/system/
sudo systemctl enable rtt-panel
sudo systemctl start rtt-panel
```

### With Kubernetes

```bash
# Deploy Gatekeeper policies
helm install gatekeeper charts/gatekeeper-planbins/
```

### With Docker

```bash
# Build image
2. **Project**: ViewFSAgent mounts provider trees as views; MCPBridgeAgent imports tools.

# Run container
3. **Plan**: PlannerAgent solves constraints → signed plan.
```

## Language Support

RTT provides connector stubs for 73 programming languages in `stubs/`:

**Systems**: C, C++, Rust, Go, D
**Enterprise**: Java, C#, Scala, Kotlin
**Scripting**: Python, Ruby, Perl, PHP, Lua, PowerShell, Bash
**Functional**: Haskell, OCaml, F#, Clojure, Erlang
**Web**: JavaScript, TypeScript, HTML, CSS, Vue, React
**Data**: SQL, R, Julia
**Mobile**: Swift, Kotlin, Dart

## Security

- Ed25519 cryptographic signing for all plans and views
- Content-addressable storage ensures integrity
- Policy-based admission control
- Kubernetes Gatekeeper for production enforcement
- No mutable :current tags in production

## Testing

```bash
# Run validation suite
python tests/validate.py

# Run automation pipeline end-to-end
bash scripts/test-pipeline.sh

# Check chaos scenarios
python -c "import yaml; print(yaml.safe_load(open('chaos/cases.yaml')))"
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

See [LICENSE](LICENSE) file for license information.

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/FlexNetOS/rtt-v1/issues)
- **Discussions**: [GitHub Discussions](https://github.com/FlexNetOS/rtt-v1/discussions)

## Version History

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

**RTT v1.0.0** - Production Ready ✅
Built with ❤️ by FlexNetOS

```

#### 2.3 Create QUICKSTART.md
Comprehensive quick start guide with:
- 5-minute setup
- First agent registration
- First routing plan
- First MCP integration
- Common troubleshooting

#### 2.4 Create INSTALL.md
Detailed installation guide with:
- System requirements
- Dependency installation per OS
- Native component compilation
- Configuration options
- Verification steps
- Production deployment

#### 2.5 Create CONTRIBUTING.md
Contribution guidelines with:
- Code of conduct
- Development setup
- Code style guide
- Testing requirements
- Pull request process
- Release process

#### 2.6 Create CHANGELOG.md
Version history with:
- v1.0.0 initial release
- All 12 dropin integrations
- Features by category
- Breaking changes (none for v1.0.0)

#### 2.7 Create Makefile
Build automation with targets:
- `make install` - Install all dependencies
- `make build` - Build all components
- `make build-native` - Build Rust/Go components
- `make test` - Run test suite
- `make validate` - Run validation
- `make clean` - Clean build artifacts
- `make deploy` - Deploy to production

### Phase 3: Add Enhanced Documentation

The `docs/` directory provides the operational and architectural elaboration of this PRD. In
particular:

- `docs/ARCHITECTURE.md` expands on Sections 6–11 (architecture, data model, performance
  strategy).
- `docs/OPERATIONS.md` operationalizes deployment, health checks, logging, metrics, and the
  feature-flag requirement for non-owned integrations (functional requirement 11).
- `docs/ACCEPTANCE-CRITERIA.md` defines concrete P0/P1/P2 gates that implement the final
  acceptance criteria in Sections 14 and 20, including checks for the non-owned integration
  feature flags.
- `docs/RSD-PLAN.md`, `docs/PHASE-GUIDE.md`, and `docs/DROPIN-MAPPING.md` map the 12 archive
  phases into the `rtt-gateway/` tree and should be treated as the canonical execution plan for
  v1.0.0.
- `docs/AGENT-COORDINATION.md` describes the background verification agents that enforce many of
  the invariants in Sections 4, 12, and 18.
- `AGENT.md` (at the `rtt/` root) defines the single agent/provider policy for this repository.
  It must remain aligned with this PRD and the docs under `docs/`; in case of conflict, this PRD
  remains normative.
- `docs/API-REFERENCE.md` documents the CLI and JSON schemas corresponding to Section 8.

These documents elaborate and implement the requirements in this PRD. In case of conflict,
**this PRD remains the single source of truth** and the docs under `docs/` should be updated
to match it.

#### 3.1 docs/README.md
Documentation index with links to all docs

#### 3.2 docs/API-REFERENCE.md
Complete API reference for:
- Python tools API
- Agent manifest format
- Plan format
- Policy format
- Routes format
- MCP bridge protocol

#### 3.3 auto/README.md
Automation pipeline documentation

#### 3.4 tools/README.md
Tools documentation

#### 3.5 stubs/README.md
Language stubs documentation

#### 3.6 tests/README.md
Testing documentation

#### 3.7 plans/README.md
Plans directory documentation

### Phase 4: Add Example Configurations

```

examples/
├── README.md
├── simple-agent/
│ ├── agent.json
│ ├── connector.py
│ └── README.md
├── multi-provider/
│ ├── panel.yaml
│ ├── providers.yaml
│ └── README.md
└── production-config/
├── panel.yaml
├── policy.json
├── routes.json
└── README.md

```

### Phase 5: Add Deployment Scripts

```

scripts/
├── deploy.sh # Production deployment
├── health-check.sh # Health check monitoring
└── rollback.sh # Rollback to previous version

````

### Phase 6: Add Build Configuration

#### 6.1 Cargo.toml (Workspace)
```toml
[workspace]
members = [
    "fabric/shm",
    "planner/rtt_planner_rs",
    "tools/rtt_sign_rs",
    "viewfs/rust-fuse",
    ".rtt/drivers/rust/connector-file"
]
````

#### 6.2 requirements.txt

```txt
pyyaml>=6.0
jsonschema>=4.0
```

#### 6.3 docker-compose.yml (Optional)

```yaml
version: "3.8"
services:
  rtt-panel:
    image: rtt:v1.0.0
    volumes:
      - ./.rtt:/app/.rtt
    command: python -m rtt.panel
```

### Phase 7: Fix Known Issues

#### 7.1 Fix auto/30-generate_connectors.py syntax error

Fix the string escaping issue in the template

#### 7.2 Fix tests/validate.py path issue

Update schema paths to reference correct location

### Phase 8: Polish and Validate

#### 8.1 Run final validation

```bash
cd rtt-gateway
python tests/validate.py
python auto/00-bootstrap.py
```

#### 8.2 Verify all documentation links work

#### 8.3 Run markdown linting

#### 8.4 Verify all examples work

### Phase 9: Create Distribution Packages

#### 9.1 Create release tarball

```bash
tar -czf rtt-v1.0.0.tar.gz rtt-gateway/
```

#### 9.2 Create Docker image

```bash
docker build -t rtt:v1.0.0 rtt-gateway/
```

#### 9.3 Create Helm package

```bash
helm package rtt-gateway/charts/gatekeeper-planbins/
```

### Phase 10: Final Git Commit

```bash
git add rtt-gateway/
git commit -m "Add polished production-ready rtt-gateway delivery package

- Complete production structure in rtt-gateway/
- Comprehensive documentation (README, QUICKSTART, INSTALL, CONTRIBUTING, CHANGELOG)
- Production .gitignore for runtime artifacts
- Makefile for build automation
- Example configurations (simple, multi-provider, production)
- Deployment scripts (deploy, health-check, rollback)
- Enhanced documentation throughout
- Fixed known issues (validate.py paths, connector generation)
- Added Cargo workspace configuration
- Added requirements.txt for Python dependencies
- Docker and Helm packaging support

Production Ready: ✅
Zero Harm: ✅
Upgrades Only: ✅"
```

---

## Success Criteria

### Completeness ✅

- [ ] All 450+ production files included
- [ ] All 73 language stubs present
- [ ] All 6 documentation files included
- [ ] All new documentation created
- [ ] All examples working

### Quality ✅

- [ ] No temporary/test artifacts
- [ ] All paths correct and verified
- [ ] All documentation links working
- [ ] All code properly formatted
- [ ] All examples tested

### Production Readiness ✅

- [ ] .gitignore properly configured
- [ ] Makefile with all targets
- [ ] Docker support complete
- [ ] Kubernetes Helm charts ready
- [ ] Systemd service unit tested
- [ ] Health checks implemented

### Documentation ✅

- [ ] README.md comprehensive and clear
- [ ] QUICKSTART.md tested and working
- [ ] INSTALL.md covers all platforms
- [ ] API-REFERENCE.md complete
- [ ] All subdirectories have README.md

### Zero Harm ✅

- [ ] No functional code deleted
- [ ] No working systems broken
- [ ] All components upgraded, not downgraded
- [ ] Original archives preserved in archive/

---

## Timeline Estimate

- **Phase 1** (Structure): 15 minutes
- **Phase 2** (Missing Files): 45 minutes
- **Phase 3** (Enhanced Docs): 30 minutes
- **Phase 4** (Examples): 20 minutes
- **Phase 5** (Scripts): 15 minutes
- **Phase 6** (Build Config): 10 minutes
- **Phase 7** (Fixes): 20 minutes
- **Phase 8** (Polish): 30 minutes
- **Phase 9** (Distribution): 15 minutes
- **Phase 10** (Git): 5 minutes

**Total**: ~3 hours

---

## Deliverables

1. **rtt-gateway/** - Production-ready RTT system
2. **archive/** - Original dropin archives for reference
3. **rtt-v1.0.0.tar.gz** - Release tarball
4. **rtt:v1.0.0** - Docker image
5. **gatekeeper-planbins-1.0.0.tgz** - Helm chart

---

## Next Steps After Delivery

1. Deploy to staging environment
2. Run comprehensive integration tests
3. Performance benchmarking
4. Security audit
5. Production deployment
6. Monitoring and observability setup
7. Documentation site deployment
8. Community announcement

---

**Plan Status**: ✅ Ready for Execution
**Risk Level**: Low (No destructive operations)
**Impact**: High (Production-ready delivery)

````
6. **Measure**: TelemetryAgent records p95/p99; ChaosAgent runs fault cases.
7. **Autotune**: AutotuneAgent sweeps and persists tuned profiles.
8. **Seal**: ComplianceAgent embeds SBOM and signs release.

---

## 14) Milestones and acceptance

### P0 Baseline (RTT working with MCP, no dup)

- CAS registry with signed entries.
- ViewFS mounts for 2 providers.
- Planner with deterministic greedy solution.
- 2PC apply with rollback and WAL.
- SHM + UDS lanes.
- Flight recorder.
- SLO: control p99 ≤ 500 µs, SHM p99 ≤ 2 ms.
- **Accept**: deterministic plan hash, rollback passes, p99 SLOs, crash-replay ok.

### P1 Core

- Constraint solver with QoS + NUMA.
- Cap’n Proto control plane.
- Token buckets and basic EDF.
- Chaos suite.
- **Accept**: SLO tighter by 25%, chaos pass rate ≥ 99%.

### P2 Full automation

- Autotune engine with trace inputs.
- CUE-typed configs; boot fails closed.
- Signed plan-only apply.
- **Accept**: tuned profile improves p99 ≥ 10% on target hardware; plan hash identical across runs; no duplicates across providers.

---

## 15) Risks and mitigations

- **FUSE/WinFsp complexity** → Provide hardlink/symlink/proxy fallback.
- **Solver blow-ups on large graphs** → Hybrid: SMT for small, greedy with caches for big.
- **Windows timing variance** → Prefer UDS-like Named Pipes; pin threads; tune I/O completion.
- **Driver bugs** → Process isolation + breaker + micro-reboots.

---

## 16) Migration from current drop-ins

1. Stand up CAS registry and packfile.
2. Generate CAS entries for existing `agents/common/*.agent.json`.
3. Mount provider views with overlays.
4. Replace symlink/proxy projections with VFS mounts.
5. Switch `rtt apply` to signed plans only.
6. Enable AutotuneAgent and persist tuned profiles.

---

## 17) Current TODO: Open items

- Choose Cap’n Proto vs FlatBuffers for control plane.
- Decide on default scheduler policy per class.
- Pick minimal TLA+ model scope and invariant set for CI.
- Select signing key storage strategy.
- Content-addressed signed registry with packfile and VFS views.
- Deterministic overlays and signed plan-only execution.
- Constraint planner tied to QoS and topology.
- Autotune as a first-class loop.
- Ruthless observability plus chaos gates.

---

## 18) Backlog TODO

| Area                  |                 Exists | Add                                                                                                                    |
| --------------------- | ---------------------: | ---------------------------------------------------------------------------------------------------------------------- | --- |
| Formal spec           |                     No | `spec/tla/` TLA+ for scan→plan→2PC→verify→rollback. Invariants encoded.                                                |
| Constraint planner    |                     No | `planner/` with typed constraints, solver, and signed plans in `plans/`.                                               |
| Deterministic apply   | Partial (WAL dir only) | Reconciler that computes stable Δ order, 2PC batches, merkle-chained WAL.                                              |
| Zero-copy fabric      |                     No | `fabric/shm/` SPSC ring buffers, power-of-two slots, length-prefix frames, busy-poll option.                           |
| Observability         |                     No | `telemetry/flight_recorder/` zero-alloc histograms, per-route p50/p95/p99, breaker states, single “dump window”.       |
| NUMA placement        |                     No | `placement/numa/` topology probe, thread pinning, page placement.                                                      |
| Schedulers            |                     No | Admission control per route, token buckets, EDF/CBS for periodic, WFQ for mixed.                                       |
| Security              |      Basic policy only | Capability tokens per route, strict signed manifests, plan signatures, driver sandbox (seccomp/AppContainer).          |
| Config type safety    |         JSON/YAML only | `cue/` schemas for panel, routes, policy; boot validation.                                                             |
| Autotune              |                     No | `autotune/` trace runner, sweep ring sizes, batch windows, CPU pins; write `tuned/profile.json`.                       |
| Chaos + failure tests |                     No | `chaos/` kill, slow, corrupt, clock-drift hooks wired into CI.                                                         |
| Upgrade strategy      |                     No | Staged plans (canary), SLO gates, inverse diffs for rollback.                                                          |
| Data formats          |             Basic JSON | Control plane via Cap’n Proto or FlatBuffers over UDS/Npipe; framed data header `{route_id, frame_id, len, checksum}`. |
| Supply chain          |                   None | Repro builds, SBOM embed, artifact signing, offline toolchain lock.                                                    |
| Dev workflow          |                Minimal | CI gates: spec check, property tests, chaos pack, perf guardrails, fd-leak, deadlock scan.                             | --- |

## 19) Deliverables checklist

- [ ] `.rtt/registry` with CAS, packfile, index, trust.
- [ ] `planner/` with solver and signed plans.
- [ ] `spec/tla/` invariants and CI runner.
- [ ] `fabric/*` with SHM SPSC rings and UDS lanes.
- [ ] `telemetry/flight_recorder/` and `rtt tap --flight`.
- [ ] `placement/numa/` and `schedulers/` admission + EDF.
- [ ] `cue/` schemas and boot validation.
- [ ] `autotune/` trace runner and tuned profiles.
- [ ] `chaos/` scenarios and pass criteria.
- [ ] `security/` caps, sandbox, signer keys, plan verify.
- [ ] `ci/` offline pipeline, perf guards, SBOM embed.

---

## 20) Final acceptance criteria

- No duplicate agent files across providers.
- Plans are immutable, signed, deterministic, and reversible.
- Control p99 ≤ 300 µs, SHM p99 ≤ 1.5 ms @ 64 KiB.
- Crash-replay restores last committed graph with no loss.
- Chaos pack passes with breaker behavior correct.
- Autotune yields measurable improvement, persisted per machine.

## Add this structure

```
plans/                            # signed, content-addressed plans
spec/tla/                         # formal model + invariants
planner/                          # constraint solver + plan generator
fabric/shm/                       # zero-copy SPSC rings
fabric/uds/                       # control channel
placement/numa/
schedulers/
telemetry/flight_recorder/
security/                         # caps, signing, sandbox profiles
cue/                              # typed configs
autotune/
chaos/
ci/
```

## Minimal files to drop in

### 1) Plan file (signed)

`plans/0001.bootstrap.plan.json`

```json
{
"plan_id": "sha256-<hex>",
"created_at": "2025-10-24T00:00:00Z",
"routes_add": [
  {
    "from": "rtt://ui/hook/refresh",
    "to": "rtt://core/api/metrics",
    "lane": "shm"
  }
],
"routes_del": [],
"order": ["A1"],
"sign": { "alg": "ed25519", "key_id": "dev-key-1", "sig": "<base64>" }
}
```

### 2) CUE types for config

`cue/panel.cue`

```cue
api: listen: {
unix: =~"^\\./\\.rtt/sockets/.*\\.sock$"
npipe?: string
}
scan: {
roots: [...string]
ignore: [...string]
}
routing: {
prefer: [...string] & ["shm","uds","tcp"]
rewire_atomic: true
}
security: {
strict_manifests: bool
allow_unsigned?: [...string]
}
health: {
heartbeat_ms: >=100 & <=5000
trip_threshold: { errors: >=1, window_ms: >=1000 }
}
```

### 3) Invariants checklist (enforced at runtime)

`spec/invariants.md`

- No duplicate active link for `(from, class!=bus)`.
- After `apply`: ObservedGraph == DesiredGraph. Else rollback.
- p99 latency per route < `latency_budget_ms` over 10s window or breaker trips.
- WAL sequence strictly increases. Merkle chain valid.
- Version meet non-empty on every bind.

### 4) SHM frame header

`fabric/shm/FRAME.md`

```
u32 magic = 0xRTT1
u16 flags
u16 reserved
u32 route_id
u32 frame_id
u32 len
u32 crc32c
payload[len]
```

### 5) Capability token shape

`security/caps.schema.json`

```json
{
"saddr": "rtt://core/api/metrics",
"verb": "open|tx|rx|close",
"scopes": ["metrics.read"],
"exp": "2025-10-24T00:05:00Z",
"nonce": "<32b>"
}
```

### 6) Deterministic apply order

`planner/order.md`

- Topo sort by dependencies.
- Secondary key: `(from,type,to,version)` stable string.
- Batch non-conflicting edges.
- 2PC per batch. Any NACK → rollback.

### 7) Flight recorder usage

`telemetry/flight_recorder/README.md`

```
rtt tap --flight 5s > flight.ndjson
# contains: ts, route_id, p50, p95, p99, qdepth, drops, breaker_state, syscalls_delta
```

### 8) Chaos hooks

`chaos/cases.yaml`

```yaml
- name: kill_driver
action: SIGKILL
target: connector:http
window: { start_ms: 500, dur_ms: 1000 }
- name: slow_consumer
action: sleep
target: route:rtt://core/bus/events->logger
latency_ms: 50
```

## Planner: constraint set (what to solve)

- Type match: `type(from) ⟂ type(to)` valid pair.
- Version set meet: `from.version ∧ to.version ≠ ∅`.
- Capabilities meet: negotiated subset non-empty.
- QoS: predicted p99 ≤ budget, tokens sized.
- Locality: minimize cross-NUMA hops.
- Policy: ACL, pins, fan-out rules.
- Objective 1: minimize latency. Objective 2: minimize churn vs current graph.

Small graphs: SMT/ILP. Large graphs: greedy with cached fingerprints.

## Fabric: zero-copy ring rules

- Power-of-two slots. Length-prefix frames.
- SPSC only on hot path. MPSC via striping.
- Atomics: Acquire/Release only. No locks.
- Optional busy-poll. Default sleep-poll budget.
- Setup time only passes handles (`SCM_RIGHTS` or `DuplicateHandle`). Never on hot path.

## Schedulers

- Token bucket per route. Size from `throughput_qps` and `latency_budget_ms`.
- EDF/CBS for periodic streams.
- WFQ for mixed workloads.
- Backpressure policy is explicit: `taildrop|mark|nack|buffer`.

## Security defaults

- `strict_manifests: true`.
- Refuse unsigned manifests unless under `allow_unsigned`.
- Plans must be signed. Panel binds only to a signed plan file.
- Drivers out-of-process with minimal profiles. No network by default.

## Autotune

- Record trace. Sweep: ring size, batch window, pinning, busy-poll threshold.
- Hill-climb on current hardware. Persist to `.rtt/tuned/profile.json` keyed by CPU+NUMA fingerprint.

## Upgrade path

- `rtt plan` generates a signed plan.
- `rtt apply --canary <percent>` wires subset.
- Verify SLO for window. Promote or rollback automatically.

## CI guardrails

- Spec pass (TLA+ TLC check).
- Property tests: idempotent apply, no orphan lanes, no fd leaks.
- Chaos pack.
- Perf gates: p99 regressions < 2%.
- SBOM + signature verification.

## Quick adoption steps

1. Add `cue/` and validate configs at boot. Refuse to serve on mismatch.
2. Add `plans/` and make `rtt apply` require a signed plan.
3. Implement SHM SPSC ring for hot routes. Keep UDS for control.
4. Add flight recorder and `rtt tap --flight`.
5. Add minimal capability tokens and strict manifests.
6. Introduce chaos hooks in tests.
7. Add NUMA pinning and token-bucket admission control.
8. Add autotune and persist tuned knobs.

## Acceptance criteria

- Deterministic plans. Same inputs → same plan hash.
- 2PC apply with rollback on any NACK.
- p99 latency within budgets for 10s windows or breaker trips.
- No fd/thread leaks under 24h churn.
- Reboot recovery from WAL to last committed graph.
- All manifests and plans verified and signed in strict mode.

---

Use this as the single source of truth to evolve the scaffold.

## 21) RTT v1.0.0 Final Delivery Plan (Inlined)

The content below inlines the standalone `DELIVERY-PLAN.md` so that this document is the single canonical source of truth for both the product requirements and the v1.0.0 delivery/packaging plan.

### Objective

Create a polished, production-ready RTT system in a single `rtt-gateway/` directory with:

- ✅ All production-ready files and directories
- ✅ Clean structure without test artifacts or temporary files
- ✅ Comprehensive production documentation
- ✅ Proper .gitignore for runtime artifacts
- ✅ Upgrade and polish existing components
- ❌ No downgrades or deletions of functional code
- ❌ No harm to working systems

---

### Current State Assessment

#### Production-Ready Components ✅

- `.rtt/` - Core RTT structure (panel, policy, routes, manifests, schemas, drivers)
- `agents/` - Canonical agents with full schemas
- `auto/` - 6-stage automation pipeline (00-50)
- `chaos/` - Chaos engineering scenarios
- `charts/` - Kubernetes Gatekeeper Helm chart
- `connector-mcp/` - MCP bridge
- `cue/` - CUE validation schemas
- `db/` - Connector database
- `docs/` - Comprehensive documentation (6 files)
- `etc/` - Shell profile configuration
- `fabric/` - Shared memory fabric (Rust)
- `ilp/` - ILP admission control
- `llama/` - LLM integration
- `mcp/` - MCP provider configurations
- `opt/` - Update scripts
- `overlays/` - Provider/environment patches
- `placement/` - Placement optimizer documentation
- `planner/` - Native Rust planner
- `providers/` - Multi-provider workspace structure
- `schemas/` - JSON schemas for validation
- `scripts/` - System mapping documentation
- `shims/` - Execution compatibility shims
- `skills/` - Skill manifests
- `solver/` - Constraint solver documentation
- `spec/` - Formal specifications (invariants, TLA+)
- `stubs/` - 73 language connector templates
- `systemd/` - Systemd service unit
- `telemetry/` - Flight recorder
- `tests/` - Validation scripts
- `tools/` - Complete toolchain (Python, Rust, Go)
- `views/` - View definitions
- `viewfs/` - ViewFS implementations
- `package.json`, `pnpm-workspace.yaml`, `tsconfig.json` - Build configuration
- `SBOM.json` - Software Bill of Materials
- `validation-report.md` - Comprehensive validation report

#### Temporary/Test Artifacts (Exclude from Final) ❌

- `.rtt/cache/` - Runtime cache (generated)
- `.rtt/wal/*.wal.json` - Write-ahead log entries (runtime)
- `.rtt/registry/cas/sha256/*` (generated during tests)
- `plans/*.plan.json` (generated during tests)
- `plans/LATEST` (runtime symlink)
- `tools/__pycache__/` - Python bytecode cache
- `rtt_elite_addon/` - Leftover extraction directory (duplicate)
- `rtt/` - Original dropin archives (reference only)
- `matrix-skelton.tar.gz` - Source archive (reference only)

#### Files Needing Polish/Upgrade 🔧

- `README.md` - Currently says "RTT Elite Add-On", needs comprehensive RTT v1.0.0 README
- Missing `INSTALL.md` - Need installation guide
- Missing `QUICKSTART.md` - Need quick start guide
- Missing `CONTRIBUTING.md` - Need contribution guidelines
- Missing `CHANGELOG.md` - Need version history
- Missing `.gitignore` - Need proper ignore patterns
- Missing `LICENSE` - Need license file (if proprietary, needs copyright notice)
- Missing `docker-compose.yml` - Optional but useful for quick deployment
- Missing `Makefile` or `justfile` - Build/deployment automation

---

### Final Delivery Structure: `rtt-gateway/`

> Note: earlier drafts used `rtt-final/` as the release directory name. This PRD standardizes on `rtt-gateway/` as the v1.0.0 packaging root. Any historical reference to `rtt-final/` SHOULD be interpreted as `rtt-gateway/` unless explicitly marked archival.

```
rtt-gateway/
├── .gitignore                          # [NEW] Runtime artifacts ignore patterns
├── LICENSE                             # [UPGRADE] Full license text
├── README.md                           # [UPGRADE] Comprehensive v1.0.0 README
├── QUICKSTART.md                       # [NEW] Quick start guide
├── INSTALL.md                          # [NEW] Detailed installation guide
├── CHANGELOG.md                        # [NEW] Version history
├── CONTRIBUTING.md                     # [NEW] Contribution guidelines
├── SBOM.json                           # [KEEP] Software Bill of Materials
├── validation-report.md                # [KEEP] Validation report
├── Makefile                            # [NEW] Build automation
│
├── .rtt/                               # Core RTT runtime structure
│   ├── panel.yaml                      # Panel configuration
│   ├── policy.json                     # ACL, QoS, pins, failover rules
│   ├── routes.json                     # Desired route state
│   ├── cache/.gitkeep                  # [NEW] Cache directory (ignored)
│   ├── wal/.gitkeep                    # [NEW] WAL directory (ignored)
│   ├── sockets/.gitkeep                # Socket directory
│   ├── drivers/                        # Multi-language connector drivers
│   │   ├── README.md
│   │   ├── python/
│   │   ├── go/
│   │   ├── node/
│   │   └── rust/
│   ├── manifests/                      # Agent manifests (sample)
│   │   ├── core.api.metrics.json
│   │   ├── core.bus.events.json
│   │   ├── idp.api.auth.json
│   │   ├── obs.extension.logger.ndjson.json
│   │   └── ui.hook.refresh.json
│   └── registry/                       # CAS registry
│       ├── index.json
│       ├── cas/.gitkeep                # [NEW] CAS storage (runtime)
│       ├── pack/                       # Pack storage
│       └── trust/keys/                 # Public keys
│
├── docs/                               # Comprehensive documentation
│   ├── README.md                       # [NEW] Documentation index
│   ├── RSD-PLAN.md
│   ├── PHASE-GUIDE.md
│   ├── DROPIN-MAPPING.md
│   ├── AGENT-COORDINATION.md
│   ├── ACCEPTANCE-CRITERIA.md
│   ├── ARCHITECTURE.md
│   └── API-REFERENCE.md                # [NEW] API documentation
│
├── agents/                             # Canonical agents
│   ├── agents.index.json
│   └── common/
│       ├── code_fix.agent.json
│       ├── search.agent.json
│       └── summarize.agent.json
│
├── auto/                               # Automation pipeline
│   ├── README.md                       # [NEW] Pipeline documentation
│   ├── 00-bootstrap.py
│   ├── 10-scan_symbols.py
│   ├── 20-depdoctor.py
│   ├── 30-generate_connectors.py
│   ├── 40-plan_solver.py
│   └── 50-apply_plan.py
│
├── tools/                              # Toolchain
│   ├── README.md                       # [NEW] Tools documentation
│   ├── common/                         # Shared utilities
│   ├── ilp/                            # ILP solver
│   ├── rtt_sign_rs/                    # Rust signer
│   ├── rtt_sign_go/                    # Go signer
│   └── *.py                            # Python tools
│
├── schemas/                            # JSON schemas
│   ├── rtt.symbol.schema.json
│   ├── rtt.policy.schema.json
│   └── rtt.routes.schema.json
│
├── mcp/                                # MCP integration
│   └── claude/
│       └── tools.json
│
├── connector-mcp/                      # MCP bridge
│   ├── README.md
│   ├── bridge.yaml
│   └── mcp_to_rtt.py
│
├── providers/                          # Multi-provider support
│   ├── providers.yaml
│   └── claude/
│
├── views/                              # View definitions
│   └── claude.view.json
│
├── overlays/                           # Overlays
│   ├── env/
│   └── provider/
│
├── skills/                             # Skills
│   └── summarization.skill.json
│
├── stubs/                              # 73 language stubs
│   ├── README.md                       # [NEW] Stubs documentation
│   ├── python/
│   ├── javascript/
│   ├── typescript/
│   └── ... (70 more languages)
│
├── fabric/                             # Shared memory fabric
│   └── shm/
│       ├── Cargo.toml
│       └── src/
│
├── planner/                            # Native planner
│   └── rtt_planner_rs/
│       ├── Cargo.toml
│       └── src/
│
├── viewfs/                             # ViewFS implementations
│   ├── README.md
│   ├── rust-fuse/
│   └── windows/
│
├── charts/                             # Kubernetes Helm charts
│   └── gatekeeper-planbins/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
│
├── systemd/                            # Systemd integration
│   └── rtt-panel.service
│
├── agent/                              # Agent bus
│   └── agent_bus.py
│
├── chaos/                              # Chaos engineering
│   └── cases.yaml
│
├── cue/                                # CUE schemas
│   └── panel.cue
│
├── db/                                 # Connector database
│   ├── README.md
│   └── connectors.json
│
├── etc/                                # System configuration
│   └── profile.d/
│       └── rtt.sh
│
├── ilp/                                # ILP documentation
│   └── README.md
│
├── llama/                              # LLM integration
│   ├── README.md
│   └── call_llama.py
│
├── opt/                                # Optimization scripts
│   └── update-current.sh
│
├── placement/                          # Placement documentation
│   └── README.md
│
├── plans/                              # Plans directory
│   ├── README.md                       # [NEW] Plans documentation
│   └── last_applied.json               # Example applied plan
│
├── scripts/                            # System scripts
│   └── system_mapping.md
│
├── shims/                              # Execution shims
│   ├── claude-flow
│   ├── mcp-shim
│   ├── node
│   └── python
│
├── solver/                             # Solver documentation
│   └── README.md
│
├── spec/                               # Formal specifications
│   ├── invariants.md
│   └── tla/
│
├── telemetry/                          # Telemetry
│   └── flight_recorder/
│       └── flight.py
│
├── tests/                              # Test suite
│   ├── README.md                       # [NEW] Testing documentation
│   └── validate.py
│
├── examples/                           # [NEW] Example configurations
│   ├── README.md
│   ├── simple-agent/
│   ├── multi-provider/
│   └── production-config/
│
├── scripts/                            # [NEW] Deployment scripts
│   ├── deploy.sh
│   ├── health-check.sh
│   └── rollback.sh
│
├── package.json                        # Node.js workspace
├── pnpm-workspace.yaml                 # PNPM configuration
├── tsconfig.json                       # TypeScript configuration
└── Cargo.toml                          # [NEW] Workspace Cargo.toml

## Excluded from rtt-gateway (moved to archive/):
### Temporary/Test Artifacts (Exclude from Final) ❌
* `.rtt/cache/` - Runtime cache (generated)
* `.rtt/wal/*.wal.json` - Write-ahead log entries (runtime)
* `.rtt/registry/cas/sha256/*` (generated during tests)
* `plans/*.plan.json` (generated during tests)
* `plans/LATEST` (runtime symlink)
* `tools/__pycache__/` - Python bytecode cache
* `rtt_elite_addon/` - Leftover extraction directory (duplicate)
* `rtt/` - Original dropin archives (reference only)
* `matrix-skelton.tar.gz` - Source archive (reference only)

### Files Needing Polish/Upgrade 🔧
* `README.md` - Currently says "RTT Elite Add-On", needs comprehensive RTT v1.0.0 README
* Missing `INSTALL.md` - Need installation guide
* Missing `QUICKSTART.md` - Need quick start guide
* Missing `CONTRIBUTING.md` - Need contribution guidelines
* Missing `CHANGELOG.md` - Need version history
* Missing `.gitignore` - Need proper ignore patterns
* Missing `LICENSE` - Need license file (if proprietary, needs copyright notice)
* Missing `docker-compose.yml` - Optional but useful for quick deployment
* Missing `Makefile` or `justfile` - Build/deployment automation

---

### Final Delivery Structure: `rtt-gateway/`

> Note: earlier drafts used `rtt-final/` as the release directory name. This PRD standardizes on `rtt-gateway/` as the v1.0.0 packaging root. Any historical reference to `rtt-final/` SHOULD be interpreted as `rtt-gateway/` unless explicitly marked archival.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ rtt-gateway/                                                                │
│ ├── .gitignore                          # [NEW] Runtime artifacts ignore patterns │
│ ├── LICENSE                             # [UPGRADE] Full license text          │
│ ├── README.md                           # [UPGRADE] Comprehensive v1.0.0 README│
│ ├── QUICKSTART.md                       # [NEW] Quick start guide              │
│ ├── INSTALL.md                          # [NEW] Detailed installation guide     │
│ ├── CHANGELOG.md                        # [NEW] Version history                 │
│ ├── CONTRIBUTING.md                     # [NEW] Contribution guidelines          │
│ ├── SBOM.json                           # [KEEP] Software Bill of Materials     │
│ ├── validation-report.md                # [KEEP] Validation report              │
│ ├── Makefile                            # [NEW] Build automation                 │
│ │
│ ├── .rtt/                               # Core RTT runtime structure            │
│ │   ├── panel.yaml                      # Panel configuration                   │
│ │   ├── policy.json                     # ACL, QoS, pins, failover rules       │
│ │   ├── routes.json                     # Desired route state                   │
│ │   ├── cache/.gitkeep                  # [NEW] Cache directory (ignored)      │
│ │   ├── wal/.gitkeep                    # [NEW] WAL directory (ignored)        │
│ │   ├── sockets/.gitkeep                # Socket directory                      │
│ │   ├── drivers/                        # Multi-language connector drivers      │
│ │   │   ├── README.md                   │
│ │   │   ├── python/                     │
│ │   │   ├── go/                         │
│ │   │   ├── node/                       │
│ │   │   └── rust/                       │
│ │   ├── manifests/                      # Agent manifests (sample)             │
│ │   │   ├── core.api.metrics.json       │
│ │   │   ├── core.bus.events.json        │
│ │   │   ├── idp.api.auth.json           │
│ │   │   ├── obs.extension.logger.ndjson.json │
│ │   │   └── ui.hook.refresh.json        │
│ │   └── registry/                       # CAS registry                         │
│ │       ├── index.json                  │
│ │       ├── cas/.gitkeep                # [NEW] CAS storage (runtime)         │
│ │       ├── pack/                       # Pack storage                        │
│ │       └── trust/keys/                 # Public keys                         │
│ │
│ ├── docs/                               # Comprehensive documentation           │
│ │   ├── README.md                       # [NEW] Documentation index            │
│ │   ├── RSD-PLAN.md                     │
│ │   ├── PHASE-GUIDE.md                  │
│ │   ├── DROPIN-MAPPING.md               │
│ │   ├── AGENT-COORDINATION.md           │
│ │   ├── ACCEPTANCE-CRITERIA.md          │
│ │   ├── ARCHITECTURE.md                 │
│ │   └── API-REFERENCE.md                # [NEW] API documentation              │
│ │
│ ├── agents/                             # Canonical agents                     │
│ │   ├── agents.index.json               │
│ │   └── common/                         │
│ │       ├── code_fix.agent.json         │
│ │       ├── search.agent.json           │
│ │       └── summarize.agent.json        │
│ │
│ ├── auto/                               # Automation pipeline                  │
│ │   ├── README.md                       # [NEW] Pipeline documentation          │
│ │   ├── 00-bootstrap.py                  │
│ │   ├── 10-scan_symbols.py              │
│ │   ├── 20-depdoctor.py                 │
│ │   ├── 30-generate_connectors.py       │
│ │   ├── 40-plan_solver.py                │
│ │   └── 50-apply_plan.py                │
│ │
│ ├── tools/                              # Toolchain                           │
│ │   ├── README.md                       # [NEW] Tools documentation            │
│ │   ├── common/                         # Shared utilities                     │
│ │   ├── ilp/                            # ILP solver                          │
│ │   ├── rtt_sign_rs/                    # Rust signer                         │
│ │   ├── rtt_sign_go/                    # Go signer                           │
│ │   └── *.py                            # Python tools                        │
│ │
│ ├── schemas/                            # JSON schemas                        │
│ │   ├── rtt.symbol.schema.json          │
│ │   ├── rtt.policy.schema.json          │
│ │   └── rtt.routes.schema.json          │
│ │
│ ├── mcp/                                # MCP integration                     │
│ │   └── claude/                         │
│ │       └── tools.json                  │
│ │
│ ├── connector-mcp/                      # MCP bridge                         │
│ │   ├── README.md                       │
│ │   ├── bridge.yaml                     │
│ │   └── mcp_to_rtt.py                   │
│ │
│ ├── providers/                          # Multi-provider support              │
│ │   ├── providers.yaml                  │
│ │   └── claude/                         │
│ │
│ ├── views/                              # View definitions                    │
│ │   └── claude.view.json                │
│ │
│ ├── overlays/                           # Overlays                            │
│ │   ├── env/                            │
│ │   └── provider/                       │
│ │
│ ├── skills/                             # Skills                             │
│ │   └── summarization.skill.json        │
│ │
│ ├── stubs/                              # 73 language stubs                  │
│ │   ├── README.md                       # [NEW] Stubs documentation           │
│ │   ├── python/                         │
│ │   ├── javascript/                     │
│ │   ├── typescript/                     │
│ │   └── ... (70 more languages)        │
│ │
│ ├── fabric/                             # Shared memory fabric                │
│ │   └── shm/                            │
│ │       ├── Cargo.toml                  │
│ │       └── src/                        │
│ │
│ ├── planner/                            # Native planner                      │
│ │   └── rtt_planner_rs/                 │
│ │       ├── Cargo.toml                  │
│ │       └── src/                        │
│ │
│ ├── viewfs/                             # ViewFS implementations              │
│ │   ├── README.md                       │
│ │   ├── rust-fuse/                     │
│ │   └── windows/                        │
│ │
│ ├── charts/                             # Kubernetes Helm charts             │
│ │   └── gatekeeper-planbins/            │
│ │       ├── Chart.yaml                  │
│ │       ├── values.yaml                 │
│ │       └── templates/                  │
│ │
│ ├── systemd/                            # Systemd integration                 │
│ │   └── rtt-panel.service                │
│ │
│ ├── agent/                              # Agent bus                           │
│ │   └── agent_bus.py                    │
│ │
│ ├── chaos/                              # Chaos engineering                   │
│ └── README.md                           # [NEW] Chaos documentation           │
```

---

**Plan Status**: ✅ Ready for Execution
**Risk Level**: Low (No destructive operations)
**Impact**: High (Production-ready delivery)
archive/
├── rtt/                                # Original dropin archives
└── matrix-skelton.tar.gz               # Source archive
```
````
