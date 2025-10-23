#!/usr/bin/env python3
"""Evaluates Truth Gate accuracy from available artifacts."""

import json
from pathlib import Path
from datetime import datetime, UTC

ROOT_DIR = Path(__file__).resolve().parents[2]
LEDGER_DIR = ROOT_DIR / "EvidenceLedger"
VERIFICATION_FILE = LEDGER_DIR / "verification.json"
MCP_CATALOG = ROOT_DIR / "logs" / "mcp" / "tool_catalog.json"
OUTPUT_FILE = LEDGER_DIR / "truth_gate.json"

if not VERIFICATION_FILE.exists():
    raise SystemExit("Verification summary missing. Run npm run verify first.")

verification = json.loads(VERIFICATION_FILE.read_text())

if MCP_CATALOG.exists():
    tools = json.loads(MCP_CATALOG.read_text())
    tool_accuracy = tools.get("tool_count", 0) / 87
else:
    tool_accuracy = 0.0

neural_accuracy = 1.0 if verification.get("neural_test_passed") else 0.0
bench_accuracy = 1.0 if verification.get("benchmarked") else 0.0

scores = [tool_accuracy, neural_accuracy, bench_accuracy]
accuracy = sum(scores) / len(scores)

payload = {
    "generated_at": datetime.now(UTC).isoformat(),
    "accuracy": accuracy,
    "components": {
        "tool_accuracy": tool_accuracy,
        "neural_accuracy": neural_accuracy,
        "bench_accuracy": bench_accuracy,
    },
    "threshold": 0.95,
    "passed": accuracy >= 0.95
}

OUTPUT_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")

if accuracy < 0.95:
    raise SystemExit(f"Truth Gate accuracy {accuracy:.2f} below threshold 0.95")

print("Truth Gate passed with accuracy", accuracy)
