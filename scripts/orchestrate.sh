#!/bin/bash
# Claude Suite orchestration pipeline
# Sequences automation steps defined in docs/requirements/task_graph.md.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs/orchestrator"
STATE_DIR="$ROOT_DIR/logs/orchestrator/state"
mkdir -p "$LOG_DIR" "$STATE_DIR"

log() {
  local level="$1"
  local message="$2"
  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "[$timestamp] [$level] $message" | tee -a "$LOG_DIR/orchestrate.log"
}

record_state() {
  local step="$1"
  local status="$2"
  echo "$status" > "$STATE_DIR/${step}.status"
}

invoke_npm() {
  local script="$1"
  shift || true
  if [[ ! -f "$ROOT_DIR/package.json" ]]; then
    log "WARN" "package.json missing; skipping npm run $script"
    return 0
  fi

  if ! npm run "$script" --silent --if-present "$@" >>"$LOG_DIR/${script}.log" 2>&1; then
    log "ERROR" "npm run $script failed. Inspect $LOG_DIR/${script}.log"
    exit 1
  fi
  log "INFO" "npm run $script succeeded."
}

invoke_script() {
  local script_path="$1"
  shift || true
  if [[ ! -x "$script_path" ]]; then
    log "WARN" "Script $script_path not executable or missing; skipping."
    return 0
  fi
  if ! "$script_path" "$@" >>"$LOG_DIR/$(basename "$script_path").log" 2>&1; then
    log "ERROR" "Invocation failed for $script_path. See logs."
    exit 1
  fi
  log "INFO" "$script_path completed."
}

run_step() {
  local id="$1"
  local description="$2"
  local action="$3"

  log "INFO" ">>> [$id] $description"
  record_state "$id" "in-progress"

  case "$action" in
    npm:*)
      invoke_npm "${action#npm:}"
      ;;
    script:*)
      invoke_script "$ROOT_DIR/${action#script:}"
      ;;
    noop)
      log "INFO" "No operation for $id. Placeholder until implementation."
      ;;
    *)
      log "WARN" "Unknown action type '$action' for $id. Marking as skipped."
      record_state "$id" "skipped"
      return
      ;;
  esac

  record_state "$id" "completed"
  log "INFO" "<<< [$id] completed"
}

main() {
  log "INFO" "Starting Claude Suite orchestration pipeline"

  run_step "P0" "Initialize swarm context" "npm:swarm:init"
  run_step "P1" "Build requirements matrix" "noop"
  run_step "P2" "Consolidate repositories & workspaces" "npm:workspace:sync"
  run_step "P3" "Provision runtimes" "npm:runtime:bootstrap"
  run_step "P4" "Scaffold configuration & secrets" "npm:config:scaffold"
  run_step "P5" "Execute setup automation scripts" "script:scripts/setup.sh"
  run_step "P6" "Initialize memory system" "npm:memory:init"
  run_step "P7" "Register contains-studio agents" "npm:agents:sync"
  run_step "P8" "Verify MCP server tools" "npm:mcp:verify"
  run_step "P9" "Wire claude-flow and flow-nexus" "npm:flow:integrate"
  run_step "P10" "Run neural layer smoke tests" "npm:neural:test"
  run_step "P11" "Execute training pipelines" "npm:swarm:train"
  run_step "P12" "Collect performance benchmarks" "npm:bench"
  run_step "P13" "Build UI dashboard" "npm:ui:build"
  run_step "P14" "Run verification & Truth Gate" "npm:truth-gate"
  run_step "P15" "Export claude-suite package" "npm:export"
  run_step "P16" "Generate final release report" "npm:release:report"

  log "INFO" "Pipeline completed"
}

main "$@"
