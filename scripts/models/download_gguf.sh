#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODELS_DIR="$ROOT_DIR/models"
FILE_NAME="ggml-vocab-llama-bpe.gguf"
URL="https://raw.githubusercontent.com/ggerganov/llama.cpp/master/models/${FILE_NAME}"
OUTPUT="$MODELS_DIR/$FILE_NAME"

mkdir -p "$MODELS_DIR"

echo "[download_gguf] Downloading $FILE_NAME"
curl --fail --location --output "$OUTPUT" "$URL"

sha256sum "$OUTPUT" > "$OUTPUT.sha256"
echo "[download_gguf] Saved to $OUTPUT with checksum $OUTPUT.sha256"
