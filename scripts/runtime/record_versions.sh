#!/bin/bash
# Captures runtime versions into EvidenceLedger/runtime.json

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LEDGER_DIR="$ROOT_DIR/EvidenceLedger"
LEDGER_FILE="$LEDGER_DIR/runtime.json"
mkdir -p "$LEDGER_DIR"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

PINNED_NODE="$ROOT_DIR/.runtime/node-current/bin/node"
PINNED_NPM="$ROOT_DIR/.runtime/node-current/bin/npm"

node_version="unavailable"
python_version="unavailable"
npm_version="unavailable"
pip_version="unavailable"

if [[ -x "$PINNED_NODE" ]]; then
  node_version="$($PINNED_NODE -v)"
elif command -v node >/dev/null 2>&1; then
  node_version="$(node -v)"
fi
if [[ -x "$PINNED_NPM" ]]; then
  npm_version="$($PINNED_NPM -v)"
elif command -v npm >/dev/null 2>&1; then
  npm_version="$(npm -v)"
fi
if command -v python3 >/dev/null 2>&1; then
  python_version="$(python3 --version | awk '{print $2}')"
fi
if command -v pip3 >/dev/null 2>&1; then
  pip_version="$(pip3 --version | awk '{print $2}')"
fi

cat >"$LEDGER_FILE" <<JSON
{
  "generated_at": "$(timestamp)",
  "node": "${node_version}",
  "npm": "${npm_version}",
  "python": "${python_version}",
  "pip": "${pip_version}"
}
JSON

echo "Runtime versions recorded at ${LEDGER_FILE}"
