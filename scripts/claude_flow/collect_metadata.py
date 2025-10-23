#!/usr/bin/env python3
"""Collects metadata from claude-flow and flow-nexus packages."""

import json
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).resolve().parents[2]
FLOW_DIR = ROOT_DIR / "packages" / "claude-flow-alpha"
FLOW_WIKI_DIR = ROOT_DIR / "packages" / "claude-flow.wiki"
FLOW_PACKAGE = FLOW_DIR / "package.json"
OUTPUT_DIR = ROOT_DIR / "logs" / "claude-flow"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

metadata = {
    "generated_at": datetime.utcnow().isoformat(),
    "package_present": FLOW_DIR.exists(),
    "package_json": None,
    "has_wiki": FLOW_WIKI_DIR.exists(),
}

if FLOW_PACKAGE.exists():
    try:
        with FLOW_PACKAGE.open("r", encoding="utf-8") as handle:
            metadata["package_json"] = json.load(handle)
    except json.JSONDecodeError as exc:
        metadata["package_json_error"] = str(exc)

with (OUTPUT_DIR / "metadata.json").open("w", encoding="utf-8") as handle:
    json.dump(metadata, handle, indent=2)

print("Claude-flow metadata captured.")
