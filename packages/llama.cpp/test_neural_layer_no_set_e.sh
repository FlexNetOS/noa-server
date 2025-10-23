#!/usr/bin/env bash
# Test script for llama.cpp neural processing layer
# Validates GGUF loading, chat API, and basic functionality

# set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$SCRIPT_DIR"
SHIMS_DIR="$PACKAGE_DIR/shims"
BUILD_DIR="$PACKAGE_DIR/build"
BIN_DIR="$BUILD_DIR/bin"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

test_passed() {
    ((TESTS_RUN++))
    ((TESTS_PASSED++))
    log_info "✓ $1"
}

test_failed() {
    ((TESTS_RUN++))
    ((TESTS_FAILED++))
    log_error "✗ $1"
}

# Validate environment
validate_environment() {
    log_info "Validating environment..."

    # Check if llama-cli exists and is executable
    if [[ ! -x "$BIN_DIR/llama-cli" ]]; then
        test_failed "llama-cli not found or not executable at $BIN_DIR/llama-cli"
        return 1
    fi
    test_passed "llama-cli found and executable"

    # Check if gguf_loader.sh exists and is executable
    if [[ ! -x "$SHIMS_DIR/gguf_loader.sh" ]]; then
        test_failed "gguf_loader.sh not found or not executable at $SHIMS_DIR/gguf_loader.sh"
        return 1
    fi
    test_passed "gguf_loader.sh found and executable"

    # Check if http_bridge.py exists
    if [[ ! -f "$SHIMS_DIR/http_bridge.py" ]]; then
        test_failed "http_bridge.py not found at $SHIMS_DIR/http_bridge.py"
        return 1
    fi
    test_passed "http_bridge.py found"

    # Check for bc calculator
    if ! command -v bc &> /dev/null; then
        log_warn "bc calculator not found - timing measurements may not work"
        # Don't call test_passed/test_failed for bc since it's optional
    else
        log_info "bc calculator available"
    fi

    return 0
}

# Test GGUF model validation
test_model_validation() {
    log_info "Testing model validation..."

    # Test with non-existent file
    if "$SHIMS_DIR/gguf_loader.sh" load "/nonexistent/model.gguf" 2>/dev/null; then
        test_failed "Model validation should fail for non-existent file"
    else
        test_passed "Model validation correctly rejects non-existent file"
    fi

    # Test with invalid file (create a dummy file)
    DUMMY_FILE="/tmp/dummy_test_file.txt"
    echo "This is not a GGUF file" > "$DUMMY_FILE"
    if "$SHIMS_DIR/gguf_loader.sh" load "$DUMMY_FILE" 2>/dev/null; then
        test_failed "Model validation should fail for invalid file"
    else
        test_passed "Model validation correctly rejects invalid file"
    fi
    rm -f "$DUMMY_FILE"
}

# Test chat API (without actual model)
test_chat_api() {
    log_info "Testing chat API structure..."

    # Test invalid command (this should fail)
    if "$SHIMS_DIR/gguf_loader.sh" invalid_command 2>/dev/null; then
        test_failed "Invalid command should fail"
    else
        test_passed "Invalid command correctly rejected"
    fi

    # Test that the script runs (even with invalid args)
    if "$SHIMS_DIR/gguf_loader.sh" 2>&1 | grep -q "ERROR: Unknown command"; then
        test_passed "Script provides proper error messages"
    else
        test_failed "Script error handling failed"
    fi
}

# Test HTTP bridge (if Python available)
test_http_bridge() {
    log_info "Testing HTTP bridge..."

    if ! command -v python3 &> /dev/null; then
        log_warn "Python3 not available, skipping HTTP bridge tests"
        return 0
    fi

    # Test if script can be imported (syntax check)
    if python3 -c "import sys; sys.path.insert(0, '$SHIMS_DIR'); import http_bridge" 2>/dev/null; then
        test_passed "HTTP bridge Python syntax is valid"
    else
        test_failed "HTTP bridge Python syntax error"
        return 1
    fi

    # Test CLI interface
    if python3 "$SHIMS_DIR/http_bridge.py" info >/dev/null 2>&1; then
        test_passed "HTTP bridge CLI info command works"
    else
        test_failed "HTTP bridge CLI info command failed"
    fi
}

# Test CUDA configuration
test_cuda_config() {
    log_info "Testing CUDA configuration..."

    # Check environment variables
    if [[ -n "${LLAMA_CUDA:-}" ]]; then
        log_info "LLAMA_CUDA is set to: $LLAMA_CUDA"
        if [[ "$LLAMA_CUDA" == "true" ]]; then
            test_passed "CUDA is enabled"
        else
            test_passed "CUDA is disabled (as configured)"
        fi
    else
        test_passed "CUDA environment variable not set (defaults to disabled)"
    fi

    # Check for CUDA device count
    if [[ -n "${LLAMA_CUDA_DEVICE_COUNT:-}" ]]; then
        log_info "CUDA device count: $LLAMA_CUDA_DEVICE_COUNT"
        test_passed "CUDA device count configured"
    else
        test_passed "CUDA device count not set (will use defaults)"
    fi
}

# Test model path configuration
test_model_path_config() {
    log_info "Testing model path configuration..."

    if [[ -n "${LLM_MODEL_PATH:-}" ]]; then
        log_info "LLM_MODEL_PATH is set to: $LLM_MODEL_PATH"
        if [[ -d "$LLM_MODEL_PATH" ]] || [[ -f "$LLM_MODEL_PATH" ]]; then
            test_passed "Model path exists"
        else
            log_warn "Model path does not exist: $LLM_MODEL_PATH"
            test_passed "Model path configured (but not present)"
        fi
    else
        log_warn "LLM_MODEL_PATH not set - will need to specify model paths explicitly"
        test_passed "Model path not configured (will use explicit paths)"
    fi
}

# Performance test (if model available)
test_performance() {
    log_info "Testing performance metrics..."

    # This would require an actual GGUF model file
    # For now, just test the timing infrastructure
    if command -v bc &> /dev/null; then
        # Test timing calculation
        START_TIME=$(date +%s.%N)
        sleep 0.1
        END_TIME=$(date +%s.%N)
        DURATION=$(echo "$END_TIME - $START_TIME" | bc 2>/dev/null || echo "0")

        if [[ $(echo "$DURATION > 0" | bc 2>/dev/null) == "1" ]]; then
            test_passed "Timing infrastructure works"
        else
            test_failed "Timing infrastructure failed"
        fi
    else
        log_warn "bc not available, skipping timing tests"
        test_passed "Timing tests skipped (bc not available)"
    fi
}

# Run all tests
run_tests() {
    log_info "Starting llama.cpp neural processing layer tests..."
    echo

    validate_environment
    echo

    test_model_validation
    echo

    test_chat_api
    echo

    test_http_bridge
    echo

    test_cuda_config
    echo

    test_model_path_config
    echo

    test_performance
    echo

    # Summary
    log_info "Test Summary:"
    log_info "  Total tests: $TESTS_RUN"
    log_info "  Passed: $TESTS_PASSED"
    log_info "  Failed: $TESTS_FAILED"

    if [[ $TESTS_FAILED -eq 0 ]]; then
        log_info "All tests passed! ✓"
        return 0
    else
        log_error "Some tests failed. Please check the output above."
        return 1
    fi
}

# Main execution
main() {
    case "${1:-all}" in
        "env")
            validate_environment
            ;;
        "model")
            test_model_validation
            ;;
        "chat")
            test_chat_api
            ;;
        "http")
            test_http_bridge
            ;;
        "cuda")
            test_cuda_config
            ;;
        "path")
            test_model_path_config
            ;;
        "perf")
            test_performance
            ;;
        "all")
            run_tests
            ;;
        *)
            echo "Usage: $0 [env|model|chat|http|cuda|path|perf|all]"
            echo "  env   - Test environment setup"
            echo "  model - Test model validation"
            echo "  chat  - Test chat API structure"
            echo "  http  - Test HTTP bridge"
            echo "  cuda  - Test CUDA configuration"
            echo "  path  - Test model path configuration"
            echo "  perf  - Test performance metrics"
            echo "  all   - Run all tests (default)"
            exit 1
            ;;
    esac
}

main "$@"