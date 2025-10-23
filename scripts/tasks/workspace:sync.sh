#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "[workspace:sync] Consolidating repositories under packages/"
"$ROOT_DIR/scripts/repos/consolidate.sh"

WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml"
if [[ ! -f "$WORKSPACE_FILE" ]]; then
cat >"$WORKSPACE_FILE" <<'YAML'
packages:
  - packages/*
  - servers/*
  - apps/*
YAML
  echo "[workspace:sync] Created pnpm-workspace.yaml"
fi

echo "[workspace:sync] Complete."
