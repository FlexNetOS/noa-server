#!/bin/bash
set -e

log_info() {
    echo "[INFO] $1"
}

test_passed() {
    echo "✓ $1"
}

log_info "Testing..."

if [[ -x "build/bin/llama-cli" ]]; then
    test_passed "llama-cli found and executable"
else
    echo "✗ llama-cli not found or not executable"
    exit 1
fi

if [[ -x "shims/gguf_loader.sh" ]]; then
    test_passed "gguf_loader.sh found and executable"
else
    echo "✗ gguf_loader.sh not found or not executable"
    exit 1
fi

if [[ -f "shims/http_bridge.py" ]]; then
    test_passed "http_bridge.py found"
else
    echo "✗ http_bridge.py not found"
    exit 1
fi

echo "All tests passed!"
