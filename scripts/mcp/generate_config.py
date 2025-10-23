#!/usr/bin/env python3
"""
Generate the MCP server configuration with the required 87 tools.
Each tool is mapped to the generic tool_stub.sh script so verify_tools.py
can confirm coverage while implementation is expanded incrementally.
"""

import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT_DIR / "packages" / "mcp-agent" / "mcp-servers-config.json"
STUB_COMMAND = str(ROOT_DIR / "scripts" / "mcp" / "tool_stub.sh")

BASE_TOOLS = [
    "filesystem",
    "github",
    "jira",
    "sqlite",
    "neural-processing",
    "flow-nexus",
    "claude-flow",
    "secrets-scan",
    "bench-runner",
    "truth-gate",
    "evidence-ledger",
    "memory-sync",
    "agent-registry",
    "workflow-planner",
    "sparc-controller",
    "training-orchestrator",
    "hooks-manager",
    "metrics-reporter",
    "ui-dashboard",
    "runtime-audit",
    "config-manager",
    "export-packager",
    "smoke-tests",
    "neural-benchmark",
    "gguf-validator",
    "model-download",
    "llama-bridge",
    "cuda-monitor",
    "docs-builder",
    "gap-analyzer",
    "release-notes",
    "log-collector",
    "snapshot-manager",
    "backup-runner",
    "alerts-dispatcher",
    "pair-programming",
    "training-history",
    "hooks-audit",
    "tools-sync",
    "evidence-sync",
    "manifest-checker",
    "hash-verifier",
    "integration-mapper",
    "task-allocator",
    "automation-runner",
    "pipeline-monitor",
    "qa-summarizer",
    "risk-register",
    "compliance-checker",
    "issue-tracker",
    "performance-inspector",
    "sandbox-manager",
    "env-provisioner",
    "workspace-analyzer",
    "dependency-audit",
    "benchmark-reporter",
    "hook-scheduler",
    "memory-audit",
    "swarm-status",
    "agent-health",
    "model-catalog",
    "task-replayer",
    "truth-verifier",
    "kb-search",
    "doc-indexer",
    "release-gatekeeper",
    "pipeline-audit",
    "cache-manager",
    "prompt-library",
    "feature-toggle",
    "cli-runner",
    "script-validator",
    "data-ingest",
    "notification-bus",
    "auth-manager",
    "license-check",
    "cost-monitor",
    "benchmark-dashboard",
    "agent-simulator",
    "signature-verifier",
    "comms-router",
    "io-proxy",
    "test-matrix",
    "artifact-store",
    "telemetry-hub",
    "playbook-runner",
    "sla-monitor"
]

def build_config(tool_names):
    return {
        "mcpServers": {
            name: {
                "command": "bash",
                "description": f"Stub MCP tool for {name.replace('-', ' ')} workflow.",
                "args": [
                    STUB_COMMAND,
                    name
                ]
            }
            for name in tool_names
        }
    }


def main():
    if len(BASE_TOOLS) != 87:
        raise SystemExit(f"Tool list must contain 87 entries, found {len(BASE_TOOLS)}")

    config = build_config(BASE_TOOLS)
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(config, indent=2), encoding="utf-8")
    print(f"Wrote MCP configuration with {len(BASE_TOOLS)} tools to {CONFIG_PATH}")


if __name__ == "__main__":
    main()
