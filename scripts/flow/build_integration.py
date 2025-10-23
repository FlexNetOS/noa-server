#!/usr/bin/env python3
"""Builds integration manifest combining claude-flow and flow-nexus metadata."""

import json
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).resolve().parents[2]
CLAUDE_FLOW_METADATA = ROOT_DIR / "logs" / "claude-flow" / "metadata.json"
FLOW_NEXUS_METADATA = ROOT_DIR / "logs" / "flow-nexus" / "metadata.json"
OUTPUT_DIR = ROOT_DIR / "config" / "integration"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "integration.json"

payload = {
    "generated_at": datetime.utcnow().isoformat(),
    "claude_flow": None,
    "flow_nexus": None,
}

if CLAUDE_FLOW_METADATA.exists():
    payload["claude_flow"] = json.loads(CLAUDE_FLOW_METADATA.read_text(encoding="utf-8"))
if FLOW_NEXUS_METADATA.exists():
    payload["flow_nexus"] = json.loads(FLOW_NEXUS_METADATA.read_text(encoding="utf-8"))

OUTPUT_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
print("Integration manifest generated.")
