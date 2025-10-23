#!/bin/bash
# Generic MCP tool stub used during automation bootstrap.

set -euo pipefail

TOOL_NAME="${1:-unnamed-tool}"
shift || true

LOG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/logs/mcp"
mkdir -p "$LOG_DIR"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

echo "[$(timestamp)] [${TOOL_NAME}] MCP tool stub invoked with args: $*" >>"$LOG_DIR/tool_stub.log"
echo "{\"tool\":\"${TOOL_NAME}\",\"status\":\"stub\",\"timestamp\":\"$(timestamp)\"}"
