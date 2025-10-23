#!/bin/bash
# Integration Test for Hive-Mind Auto-Initialization System

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INIT_SCRIPT="${ROOT_DIR}/scripts/automation/hive-mind-init.sh"
HOOKS_SCRIPT="${ROOT_DIR}/scripts/automation/hive-mind-hooks.sh"
SESSION_DIR="${ROOT_DIR}/.hive-mind/sessions"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

log_test() {
  echo -e "${BLUE}[TEST]${NC} $*"
}

log_pass() {
  echo -e "${GREEN}[PASS]${NC} $*"
  ((TESTS_PASSED++))
}

log_fail() {
  echo -e "${RED}[FAIL]${NC} $*"
  ((TESTS_FAILED++))
}

# ============================================================================
# Test 1: Initialization Script Exists and is Executable
# ============================================================================
test_init_script_executable() {
  log_test "Test 1: Initialization script exists and is executable"

  if [[ -x "$INIT_SCRIPT" ]]; then
    log_pass "Initialization script is executable"
  else
    log_fail "Initialization script not found or not executable: $INIT_SCRIPT"
  fi
}

# ============================================================================
# Test 2: Hooks Script Exists and is Executable
# ============================================================================
test_hooks_script_executable() {
  log_test "Test 2: Hooks script exists and is executable"

  if [[ -x "$HOOKS_SCRIPT" ]]; then
    log_pass "Hooks script is executable"
  else
    log_fail "Hooks script not found or not executable: $HOOKS_SCRIPT"
  fi
}

# ============================================================================
# Test 3: Configuration File Exists
# ============================================================================
test_config_exists() {
  log_test "Test 3: Configuration file exists"

  local config_file="${ROOT_DIR}/config/hive-mind/default-config.yaml"

  if [[ -f "$config_file" ]]; then
    log_pass "Configuration file exists"
  else
    log_fail "Configuration file not found: $config_file"
  fi
}

# ============================================================================
# Test 4: Initialize Hive-Mind with Simple Task
# ============================================================================
test_simple_initialization() {
  log_test "Test 4: Initialize hive-mind with simple task"

  # Clean up previous session
  rm -f "${SESSION_DIR}/current-session.txt"

  if bash "$INIT_SCRIPT" "Test simple task" "simple" > /dev/null 2>&1; then
    log_pass "Simple task initialization succeeded"

    # Check if session was created
    if [[ -f "${SESSION_DIR}/current-session.txt" ]]; then
      log_pass "Session file created"
    else
      log_fail "Session file not created"
    fi
  else
    log_fail "Simple task initialization failed"
  fi
}

# ============================================================================
# Test 5: Pre-Task Hook
# ============================================================================
test_pre_task_hook() {
  log_test "Test 5: Pre-task hook execution"

  if bash "$HOOKS_SCRIPT" pre-task "Test task" "test-task-123" > /dev/null 2>&1; then
    log_pass "Pre-task hook executed successfully"
  else
    log_fail "Pre-task hook failed"
  fi
}

# ============================================================================
# Test 6: Post-Edit Hook
# ============================================================================
test_post_edit_hook() {
  log_test "Test 6: Post-edit hook execution"

  local test_file="${ROOT_DIR}/test-file-temp.txt"
  echo "test content" > "$test_file"

  if bash "$HOOKS_SCRIPT" post-edit "$test_file" "swarm/test/file" > /dev/null 2>&1; then
    log_pass "Post-edit hook executed successfully"
  else
    log_fail "Post-edit hook failed"
  fi

  rm -f "$test_file"
}

# ============================================================================
# Test 7: Session Metadata
# ============================================================================
test_session_metadata() {
  log_test "Test 7: Session metadata creation"

  if [[ -f "${SESSION_DIR}/current-session.txt" ]]; then
    local session_id=$(cat "${SESSION_DIR}/current-session.txt")
    local session_file="${SESSION_DIR}/${session_id}.json"

    if [[ -f "$session_file" ]]; then
      log_pass "Session metadata file exists"

      # Validate JSON structure
      if command -v jq > /dev/null 2>&1; then
        if jq -e '.sessionId' "$session_file" > /dev/null 2>&1; then
          log_pass "Session metadata has valid JSON structure"
        else
          log_fail "Session metadata has invalid JSON"
        fi
      else
        log_pass "Session file exists (jq not available for validation)"
      fi
    else
      log_fail "Session metadata file not created"
    fi
  else
    log_fail "No current session found"
  fi
}

# ============================================================================
# Test 8: Topology Detection
# ============================================================================
test_topology_detection() {
  log_test "Test 8: Topology auto-detection"

  # Test backend task (should use hierarchical)
  rm -f "${SESSION_DIR}/current-session.txt"

  if output=$(bash "$INIT_SCRIPT" "Build backend API server" "high" 2>&1); then
    if echo "$output" | grep -q "HIERARCHICAL\|hierarchical"; then
      log_pass "Backend task correctly detected hierarchical topology"
    else
      log_fail "Backend task did not detect hierarchical topology"
    fi
  else
    log_fail "Topology detection test failed to run"
  fi
}

# ============================================================================
# Test 9: Post-Task Hook
# ============================================================================
test_post_task_hook() {
  log_test "Test 9: Post-task hook execution"

  if bash "$HOOKS_SCRIPT" post-task "test-task-123" "completed" > /dev/null 2>&1; then
    log_pass "Post-task hook executed successfully"
  else
    log_fail "Post-task hook failed"
  fi
}

# ============================================================================
# Test 10: Documentation Exists
# ============================================================================
test_documentation_exists() {
  log_test "Test 10: Documentation file exists"

  local doc_file="${ROOT_DIR}/docs/automation/hive-mind-usage.md"

  if [[ -f "$doc_file" ]]; then
    log_pass "Documentation file exists"

    # Check if documentation has key sections
    if grep -q "## Overview" "$doc_file" && \
       grep -q "## Architecture" "$doc_file" && \
       grep -q "## Integration" "$doc_file"; then
      log_pass "Documentation has required sections"
    else
      log_fail "Documentation missing required sections"
    fi
  else
    log_fail "Documentation file not found: $doc_file"
  fi
}

# ============================================================================
# Run All Tests
# ============================================================================
main() {
  echo "=========================================="
  echo "HIVE-MIND INTEGRATION TESTS"
  echo "=========================================="
  echo ""

  test_init_script_executable
  test_hooks_script_executable
  test_config_exists
  test_simple_initialization
  test_pre_task_hook
  test_post_edit_hook
  test_session_metadata
  test_topology_detection
  test_post_task_hook
  test_documentation_exists

  echo ""
  echo "=========================================="
  echo "TEST RESULTS"
  echo "=========================================="
  echo -e "${GREEN}PASSED:${NC} $TESTS_PASSED"
  echo -e "${RED}FAILED:${NC} $TESTS_FAILED"
  echo "=========================================="

  if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
  else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
  fi
}

main "$@"
