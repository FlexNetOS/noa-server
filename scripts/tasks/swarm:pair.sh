#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

python3 "$ROOT_DIR/scripts/memory/daa_hooks.py" "pair:start" "pair"
python3 "$ROOT_DIR/scripts/swarm/log_run.py" "pair" "Pair programming session logged."
python3 "$ROOT_DIR/scripts/memory/daa_hooks.py" "pair:finish" "pair"
