#!/usr/bin/env python3
"""Collects metadata from flow-nexus package."""

import json
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).resolve().parents[2]
FLOW_NEXUS_DIR = ROOT_DIR / "packages" / "flow-nexus"
OUTPUT_DIR = ROOT_DIR / "logs" / "flow-nexus"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

metadata = {
    "generated_at": datetime.utcnow().isoformat(),
    "package_present": FLOW_NEXUS_DIR.exists(),
    "files": [],
}

if FLOW_NEXUS_DIR.exists():
    for path in sorted(FLOW_NEXUS_DIR.glob("*")):
        metadata["files"].append(path.name)

with (OUTPUT_DIR / "metadata.json").open("w", encoding="utf-8") as handle:
    json.dump(metadata, handle, indent=2)

print("Flow-nexus metadata captured.")
