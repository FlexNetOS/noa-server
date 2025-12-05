# RTT Quick Start Guide

Get up and running with RTT in 5 minutes!

## Prerequisites

Before you begin, ensure you have:

- **Python 3.8+** installed
- **Git** installed
- **Linux, macOS, or WSL2** environment

## Step 1: Clone and Setup (1 minute)

```bash
# Clone the repository
git clone https://github.com/FlexNetOS/rtt-v1.git
cd rtt-v1/rtt-final

# Install Python dependencies
pip install pyyaml jsonschema

# Initialize RTT
python auto/00-bootstrap.py
```

**Expected output:**

```text
[OK] Bootstrap complete: /path/to/rtt-final
```

## Step 2: Register Your First Agent (2 minutes)

### Option A: Use Existing Sample Agents

RTT comes with 3 canonical agents ready to use:

```bash
# Ingest sample agents into CAS
python tools/cas_ingest.py agents/common/*.agent.json
```

**Expected output:**

```text
[OK] code_fix@1.0.0 -> /path/to/.rtt/registry/cas/sha256/997752...json
[OK] search@1.0.0 -> /path/to/.rtt/registry/cas/sha256/f073d7...json
[OK] summarize@1.0.0 -> /path/to/.rtt/registry/cas/sha256/bcbe05...json
[OK] updated index -> /path/to/.rtt/registry/index.json
```

### Option B: Create Your Own Agent

Create `my-agent.agent.json`:

```json
{
  "$schema": "https://rtt/agent-manifest/v1",
  "symbol": "myapp.worker",
  "version": "1.0.0",
  "capabilities": ["process", "compute"],
  "rtt_saddr": "rtt://agent/custom/worker@1.0.0"
}
```

Ingest it:

```bash
python tools/cas_ingest.py my-agent.agent.json
```

## Step 3: Create a Simple Routing Plan (1 minute)

### Scan Available Symbols

```bash
python auto/10-scan_symbols.py
```

**Expected output:**

```text
[OK] wrote /path/to/index/symbols.index.json
```

### Check Dependencies

```bash
python auto/20-depdoctor.py
```

**Expected output:**

```text
[OK] wrote /path/to/plans/dep.unify.json
```

### Generate Routing Plan

```bash
python auto/40-plan_solver.py
```

**Expected output:**

```text
[OK] wrote /path/to/plans/6b9ac723fd36ec81.plan.json
```

## Step 4: Apply the Plan (30 seconds)

```bash
python auto/50-apply_plan.py
```

**Expected output:**

```text
[OK] applied plan, wal: /path/to/.rtt/wal/1761588681-874982792cc5.wal.json
```

## Step 5: Verify Everything Works (30 seconds)

```bash
# Check CAS registry
ls -la .rtt/registry/cas/sha256/

# Check applied plan
cat plans/6b9ac723fd36ec81.plan.json | head -20

# Verify WAL entry
ls -la .rtt/wal/
```

## 🎉 Success

You've successfully:

- ✅ Installed and initialized RTT
- ✅ Registered agents in content-addressed storage
- ✅ Generated a deterministic routing plan
- ✅ Applied the plan atomically with 2PC

## What's Next?

### Explore MCP Integration

```bash
# Ingest MCP tools from Claude
python tools/mcp_ingest.py claude mcp/claude/tools.json

# Expected output:
# [OK] MCP claude/summarize@1.0.0 -> CAS sha256:9404eea...
# [OK] MCP claude/search@1.0.0 -> CAS sha256:93c94f7...
```

### Create a Provider View

```bash
# Materialize Claude provider view
python tools/view_materialize.py views/claude.view.json

# Expected output:
# [OK] claude materialized summarize_1.0.0.agent.json
# [OK] claude materialized search_1.0.0.agent.json
# [OK] claude materialized code_fix_1.0.0.agent.json
```

### Test CAS Pack/Unpack

```bash
# Create a pack for distribution
python tools/cas_pack.py

# Expected output:
# [OK] wrote /path/to/.rtt/registry/pack/agents.pack and index.lut

# Verify pack
ls -lh .rtt/registry/pack/
```

### Run Full Automation Pipeline

```bash
# Run all stages sequentially
python auto/00-bootstrap.py && \
python auto/10-scan_symbols.py && \
python auto/20-depdoctor.py && \
python auto/40-plan_solver.py && \
python auto/50-apply_plan.py
```

## Common Operations

### Add a New Route

Edit `.rtt/routes.json`:

```json
{
  "routes": [
    {
      "from": "rtt://agent/api/summarize@1.0.0",
      "to": "rtt://mcp/claude/tool/summarize@1.0.0"
    }
  ]
}
```

Then regenerate and apply:

```bash
python auto/40-plan_solver.py
python auto/50-apply_plan.py
```

### Configure QoS Policy

Edit `.rtt/policy.json`:

```json
{
  "allow": [{ "from": "rtt://agent/*", "to": "rtt://mcp/*" }],
  "qos": {
    "rtt://agent/api/search@1.0.0": {
      "latency_budget_ms": 400,
      "throughput_qps": 20
    }
  }
}
```

### View Agent Details

```bash
# List all agents in CAS
python -c "
import json
with open('.rtt/registry/index.json') as f:
    idx = json.load(f)
    for entry in idx.get('entries', []):
        print(f\"{entry['symbol']}@{entry['version']} -> {entry['sha256']}\")
"
```

## Troubleshooting

### Issue: Bootstrap fails with "No module named 'yaml'"

**Solution:**

```bash
pip install pyyaml
```

### Issue: CAS ingestion fails with path errors

**Solution:** Ensure you're in the `rtt-final/` directory:

```bash
cd /path/to/rtt-final
pwd  # Should end with /rtt-final
```

### Issue: Plan solver produces empty plan

**Solution:** Check that routes.json has valid routes:

```bash
cat .rtt/routes.json
# Should contain at least one route
```

### Issue: Permissions denied on .rtt/sockets/

**Solution:** Create sockets directory:

```bash
mkdir -p .rtt/sockets
chmod 755 .rtt/sockets
```

## Learning More

- **[INSTALL.md](INSTALL.md)** - Detailed installation for all platforms
- **[README.md](README.md)** - Complete feature overview
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture
- **[docs/API-REFERENCE.md](docs/API-REFERENCE.md)** - API documentation
- **[examples/](examples/)** - Example configurations

## Getting Help

- **Documentation**: [docs/](docs/)
- **GitHub Issues**: [https://github.com/FlexNetOS/rtt-v1/issues](https://github.com/FlexNetOS/rtt-v1/issues)
- **Discussions**: [https://github.com/FlexNetOS/rtt-v1/discussions](https://github.com/FlexNetOS/rtt-v1/discussions)

---

**Ready for production?** See [INSTALL.md](INSTALL.md) for systemd, Docker, and Kubernetes deployment options.
