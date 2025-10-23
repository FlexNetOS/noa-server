#!/usr/bin/env python3
"""Aggregates verification artifacts for the Claude Suite."""

import json
from datetime import datetime
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
LEDGER_DIR = ROOT_DIR / "EvidenceLedger"
LEDGER_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = LEDGER_DIR / "verification.json"

neural_log = ROOT_DIR / "logs" / "neural" / "test.log"
mcp_gap = ROOT_DIR / "logs" / "mcp" / "tool_gap_report.yaml"
bench_log = ROOT_DIR / "logs" / "bench" / "llama-bench.txt"

payload = {
    "generated_at": datetime.utcnow().isoformat(),
    "neural_test_passed": neural_log.exists(),
    "mcp_gap_report": mcp_gap.exists(),
    "benchmarked": bench_log.exists(),
    "notes": []
}

if not neural_log.exists():
    payload["notes"].append("Neural test log missing.")
if not mcp_gap.exists():
    payload["notes"].append("MCP gap report missing.")
if not bench_log.exists():
    payload["notes"].append("Bench log missing.")

OUTPUT_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
print("Verification summary written to EvidenceLedger/verification.json")
