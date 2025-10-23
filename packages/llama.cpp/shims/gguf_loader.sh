#!/bin/bash
# GGUF Model Loader and Chat API Shim for Claude Suite
# This script provides a unified interface to llama.cpp for neural processing

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LLAMA_CPP_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$LLAMA_CPP_DIR/build"
BIN_DIR="$BUILD_DIR/bin"
LLAMA_CLI="$BIN_DIR/llama-cli"

# Environment variables
LLM_MODEL_PATH="${LLM_MODEL_PATH:-}"
LLAMA_CUDA="${LLAMA_CUDA:-false}"
LLAMA_CUDA_DEVICE="${LLAMA_CUDA_DEVICE:-0}"
LLAMA_CUDA_FORCE_MMQ="${LLAMA_CUDA_FORCE_MMQ:-true}"
LLAMA_CUDA_FORCE_MMV="${LLAMA_CUDA_FORCE_MMV:-true}"
LLAMA_CUDA_GRAPHS="${LLAMA_CUDA_GRAPHS:-true}"
LLAMA_CUDA_LOW_VRAM="${LLAMA_CUDA_LOW_VRAM:-false}"
LLAMA_CUDA_NO_PEER_COPY="${LLAMA_CUDA_NO_PEER_COPY:-true}"
# Unified Memory (VMM) configuration
LLAMA_CUDA_NO_VMM="${LLAMA_CUDA_NO_VMM:-false}"  # Enable unified memory by default
LLAMA_CUDA_VMM_MAX_SIZE="${LLAMA_CUDA_VMM_MAX_SIZE:-1073741824}"  # 1GB default VMM pool

# Default model if not specified
DEFAULT_MODEL="${LLM_MODEL_PATH:-$LLAMA_CPP_DIR/models/ggml-vocab-llama-bpe.gguf}"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

error() {
    log "ERROR: $*" >&2
    exit 1
}

# Check if llama-cli exists
check_llama_cli() {
    if [[ ! -x "$LLAMA_CLI" ]]; then
        error "llama-cli not found at $LLAMA_CLI. Please build llama.cpp first."
    fi
}

# Get CUDA arguments
get_cuda_args() {
    local args=""
    if [[ "$LLAMA_CUDA" == "true" ]]; then
        args="$args --gpu-layers 100"  # Use GPU for all layers
        args="$args --cuda-device $LLAMA_CUDA_DEVICE"

        # Unified Memory (VMM) configuration
        if [[ "$LLAMA_CUDA_NO_VMM" == "false" ]]; then
            export LLAMA_CUDA_NO_VMM=0  # Enable unified memory
            if [[ -n "$LLAMA_CUDA_VMM_MAX_SIZE" ]]; then
                export LLAMA_CUDA_VMM_MAX_SIZE="$LLAMA_CUDA_VMM_MAX_SIZE"
            fi
            log "CUDA unified memory enabled (VMM pool: ${LLAMA_CUDA_VMM_MAX_SIZE} bytes)"
        else
            export LLAMA_CUDA_NO_VMM=1  # Disable unified memory
            log "CUDA unified memory disabled"
        fi

        # Memory management optimizations
        if [[ "$LLAMA_CUDA_FORCE_MMQ" == "true" ]]; then
            export LLAMA_CUDA_FORCE_MMQ=1
        fi
        if [[ "$LLAMA_CUDA_FORCE_MMV" == "true" ]]; then
            export LLAMA_CUDA_FORCE_MMV=1
        fi
        if [[ "$LLAMA_CUDA_GRAPHS" == "true" ]]; then
            export LLAMA_CUDA_GRAPHS=1
        fi
        if [[ "$LLAMA_CUDA_LOW_VRAM" == "true" ]]; then
            export LLAMA_CUDA_LOW_VRAM=1
        fi
        if [[ "$LLAMA_CUDA_NO_PEER_COPY" == "true" ]]; then
            export LLAMA_CUDA_NO_PEER_COPY=1
        fi
    fi
    echo "$args"
}

# Load and validate GGUF model
load_model() {
    local model_path="$1"

    if [[ ! -f "$model_path" ]]; then
        error "Model file not found: $model_path"
    fi

    # Basic GGUF validation (check file header)
    if ! head -c 4 "$model_path" | grep -q "GGUF"; then
        error "Invalid GGUF model file: $model_path"
    fi

    log "Loading GGUF model: $model_path"
    echo "$model_path"
}

# Chat API function
chat_api() {
    local prompt="$1"
    local model_path="${2:-$DEFAULT_MODEL}"
    local context_size="${3:-4096}"
    local threads="${4:-$(nproc)}"

    check_llama_cli

    model_path=$(load_model "$model_path")
    cuda_args=$(get_cuda_args)

    log "Starting chat with model: $model_path"

    # Run llama-cli with chat parameters
    "$LLAMA_CLI" \
        --model "$model_path" \
        --prompt "$prompt" \
        --ctx-size "$context_size" \
        --threads "$threads" \
        --temp 0.8 \
        --top-k 40 \
        --top-p 0.9 \
        --repeat-last-n 64 \
        --repeat-penalty 1.1 \
        --n-predict 256 \
        "$cuda_args" \
        --interactive \
        --color
}

# Stream API function (for real-time output)
stream_api() {
    local prompt="$1"
    local model_path="${2:-$DEFAULT_MODEL}"
    local context_size="${3:-4096}"
    local threads="${4:-$(nproc)}"

    check_llama_cli

    model_path=$(load_model "$model_path")
    cuda_args=$(get_cuda_args)

    log "Starting stream with model: $model_path"

    # Run llama-cli with streaming parameters
    "$LLAMA_CLI" \
        --model "$model_path" \
        --prompt "$prompt" \
        --ctx-size "$context_size" \
        --threads "$threads" \
        --temp 0.8 \
        --top-k 40 \
        --top-p 0.9 \
        --repeat-last-n 64 \
        --repeat-penalty 1.1 \
        --n-predict 512 \
        "$cuda_args" \
        --interactive-first \
        --color
}

# Benchmark function for testing
benchmark_model() {
    local model_path="${1:-$DEFAULT_MODEL}"
    local prompt="${2:-"Hello, how are you?"}"
    local n_predict="${3:-128}"

    check_llama_cli

    model_path=$(load_model "$model_path")
    cuda_args=$(get_cuda_args)

    log "Benchmarking model: $model_path"

    # Time the inference
    local start_time
    start_time=$(date +%s.%3N)

    "$LLAMA_CLI" \
        --model "$model_path" \
        --prompt "$prompt" \
        --n-predict "$n_predict" \
        --ctx-size 2048 \
        --threads "$(nproc)" \
        "$cuda_args" \
        --no-display-prompt \
        --simple-io 2>/dev/null

    local end_time
    end_time=$(date +%s.%3N)
    local duration
    duration=$(echo "$end_time - $start_time" | bc)

    log "Benchmark completed in ${duration}s"
    echo "Benchmark time: ${duration}s"
}

# Main function
main() {
    local command="$1"
    shift

    case "$command" in
        chat)
            chat_api "$@"
            ;;
        stream)
            stream_api "$@"
            ;;
        benchmark)
            benchmark_model "$@"
            ;;
        load)
            load_model "$1"
            ;;
        *)
            error "Unknown command: $command. Use: chat, stream, benchmark, or load"
            ;;
    esac
}

# If script is called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -eq 0 ]]; then
        error "Usage: $0 <command> [args...]"
    fi
    main "$@"
fi
