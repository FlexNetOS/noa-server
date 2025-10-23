#!/bin/bash
# Hive-Mind Coordination Hooks
# Pre-task, post-task, and session management hooks

set -euo pipefail

# ============================================================================
# Configuration & Environment Setup
# ============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SESSION_DIR="${ROOT_DIR}/.hive-mind/sessions"
LOG_DIR="${ROOT_DIR}/logs/hive-mind"
MEMORY_DIR="${ROOT_DIR}/.hive-mind/memory"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log_info() {
  echo -e "${BLUE}[$(timestamp)] [HOOK]${NC} $*" | tee -a "${LOG_DIR}/hooks.log"
}

log_success() {
  echo -e "${GREEN}[$(timestamp)] [HOOK]${NC} $*" | tee -a "${LOG_DIR}/hooks.log"
}

log_warn() {
  echo -e "${YELLOW}[$(timestamp)] [HOOK]${NC} $*" | tee -a "${LOG_DIR}/hooks.log"
}

log_error() {
  echo -e "${RED}[$(timestamp)] [HOOK]${NC} $*" | tee -a "${LOG_DIR}/hooks.log"
}

# ============================================================================
# Session Management
# ============================================================================

get_current_session() {
  if [[ -f "${SESSION_DIR}/current-session.txt" ]]; then
    cat "${SESSION_DIR}/current-session.txt"
  else
    echo ""
  fi
}

set_current_session() {
  local session_id="$1"
  echo "$session_id" > "${SESSION_DIR}/current-session.txt"
  export HIVE_MIND_SESSION_ID="$session_id"
}

# ============================================================================
# Pre-Task Hook
# ============================================================================

pre_task_hook() {
  local task_description="$1"
  local task_id="${2:-task-$(date +%s)}"

  log_info "=========================================="
  log_info "PRE-TASK HOOK: ${task_description}"
  log_info "Task ID: ${task_id}"
  log_info "=========================================="

  # Check if hive-mind is active
  local current_session
  current_session=$(get_current_session)

  if [[ -z "$current_session" ]]; then
    log_warn "No active hive-mind session found"
    log_info "Initializing hive-mind automatically..."

    # Auto-initialize hive-mind
    if bash "${ROOT_DIR}/scripts/automation/hive-mind-init.sh" "$task_description"; then
      current_session=$(get_current_session)
      log_success "Hive-mind auto-initialized: ${current_session}"
    else
      log_error "Failed to auto-initialize hive-mind"
      return 1
    fi
  else
    log_success "Active session found: ${current_session}"
  fi

  # Run Claude Flow pre-task hook
  log_info "Running Claude Flow pre-task hook..."
  if npx claude-flow@alpha hooks pre-task \
    --description "$task_description" \
    --task-id "$task_id" \
    2>&1 | tee -a "${LOG_DIR}/pre-task.log"; then

    log_success "Pre-task hook completed"
  else
    log_warn "Pre-task hook had issues (non-critical)"
  fi

  # Store task metadata
  local task_file="${MEMORY_DIR}/${current_session}/task-${task_id}.json"
  mkdir -p "$(dirname "$task_file")"

  cat > "$task_file" <<EOF
{
  "taskId": "${task_id}",
  "description": "${task_description}",
  "sessionId": "${current_session}",
  "startTime": "$(timestamp)",
  "status": "in-progress"
}
EOF

  log_success "Task metadata stored: ${task_file}"
}

# ============================================================================
# Post-Task Hook
# ============================================================================

post_task_hook() {
  local task_id="${1:-}"
  local status="${2:-completed}"

  log_info "=========================================="
  log_info "POST-TASK HOOK"
  log_info "Task ID: ${task_id}"
  log_info "Status: ${status}"
  log_info "=========================================="

  local current_session
  current_session=$(get_current_session)

  if [[ -z "$current_session" ]]; then
    log_warn "No active session for post-task hook"
    return 0
  fi

  # Run Claude Flow post-task hook
  if [[ -n "$task_id" ]]; then
    log_info "Running Claude Flow post-task hook..."
    if npx claude-flow@alpha hooks post-task \
      --task-id "$task_id" \
      2>&1 | tee -a "${LOG_DIR}/post-task.log"; then

      log_success "Post-task hook completed"
    else
      log_warn "Post-task hook had issues (non-critical)"
    fi
  fi

  # Update task metadata
  local task_file="${MEMORY_DIR}/${current_session}/task-${task_id}.json"
  if [[ -f "$task_file" ]]; then
    # Update status and completion time
    local temp_file="${task_file}.tmp"
    jq --arg status "$status" \
       --arg endTime "$(timestamp)" \
       '.status = $status | .endTime = $endTime' \
       "$task_file" > "$temp_file" && mv "$temp_file" "$task_file"

    log_success "Task metadata updated: ${status}"
  fi

  # Generate task summary
  log_info "Task execution summary:"
  log_info "  Session: ${current_session}"
  log_info "  Task: ${task_id}"
  log_info "  Status: ${status}"
}

# ============================================================================
# Post-Edit Hook (for file modifications)
# ============================================================================

post_edit_hook() {
  local file_path="$1"
  local memory_key="${2:-swarm/edits/$(basename "$file_path")}"

  log_info "POST-EDIT HOOK: ${file_path}"

  local current_session
  current_session=$(get_current_session)

  if [[ -z "$current_session" ]]; then
    log_warn "No active session for post-edit hook"
    return 0
  fi

  # Run Claude Flow post-edit hook
  if npx claude-flow@alpha hooks post-edit \
    --file "$file_path" \
    --memory-key "$memory_key" \
    2>&1 | tee -a "${LOG_DIR}/post-edit.log"; then

    log_success "Post-edit hook completed for: ${file_path}"
  else
    log_warn "Post-edit hook had issues (non-critical)"
  fi

  # Track edited files in session
  local edits_file="${MEMORY_DIR}/${current_session}/edited-files.json"

  if [[ -f "$edits_file" ]]; then
    # Append to existing list
    local temp_file="${edits_file}.tmp"
    jq --arg file "$file_path" \
       --arg timestamp "$(timestamp)" \
       --arg memoryKey "$memory_key" \
       '.edits += [{file: $file, timestamp: $timestamp, memoryKey: $memoryKey}]' \
       "$edits_file" > "$temp_file" && mv "$temp_file" "$edits_file"
  else
    # Create new list
    cat > "$edits_file" <<EOF
{
  "sessionId": "${current_session}",
  "edits": [
    {
      "file": "${file_path}",
      "timestamp": "$(timestamp)",
      "memoryKey": "${memory_key}"
    }
  ]
}
EOF
  fi
}

# ============================================================================
# Session Restore Hook
# ============================================================================

session_restore_hook() {
  local session_id="${1:-}"

  if [[ -z "$session_id" ]]; then
    session_id=$(get_current_session)
  fi

  if [[ -z "$session_id" ]]; then
    log_error "No session ID provided for restore"
    return 1
  fi

  log_info "=========================================="
  log_info "SESSION RESTORE: ${session_id}"
  log_info "=========================================="

  # Run Claude Flow session restore
  if npx claude-flow@alpha hooks session-restore \
    --session-id "$session_id" \
    2>&1 | tee -a "${LOG_DIR}/session-restore.log"; then

    log_success "Session restored: ${session_id}"
    set_current_session "$session_id"
  else
    log_warn "Session restore had issues (non-critical)"
  fi
}

# ============================================================================
# Session End Hook
# ============================================================================

session_end_hook() {
  local export_metrics="${1:-true}"

  log_info "=========================================="
  log_info "SESSION END HOOK"
  log_info "=========================================="

  local current_session
  current_session=$(get_current_session)

  if [[ -z "$current_session" ]]; then
    log_warn "No active session to end"
    return 0
  fi

  log_info "Ending session: ${current_session}"

  # Run Claude Flow session end
  local session_end_args=()
  if [[ "$export_metrics" == "true" ]]; then
    session_end_args+=(--export-metrics true)
  fi

  if npx claude-flow@alpha hooks session-end \
    "${session_end_args[@]}" \
    2>&1 | tee -a "${LOG_DIR}/session-end.log"; then

    log_success "Session ended successfully"
  else
    log_warn "Session end had issues (non-critical)"
  fi

  # Archive session data
  local archive_dir="${SESSION_DIR}/archive"
  mkdir -p "$archive_dir"

  local session_file="${SESSION_DIR}/${current_session}.json"
  if [[ -f "$session_file" ]]; then
    # Update session status
    local temp_file="${session_file}.tmp"
    jq --arg endTime "$(timestamp)" \
       '.status = "completed" | .endTime = $endTime' \
       "$session_file" > "$temp_file" && mv "$temp_file" "$session_file"

    # Move to archive
    mv "$session_file" "${archive_dir}/"
    log_success "Session archived: ${archive_dir}/${current_session}.json"
  fi

  # Clear current session
  rm -f "${SESSION_DIR}/current-session.txt"
  log_success "Session cleared from active state"
}

# ============================================================================
# Notification Hook
# ============================================================================

notify_hook() {
  local message="$1"
  local level="${2:-info}"

  local current_session
  current_session=$(get_current_session)

  # Run Claude Flow notify hook
  if npx claude-flow@alpha hooks notify \
    --message "$message" \
    2>&1 | tee -a "${LOG_DIR}/notifications.log"; then

    log_success "Notification sent: ${message}"
  else
    log_warn "Notification hook had issues (non-critical)"
  fi

  # Log to session notifications
  if [[ -n "$current_session" ]]; then
    local notifications_file="${MEMORY_DIR}/${current_session}/notifications.json"

    if [[ -f "$notifications_file" ]]; then
      local temp_file="${notifications_file}.tmp"
      jq --arg message "$message" \
         --arg level "$level" \
         --arg timestamp "$(timestamp)" \
         '.notifications += [{message: $message, level: $level, timestamp: $timestamp}]' \
         "$notifications_file" > "$temp_file" && mv "$temp_file" "$notifications_file"
    else
      cat > "$notifications_file" <<EOF
{
  "sessionId": "${current_session}",
  "notifications": [
    {
      "message": "${message}",
      "level": "${level}",
      "timestamp": "$(timestamp)"
    }
  ]
}
EOF
    fi
  fi
}

# ============================================================================
# Main Hook Dispatcher
# ============================================================================

main() {
  local hook_type="${1:-}"
  shift || true

  mkdir -p "$SESSION_DIR" "$LOG_DIR" "$MEMORY_DIR"

  case "$hook_type" in
    pre-task)
      pre_task_hook "$@"
      ;;
    post-task)
      post_task_hook "$@"
      ;;
    post-edit)
      post_edit_hook "$@"
      ;;
    session-restore)
      session_restore_hook "$@"
      ;;
    session-end)
      session_end_hook "$@"
      ;;
    notify)
      notify_hook "$@"
      ;;
    *)
      log_error "Unknown hook type: ${hook_type}"
      echo "Usage: $0 {pre-task|post-task|post-edit|session-restore|session-end|notify} [args...]"
      exit 1
      ;;
  esac
}

# Execute main dispatcher
main "$@"
