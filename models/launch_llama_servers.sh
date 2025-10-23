#!/usr/bin/env bash
set -euo pipefail

# Launch multiple llama-server instances for a curated set of models
# - Auto-picks a sane GGUF quant (prefers Q4_K_M, then Q5_K_M, then Q8_0)
# - Uses -hf to stream models from Hugging Face; add -hff when picking a specific file
# - Works best with Homebrew llama.cpp install (macOS):
#     brew install llama.cpp
#   or: brew tap ggml-org/tap && brew install ggml-org/tap/llama.cpp
#
# Controls:
#   ./launch_llama_servers.sh start        # start servers
#   ./launch_llama_servers.sh stop         # stop servers
#   ./launch_llama_servers.sh status       # list ports and PIDs
# Options:
#   PORT_BASE=8040        # first port used
#   CTX=8192              # context tokens
#   NGL=auto|0|99         # GPU layers (auto uses 99 on Apple Silicon)
#   ONLY="key1,key2"      # start only specific model keys (see list below)
#   SKIP_BIG=1            # skip very large models (>= 17B)
#   HF_TOKEN=...          # set to pass Hugging Face token for gated repos
#
# Logs/PIDs are written under: ./run/{logs,pids}

PORT_BASE=${PORT_BASE:-8040}
CTX=${CTX:-8192}
NGL=${NGL:-auto}
ONLY=${ONLY:-}
SKIP_BIG=${SKIP_BIG:-0}
HF_TOKEN=${HF_TOKEN:-${HUGGINGFACE_TOKEN:-}}

RUN_DIR="$(cd "$(dirname "$0")" && pwd)/run"
LOG_DIR="$RUN_DIR/logs"
PID_DIR="$RUN_DIR/pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

if ! command -v llama-server >/dev/null 2>&1; then
  echo "ERROR: llama-server not found in PATH. Install with Homebrew:" >&2
  echo "  brew install llama.cpp" >&2
  echo "  # or: brew tap ggml-org/tap && brew install ggml-org/tap/llama.cpp" >&2
  exit 1
fi

# Resolve NGL=auto → 99 on Apple Silicon, else 0
if [[ "$NGL" == "auto" ]]; then
  if [[ "$(uname -s)" == "Darwin" ]] && sysctl -n machdep.cpu.brand_string 2>/dev/null | grep -qi "Apple"; then
    NGL=99
  else
    NGL=0
  fi
fi

note() { printf "[info] %s\n" "$*"; }
warn() { printf "[warn] %s\n" "$*" >&2; }
err()  { printf "[err]  %s\n" "$*" >&2; }

# Model catalog: key|repo|preferred_quants(csv)|port|context|is_big
# - preferred_quants: tried in order; fallback to any .gguf if none found
# - is_big: 1 for large models ≥ ~17B; honored when SKIP_BIG=1
MODELS=(
  # Vision-ready Gemma 3 4B IT (includes mmproj in ggml-org repo)
  "gemma3_4bit|ggml-org/gemma-3-4b-it-GGUF|Q4_K_M,Q5_K_M,Q8_0|$((PORT_BASE+0))|$CTX|0"
  # Qwen2.5 VL 3B (vision)
  "qwen25_vl_3b|unsloth/Qwen2.5-VL-3B-Instruct-GGUF|Q4_K_M,Q5_K_M,Q8_0|$((PORT_BASE+1))|$CTX|0"
  # Qwen3 VL 30B (vision, large)
  "qwen3_vl_30b|yairpatch/Qwen3-VL-30B-A3B-Instruct-GGUF|Q5_K_M,Q4_K_M,Q8_0|$((PORT_BASE+2))|$CTX|1"
  # Qwen3 Coder 30B A3B 1M (very large)
  "qwen3_coder_30b|unsloth/Qwen3-Coder-30B-A3B-Instruct-1M-GGUF|Q4_K_M,Q5_K_M,Q8_0|$((PORT_BASE+3))|32768|1"
  # OpenThinker3 7B
  "openthinker3_7b|Mungert/OpenThinker3-7B-GGUF|Q4_K_M,Q5_K_M,Q8_0|$((PORT_BASE+4))|$CTX|0"
  # Magistral Small 2.5B
  "magistral_small|unsloth/Magistral-Small-2509-GGUF|Q4_K_M,Q5_K_M,Q8_0|$((PORT_BASE+5))|$CTX|0"
  # ERNIE 4.5 21B (large)
  "ernie_21b|unsloth/ERNIE-4.5-21B-A3B-Thinking-GGUF|Q4_K_M,Q5_K_M,Q8_0|$((PORT_BASE+6))|$CTX|1"
  # Phi-4 (pick mini/standard quant)
  "phi4|bartowski/phi-4-GGUF|Q4_K_M,Q5_K_M,Q8_0|$((PORT_BASE+7))|$CTX|0"
  # SmolLM3 3B
  "smollm3_3b|ggml-org/SmolLM3-3B-GGUF|Q4_K_M,Q5_K_M,Q8_0|$((PORT_BASE+8))|$CTX|0"
  # Qwen3 0.6B
  "qwen3_0_6b|ggml-org/Qwen3-0.6B-GGUF|Q8_0,Q4_0,Q4_K_M|$((PORT_BASE+9))|$CTX|0"
  # Mixtral 8x7B Instruct (large)
  "mixtral_8x7b|TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF|Q4_K_M,Q5_K_M,Q8_0|$((PORT_BASE+10))|$CTX|1"
  # Llama 4 Scout 17B (vision, large)
  "llama4_scout_17b|ggml-org/Llama-4-Scout-17B-16E-Instruct-GGUF|Q4_K_M,Q5_K_M,Q8_0|$((PORT_BASE+11))|$CTX|1"
  # Llama 3.2 3B Instruct
  "llama32_3b|bartowski/Llama-3.2-3B-Instruct-GGUF|Q4_K_M,Q5_K_M,Q8_0|$((PORT_BASE+12))|$CTX|0"
  # Stable Code 3B
  "stable_code_3b|TheBloke/stable-code-3b-GGUF|Q4_K_M,Q5_K_M,Q8_0|$((PORT_BASE+13))|$CTX|0"
  # Jan v1 4B
  "jan_v1_4b|JanHQ/jan-v1-4b-GGUF|Q4_K_M,Q5_K_M,Q8_0|$((PORT_BASE+14))|$CTX|0"
  # Gemma 3 270M IT (tiny)
  "gemma3_270m|ggml-org/gemma-3-270m-it-GGUF|Q8_0,Q4_0|$((PORT_BASE+15))|$CTX|0"
  # IBM Granite 4.0 micro
  "granite_4_micro|ibm-granite/granite-4.0-micro-GGUF|Q4_K_M,Q5_K_M,Q8_0|$((PORT_BASE+16))|$CTX|0"
  # Falcon H1 0.5B Instruct
  "falcon_h1_0_5b|tiiuae/Falcon-H1-0.5B-Instruct-GGUF|Q8_0,Q4_K_M,Q3_K_M|$((PORT_BASE+17))|$CTX|0"
  # LiquidAI LFM2-350M
  "lfm2_350m|LiquidAI/LFM2-350M-GGUF|Q4_K_M,Q8_0|$((PORT_BASE+18))|$CTX|0"
)

list_model_keys() {
  for entry in "${MODELS[@]}"; do
    IFS='|' read -r key _repo _prefs _port _ctx _big <<<"$entry"
    echo "$key"
  done | tr '\n' ',' | sed 's/,$\n//' || true
}

hf_files_json() {
  local repo="$1"
  local url="https://huggingface.co/api/models/${repo}"
  if [[ -n "$HF_TOKEN" ]]; then
    curl -sS -H "Authorization: Bearer $HF_TOKEN" "$url" || return 1
  else
    curl -sS "$url" || return 1
  fi
}

pick_gguf() {
  # Usage: pick_gguf <repo> <preferred_csv>
  local repo="$1" prefs_csv="$2"
  local json
  if ! json=$(hf_files_json "$repo"); then
    echo ""; return 1
  fi
  # Collect all .gguf sibling filenames
  local files
  files=$(python3 - <<'PY' "$json" 2>/dev/null || true
import json,sys
data=json.loads(sys.argv[1])
siblings=data.get('siblings',[])
ggufs=[s.get('rfilename','') for s in siblings if s.get('rfilename','').endswith('.gguf')]
print('\n'.join(ggufs))
PY
)
  if [[ -z "$files" ]]; then
    echo ""; return 1
  fi

  # Try preferred quant patterns in order (case-insensitive contains)
  IFS=',' read -r -a prefs <<<"$prefs_csv"
  for pref in "${prefs[@]}"; do
    local hit
    hit=$(printf '%s\n' "$files" | grep -i "$pref" | head -n1 || true)
    if [[ -n "$hit" ]]; then
      echo "$hit"; return 0
    fi
  done

  # Generic fallbacks
  for pat in Q4_K_M Q5_K_M Q8_0 Q4_0 Q6_K; do
    local hit
    hit=$(printf '%s\n' "$files" | grep -i "$pat" | head -n1 || true)
    if [[ -n "$hit" ]]; then
      echo "$hit"; return 0
    fi
  done

  # Otherwise first .gguf
  printf '%s\n' "$files" | head -n1
}

start_one() {
  local key="$1" repo="$2" prefs="$3" port="$4" ctx="$5" is_big="$6"

  if [[ "$SKIP_BIG" == "1" && "$is_big" == "1" ]]; then
    warn "Skipping big model: $key ($repo)"
    return 0
  fi

  if [[ -n "$ONLY" ]]; then
    local match=0
    IFS=',' read -r -a only_keys <<<"$ONLY"
    for ok in "${only_keys[@]}"; do
      if [[ "$ok" == "$key" ]]; then match=1; break; fi
    done
    if [[ $match -eq 0 ]]; then
      return 0
    fi
  fi

  # Discover a GGUF to use
  local gguf
  if ! gguf=$(pick_gguf "$repo" "$prefs"); then
    warn "No GGUF found or repo gated: $repo — set HF_TOKEN or accept license, skipping"
    return 0
  fi

  local log="$LOG_DIR/${key}.log"
  local pidfile="$PID_DIR/${key}.pid"

  if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile" 2>/dev/null)" 2>/dev/null; then
    note "$key already running on port $port (PID $(cat "$pidfile"))"
    return 0
  fi

  note "Starting $key on :$port using $repo :: $gguf"
  # Use -hf with -hff to pin exact file; add --no-mmproj or --mmproj only if needed
  # We rely on ggml-org VL repos to include and auto-wire mmproj by default.
  set -m
  nohup env HF_TOKEN="$HF_TOKEN" \
    llama-server -hf "$repo" -hff "$gguf" -c "$ctx" -ngl "$NGL" --port "$port" \
      >"$log" 2>&1 &
  local pid=$!
  echo "$pid" >"$pidfile"
  note "  PID $pid | log: $log"
}

stop_all() {
  local count=0
  for pidfile in "$PID_DIR"/*.pid; do
    [[ -e "$pidfile" ]] || continue
    local pid
    pid=$(cat "$pidfile" 2>/dev/null || true)
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      note "Stopping $(basename "$pidfile" .pid) (PID $pid)"
      kill "$pid" 2>/dev/null || true
      sleep 0.5
      kill -9 "$pid" 2>/dev/null || true
      count=$((count+1))
    fi
    rm -f "$pidfile"
  done
  note "Stopped $count servers"
}

status_all() {
  printf "%-22s %-8s %-8s %-s\n" "KEY" "PORT" "PID" "LOG"
  for entry in "${MODELS[@]}"; do
    IFS='|' read -r key _repo _prefs port _ctx _big <<<"$entry"
    local pidfile="$PID_DIR/${key}.pid"
    local pid="-"
    if [[ -f "$pidfile" ]]; then
      pid=$(cat "$pidfile" 2>/dev/null || echo '-')
      if ! kill -0 "$pid" 2>/dev/null; then pid="-"; fi
    fi
    printf "%-22s %-8s %-8s %s\n" "$key" "$port" "$pid" "$LOG_DIR/${key}.log"
  done
}

start_all() {
  note "Starting llama-server fleet (PORT_BASE=$PORT_BASE CTX=$CTX NGL=$NGL)"
  if [[ -n "$ONLY" ]]; then
    note "Restricting to ONLY=$ONLY"
  fi
  if [[ "$SKIP_BIG" == "1" ]]; then
    note "Skipping large models due to SKIP_BIG=1"
  fi
  for entry in "${MODELS[@]}"; do
    IFS='|' read -r key repo prefs port ctx big <<<"$entry"
    start_one "$key" "$repo" "$prefs" "$port" "$ctx" "$big"
  done
  note "Done. Use: $0 status"
}

cmd=${1:-help}
case "$cmd" in
  start)  start_all ;;
  stop)   stop_all ;;
  status) status_all ;;
  list)   echo "Available keys:"; list_model_keys ;;
  *)
    cat <<USAGE
Usage: $0 {start|stop|status|list}

Environment options:
  PORT_BASE     First port to use (default: $PORT_BASE)
  CTX           Context tokens per model (default: $CTX)
  NGL           GPU layers (auto|0|99, default: $NGL)
  ONLY          Comma-separated keys to run (use "$0 list" to see keys)
  SKIP_BIG      1 to skip very large models (>= ~17B); default: $SKIP_BIG
  HF_TOKEN      Hugging Face token for gated repos (optional)

Examples:
  # Start a small, useful subset
  SKIP_BIG=1 ONLY=gemma3_4bit,smollm3_3b,stable_code_3b $0 start

  # Full fleet (may consume lots of RAM)
  $0 start

  # Check status and stop
  $0 status
  $0 stop
USAGE
    ;;
esac

