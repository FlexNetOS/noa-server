#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

mkdir -p "$ROOT_DIR/config/runtime" "$ROOT_DIR/config/services"

DEFAULT_ENV="$ROOT_DIR/config/runtime/default.env"
if [[ ! -f "$DEFAULT_ENV" ]]; then
cat >"$DEFAULT_ENV" <<'ENV'
# Default runtime configuration
NODE_ENV=development
LLM_MODEL_PATH=./models/ggml-model.gguf
MCP_PORT=8001
FLOW_NEXUS_PORT=9000
CLAUDE_FLOW_PORT=9100
ENV
  echo "[config:scaffold] Wrote config/runtime/default.env"
fi

PORT_FILE="$ROOT_DIR/config/services/ports.yaml"
if [[ ! -f "$PORT_FILE" ]]; then
cat >"$PORT_FILE" <<'YAML'
services:
  mcp:
    port: 8001
  claude_flow:
    port: 9100
  flow_nexus:
    port: 9000
  ui_dashboard:
    port: 9200
  llama_cpp_bridge:
    port: 9300
YAML
  echo "[config:scaffold] Wrote config/services/ports.yaml"
fi

ENV_SAMPLE="$ROOT_DIR/.env.example"
if [[ ! -f "$ENV_SAMPLE" ]]; then
cat >"$ENV_SAMPLE" <<'ENV'
# Claude Suite environment example
NODE_ENV=development
LLM_MODEL_PATH=${PWD}/models/demo.gguf
MCP_PORT=8001
FLOW_NEXUS_PORT=9000
CLAUDE_FLOW_PORT=9100
UI_PORT=9200
ENV
  echo "[config:scaffold] Wrote .env.example"
fi

echo "[config:scaffold] Complete."
