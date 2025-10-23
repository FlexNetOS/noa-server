#!/bin/bash
# Placeholder setup script for Claude Suite automation pipeline.
# Populates deterministic environment once runtime bootstrap scripts are implemented.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs/setup"
mkdir -p "$LOG_DIR"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

echo "[$(timestamp)] [INFO] Running Claude Suite setup pipeline."

"$ROOT_DIR/scripts/runtime/bootstrap_node.sh" >>"$LOG_DIR/bootstrap.log" 2>&1
"$ROOT_DIR/scripts/runtime/bootstrap_python.sh" >>"$LOG_DIR/bootstrap.log" 2>&1
"$ROOT_DIR/scripts/runtime/record_versions.sh" >>"$LOG_DIR/runtime.log" 2>&1

cat >"$ROOT_DIR/SETUP_STATUS.md" <<'MD'
# Claude Suite Setup Status

Setup executed via `scripts/setup.sh`.

- Node runtime pinned (see .nvmrc and EvidenceLedger/runtime.json)
- Python virtual environment prepared (.venv)
- Runtime versions recorded in EvidenceLedger/runtime.json

Re-run `npm run setup` after making dependency changes to refresh this report.
MD

echo "[$(timestamp)] [INFO] Setup complete. Logs available in logs/setup/"
