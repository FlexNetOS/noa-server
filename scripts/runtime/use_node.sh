#!/bin/bash
# Shell helper to add the pinned Node installation to PATH.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NODE_HOME="$ROOT_DIR/.runtime/node-current"

if [[ ! -d "$NODE_HOME" ]]; then
  echo "Pinned Node runtime not found. Run scripts/runtime/bootstrap_node.sh" >&2
  exit 1
fi

export PATH="$NODE_HOME/bin:$PATH"
exec "$@"
