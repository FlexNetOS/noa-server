#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

mkdir -p "$ROOT_DIR/logs/swarm" "$ROOT_DIR/.swarm"
echo "[swarm:init] Initialized swarm directories at logs/swarm and .swarm"
