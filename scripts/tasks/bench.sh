#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT_DIR/logs/bench"
mkdir -p "$LOG_DIR"

BENCH_BIN="$ROOT_DIR/packages/llama.cpp/build/bin/llama-bench"

if [[ ! -x "$BENCH_BIN" ]]; then
  echo "[bench] llama-bench binary not found at $BENCH_BIN" >&2
  exit 1
fi

"$BENCH_BIN" --help >"$LOG_DIR/llama-bench.txt"
echo "[bench] Captured llama-bench help output to logs/bench/llama-bench.txt"
