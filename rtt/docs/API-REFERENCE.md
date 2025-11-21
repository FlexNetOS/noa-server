# RTT API Reference

Complete API documentation for RTT v1.0.0 tools and formats.

## Python Tools API

### CAS Operations

#### cas_ingest.py
```bash
python tools/cas_ingest.py <agent.json> [agent2.json ...]
```
Ingests agent manifests into content-addressed storage.

#### cas_pack.py
```bash
python tools/cas_pack.py
```
Creates pack file from CAS entries.

### MCP Integration

#### mcp_ingest.py
```bash
python tools/mcp_ingest.py <provider> <tools.json>
```
Ingests MCP tools from provider.

#### agents_ingest.py
```bash
python tools/agents_ingest.py <agent.json> [...]
```
Registers agents in CAS.

### View Operations

#### view_materialize.py
```bash
python tools/view_materialize.py <view.json>
```
Materializes provider view with overlays.

## Agent Manifest Format

```json
{
  "$schema": "https://rtt/agent-manifest/v1",
  "symbol": "myapp.worker",
  "version": "1.0.0",
  "name": "Worker Agent",
  "desc": "Processes background tasks",
  "io": {
    "input": "json",
    "output": "json"
  },
  "capabilities": ["process", "compute"],
  "rtt_saddr": "rtt://agent/myapp/worker@1.0.0",
  "qos": {
    "latency_budget_ms": 500,
    "throughput_qps": 10
  }
}
```

## Plan Format

```json
{
  "plan_id": "sha256-<hash>",
  "routes_add": [
    {
      "from": "rtt://agent/api/search@1.0.0",
      "to": "rtt://mcp/claude/tool/search@1.0.0",
      "lane": "uds"
    }
  ],
  "routes_del": [],
  "placement": {
    "rtt://agent/api/search@1.0.0": "0"
  },
  "signature": "ed25519:..."
}
```

## Policy Format

```json
{
  "allow": [
    {"from": "rtt://agent/*", "to": "rtt://mcp/*"}
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

For complete examples, see [../examples/](../examples/).
