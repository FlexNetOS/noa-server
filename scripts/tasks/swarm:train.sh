#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

python3 "$ROOT_DIR/scripts/memory/daa_hooks.py" "train:start" "training"
python3 "$ROOT_DIR/scripts/swarm/log_run.py" "training" "Automated training pipeline execution."
python3 "$ROOT_DIR/scripts/memory/daa_hooks.py" "train:finish" "training"
