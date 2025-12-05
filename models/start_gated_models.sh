#!/usr/bin/env bash
set -euo pipefail

# Start gated Hugging Face models once you have a valid HF token.
# Models:
#  - Qwen3-VL-30B-A3B-Instruct-GGUF (repo: yairpatch/Qwen3-VL-30B-A3B-Instruct-GGUF)
#  - Jan v1 4B (repo: JanHQ/jan-v1-4b-GGUF)
#
# Usage:
#   export HF_TOKEN=hf_xxx  # or set HUGGINGFACE_TOKEN
#   ./start_gated_models.sh
#
# Optional: include mixtral if resources allow (uncomment ONLY list below)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LAUNCHER="$SCRIPT_DIR/launch_llama_servers.sh"

# Attempt to load HF token from MCP secrets if not set in env
if [[ -z "${HF_TOKEN:-${HUGGINGFACE_TOKEN:-}}" ]]; then
   for f in \
      "/home/deflex/mcp/.secrets/huggingface.env" \
      "/home/deflex/mcp/config/secrets/huggingface.env"; do
      if [[ -f "$f" ]]; then
         # shellcheck disable=SC1090
         set -a; source "$f"; set +a
         break
      fi
   done
fi

if [[ -z "${HF_TOKEN:-${HUGGINGFACE_TOKEN:-}}" ]]; then
  cat <<'MSG'
[error] HF_TOKEN is not set.

Steps to proceed:
1) Accept the model licenses in your browser (requires logged-in account):
   - Qwen3 VL 30B A3B Instruct: https://huggingface.co/yairpatch/Qwen3-VL-30B-A3B-Instruct-GGUF
   - Jan v1 4B:                https://huggingface.co/JanHQ/jan-v1-4b-GGUF

2) Create a User Access Token on Hugging Face (Scope: read, write if needed):
   https://huggingface.co/settings/tokens

3) Set the token in your shell and rerun:
   export HF_TOKEN=hf_your_token_here
   # or
   export HUGGINGFACE_TOKEN=hf_your_token_here

    # Or place a secrets file at one of:
    #   /home/deflex/mcp/.secrets/huggingface.env
    #   /home/deflex/mcp/config/secrets/huggingface.env
    # with content:
    #   HF_TOKEN=hf_your_token_here

Then re-run: ./start_gated_models.sh
MSG
  exit 1
fi

# By default we start only the gated models
ONLY_KEYS="qwen3_vl_30b,jan_v1_4b"
# Uncomment to also try Mixtral (resource heavy):
# ONLY_KEYS="qwen3_vl_30b,jan_v1_4b,mixtral_8x7b"

echo "[info] Using HF token from environment/secrets"
ONLY="$ONLY_KEYS" "$LAUNCHER" start
