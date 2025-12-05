# Relay Terminal Tool (RTT) v1.0.0

**Production-Ready Multi-Agent Connection Fabric with Content-Addressed Storage and Deterministic Routing**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/FlexNetOS/rtt-v1/releases)
[![Status](https://img.shields.io/badge/status-production--ready-green.svg)](validation-report.md)
[![License](https://img.shields.io/badge/license-proprietary-red.svg)](LICENSE)

RTT is a sophisticated agent orchestration platform that provides deterministic, policy-driven routing between heterogeneous agents with cryptographic verification and content-addressable storage.

## 🚀 Key Features

### 🔒 Content-Addressed Storage (CAS)
- **SHA256-based immutable storage** for agents and artifacts
- **Pack/unpack** for efficient distribution
- **Trust chain** with Ed25519 public key infrastructure
- **Deterministic hashing** for reproducible builds

### 🎯 Deterministic Routing
- **Constraint solver** with QoS awareness
- **NUMA-aware placement** optimization
- **ILP admission control** for exact solutions
- **Policy-based** route filtering with ACLs

### 🌐 Multi-Provider MCP Integration
- Support for **Claude**, **OpenAI**, and **Mistral**
- **MCP-to-RTT protocol bridge**
- Automated **tool ingestion** pipeline
- **Skills abstraction** layer for capability grouping

### 📦 Production Components
- **Native Rust planner** for high performance
- **Shared memory fabric** for zero-copy IPC
- **Ed25519 signers** in Rust and Go
- **Multi-language connector drivers** (Python, JavaScript, Go, Rust)

### 🚀 Zero-Config Automation
Six-stage automation pipeline:
1. **Bootstrap** - Initialize environment
2. **Scan** - Discover symbols
3. **DepDoctor** - Validate dependencies
4. **Generate** - Auto-create connectors
5. **Solver** - Compute optimal plan
6. **Apply** - Atomic 2PC application

### 🌍 Universal Language Support
**73 programming languages** with connector stubs:
- **Systems**: C, C++, Rust, Go, D, Nim, Zig
- **Enterprise**: Java, C#, Scala, Kotlin
- **Scripting**: Python, Ruby, Perl, PHP, Lua, PowerShell, Bash
- **Functional**: Haskell, OCaml, F#, Clojure, Erlang, Elixir
- **Web**: JavaScript, TypeScript, Vue, React, Svelte, Angular
- **Data**: SQL, R, Julia, MATLAB
- **Mobile**: Swift, Kotlin, Dart

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[INSTALL.md](INSTALL.md)** - Detailed installation guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[docs/](docs/)** - Comprehensive technical documentation
  - [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture
  - [API-REFERENCE.md](docs/API-REFERENCE.md) - Complete API reference
  - [RSD-PLAN.md](docs/RSD-PLAN.md) - Requirements and design
  - [PHASE-GUIDE.md](docs/PHASE-GUIDE.md) - Implementation guide
- **[validation-report.md](validation-report.md)** - Production validation results

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Applications / Agents                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │   │
│  │    A     │  │    B     │  │    C     │  │    D     │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
┌───────▼─────────────▼─────────────▼─────────────▼──────────┐
│              RTT Routing Fabric (Panel)                      │
│  ┌────────────────────────────────────────────────────┐     │
│  │     Constraint Solver + Placement Optimizer        │     │
│  │  (QoS + NUMA + Policy + ILP + Churn Minimization) │     │
│  └─────────────────┬──────────────────────────────────┘     │
│                    │                                         │
│  ┌─────────────────▼──────────────────────────────────┐     │
│  │         Multi-Lane Transport Selection            │     │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐      │     │
│  │   │   SHM    │  │   UDS    │  │   TCP    │      │     │
│  │   │ (shared  │  │  (Unix   │  │ (network)│      │     │
│  │   │ memory)  │  │ domain)  │  │          │      │     │
│  │   └──────────┘  └──────────┘  └──────────┘      │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│        Content-Addressed Storage (CAS) Registry             │
│  ┌────────────────────────────────────────────────────┐     │
│  │    SHA256 → Agent/Tool/Manifest Definitions        │     │
│  │    Pack/Unpack + Ed25519 Signing + Trust Chain     │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│              View Engine + Provider Overlays                 │
│  ┌────────────────────────────────────────────────────┐     │
│  │   Claude Provider  │  OpenAI Provider  │  Mistral  │     │
│  │   Materialized Views with Provider-Specific Patches │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

## 🎯 Quick Start

### Prerequisites

- **OS**: Linux, macOS, or WSL2
- **Python**: 3.8 or higher
- **Rust**: 1.70+ (optional, for native components)
- **Go**: 1.19+ (optional, for Go signer)
- **Node.js**: 18+ (optional, for Node drivers)

### Installation

```bash
# Clone repository
git clone https://github.com/FlexNetOS/rtt-v1.git
cd rtt-v1/rtt-final

# Install Python dependencies
pip install -r requirements.txt

# Initialize RTT
python auto/00-bootstrap.py
```

See [INSTALL.md](INSTALL.md) for detailed instructions.

### Basic Usage

```bash
# 1. Scan and discover agents
python auto/10-scan_symbols.py

# 2. Check dependencies
python auto/20-depdoctor.py

# 3. Generate routing plan
python auto/40-plan_solver.py

# 4. Apply plan atomically
python auto/50-apply_plan.py
```

See [QUICKSTART.md](QUICKSTART.md) for a complete tutorial.

## 🔧 Common Operations

### Content-Addressed Storage

```bash
# Ingest agents into CAS
python tools/cas_ingest.py agents/common/*.agent.json

# Create pack for distribution
python tools/cas_pack.py

# Verify pack integrity
ls -la .rtt/registry/pack/
```

### MCP Integration

```bash
# Ingest MCP tools from provider
python tools/mcp_ingest.py claude mcp/claude/tools.json

# Register agents
python tools/agents_ingest.py agents/common/*.agent.json

# Materialize provider view
python tools/view_materialize.py views/claude.view.json
```

### Plan Management

```bash
# Build signed plan
python tools/plan_build.py .rtt/routes.json .rtt/manifests/ mykey

# Verify plan signature
python tools/plan_verify.py plans/latest.plan.json

# Check invariants
python tools/invariants_check.py .rtt/routes.json .rtt/manifests/
```

## ⚙️ Configuration

### Panel Configuration

Edit `.rtt/panel.yaml`:

```yaml
api:
  listen:
    unix: ./.rtt/sockets/panel.sock

scan:
  roots: [./agents, ./providers]
  ignore: [./tests, ./docs]

routing:
  prefer: [shm, uds, tcp]
  rewire_atomic: true

security:
  strict_manifests: true
  allow_unsigned: []

health:
  heartbeat_ms: 1000
  trip_threshold:
    errors: 3
    window_ms: 5000
```

### Policy Configuration

Edit `.rtt/policy.json` for ACLs, QoS, and pinning:

```json
{
  "allow": [
    {"from": "rtt://agent/*", "to": "rtt://mcp/claude/*"},
    {"from": "rtt://core/*", "to": "rtt://obs/*"}
  ],
  "deny": [],
  "qos": {
    "rtt://agent/api/search@1.0.0": {
      "latency_budget_ms": 400,
      "throughput_qps": 20
    }
  },
  "pins": {},
  "failover": {}
}
```

## 🚀 Production Deployment

### With Systemd

```bash
# Install service
sudo cp systemd/rtt-panel.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable rtt-panel
sudo systemctl start rtt-panel

# Check status
sudo systemctl status rtt-panel
```

### With Kubernetes

```bash
# Deploy Gatekeeper policies
helm install gatekeeper-rtt charts/gatekeeper-planbins/ \
  --namespace rtt-system \
  --create-namespace

# Verify constraints
kubectl get constraints -n rtt-system
```

### With Docker

```bash
# Build image
docker build -t rtt:v1.0.0 .

# Run container
docker run -d \
  --name rtt-panel \
  -v $(pwd)/.rtt:/app/.rtt \
  -v $(pwd)/agents:/app/agents \
  rtt:v1.0.0
```

## 🧪 Testing

```bash
# Run validation suite
python tests/validate.py

# Test automation pipeline
make test-pipeline

# Verify CAS operations
make test-cas

# Check invariants
make test-invariants
```

## 🛡️ Security

- **Ed25519 cryptographic signing** for all plans and views
- **Content-addressable storage** ensures integrity
- **Policy-based admission control** with ACLs
- **Kubernetes Gatekeeper** for production enforcement
- **No mutable :current tags** in production (enforced by policy)
- **Trust chain validation** for all CAS entries

## 📈 Performance

- **NUMA-aware placement** reduces cross-node latency
- **Shared memory fabric** for zero-copy IPC
- **Native Rust planner** for microsecond-scale planning
- **ILP solver** guarantees optimal admission decisions
- **Churn minimization** reduces disruption on re-planning

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Code of conduct
- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

## 📜 License

See [LICENSE](LICENSE) file for license information.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/FlexNetOS/rtt-v1/issues)
- **Discussions**: [GitHub Discussions](https://github.com/FlexNetOS/rtt-v1/discussions)

## 📊 Project Status

- **Version**: 1.0.0
- **Status**: Production Ready ✅
- **All P0/P1/P2 Acceptance Criteria**: Met ✅
- **Test Coverage**: Comprehensive ✅
- **Documentation**: Complete ✅

See [validation-report.md](validation-report.md) for detailed validation results.

## 🗺️ Roadmap

- [ ] v1.1: Enhanced monitoring and observability
- [ ] v1.2: Additional MCP providers (Anthropic, Cohere)
- [ ] v1.3: Distributed RTT federation
- [ ] v2.0: Machine learning-based placement optimization

## 📋 Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## 🙏 Acknowledgments

Built with contributions from:
- FlexNetOS Engineering Team
- Claude (Anthropic) - Autonomous integration and validation
- Open source community

---

**RTT v1.0.0** - Production Ready ✅
Built with ❤️ by [FlexNetOS](https://github.com/FlexNetOS)

For questions, issues, or contributions, visit our [GitHub repository](https://github.com/FlexNetOS/rtt-v1).
