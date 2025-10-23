#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

"$ROOT_DIR/scripts/runtime/bootstrap_node.sh"
"$ROOT_DIR/scripts/runtime/bootstrap_python.sh"

echo "[runtime:bootstrap] Node and Python environments prepared."
