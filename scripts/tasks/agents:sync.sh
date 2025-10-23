#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

python3 "$ROOT_DIR/scripts/agents/build_registry.py"

REGISTRY="$ROOT_DIR/config/agents/registry.yaml"
if [[ -f "$REGISTRY" ]]; then
  echo "[agents:sync] Registry generated at $REGISTRY"
fi
