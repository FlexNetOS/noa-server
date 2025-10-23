#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

python3 "$ROOT_DIR/scripts/mcp/generate_config.py"
python3 "$ROOT_DIR/scripts/mcp/verify_tools.py"
