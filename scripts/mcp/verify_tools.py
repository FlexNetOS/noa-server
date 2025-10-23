#!/usr/bin/env python3
"""
Parses MCP server configuration and prepares verification artifacts.
"""

import json
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT_DIR / "packages" / "mcp-agent" / "mcp-servers-config.json"
LOG_DIR = ROOT_DIR / "logs" / "mcp"
CATALOG_FILE = LOG_DIR / "tool_catalog.json"
GAP_FILE = LOG_DIR / "tool_gap_report.yaml"
REQUIRED_COUNT = 87


def load_config():
    with CONFIG_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    return data.get("mcpServers", {})


def write_catalog(servers):
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.utcnow().isoformat(),
        "tool_count": len(servers),
        "tools": [
            {
                "name": name,
                "command": details.get("command"),
                "description": details.get("description"),
                "args": details.get("args", []),
            }
            for name, details in sorted(servers.items())
        ],
    }
    with CATALOG_FILE.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
    return payload


def write_gap_report(tool_count):
    missing = max(REQUIRED_COUNT - tool_count, 0)
    lines = [
        "report:",
        f"  generated_at: {datetime.utcnow().isoformat()}",
        f"  required_tool_count: {REQUIRED_COUNT}",
        f"  present_tool_count: {tool_count}",
        f"  missing_tool_count: {missing}",
    ]
    if missing > 0:
        lines.append("  status: PARTIAL")
        lines.append("  next_steps:")
        lines.append("    - Populate mcp-servers-config.json with the missing tools.")
        lines.append("    - Verify installations and update Evidence Ledger once complete.")
    else:
        lines.append("  status: COMPLETE")
    with GAP_FILE.open("w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")


def main():
    if not CONFIG_PATH.exists():
        raise SystemExit(f"MCP config not found at {CONFIG_PATH}")
    servers = load_config()
    catalog = write_catalog(servers)
    write_gap_report(catalog["tool_count"])
    print(f"Captured MCP tool catalog ({catalog['tool_count']} tools). Gap report generated.")


if __name__ == "__main__":
    main()
