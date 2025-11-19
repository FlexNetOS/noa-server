#!/bin/bash
# Orchestrate setup of self-contained runtimes:
# - Node (pinned, integrity-verified)
# - Python virtual environment
# - Record versions to EvidenceLedger/runtime.json
# Environment variables are forwarded to underlying scripts.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"

NODE_BOOTSTRAP="$ROOT_DIR/scripts/runtime/bootstrap_node.sh"
PY_BOOTSTRAP="$ROOT_DIR/scripts/runtime/bootstrap_python.sh"
RECORD_VERSIONS="$ROOT_DIR/scripts/runtime/record_versions.sh"

log() { echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [setup_all] $1"; }

log "Bootstrapping Node..."
"$NODE_BOOTSTRAP"

log "Bootstrapping Python..."
"$PY_BOOTSTRAP"

log "Recording runtime versions..."
"$RECORD_VERSIONS"

log "Setup complete. See $RUNTIME_DIR/node-integrity.json and EvidenceLedger/runtime.json"
