#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT_DIR/logs/neural"
mkdir -p "$LOG_DIR"

TEST_SCRIPT="$ROOT_DIR/packages/llama.cpp/test_neural_layer.sh"

if [[ ! -x "$TEST_SCRIPT" ]]; then
  echo "[neural:test] Test script not executable: $TEST_SCRIPT" >&2
  exit 1
fi

if "$TEST_SCRIPT" all >"$LOG_DIR/test.log" 2>&1; then
  echo "[neural:test] Neural layer tests passed. See logs/neural/test.log"
else
  echo "[neural:test] Neural layer tests failed. See logs/neural/test.log" >&2
  exit 1
fi
