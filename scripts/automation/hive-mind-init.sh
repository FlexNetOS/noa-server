#!/bin/bash
# Hive-Mind Auto-Initialization System
# Automatically initializes Claude Flow swarm coordination before all tasks

set -euo pipefail

# ============================================================================
# Configuration & Environment Setup
# ============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIG_DIR="${ROOT_DIR}/config/hive-mind"
DEFAULT_CONFIG="${CONFIG_DIR}/default-config.yaml"
SESSION_DIR="${ROOT_DIR}/.hive-mind/sessions"
LOG_DIR="${ROOT_DIR}/logs/hive-mind"
MEMORY_DIR="${ROOT_DIR}/.hive-mind/memory"

# Create necessary directories
mkdir -p "$SESSION_DIR" "$LOG_DIR" "$MEMORY_DIR"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log_info() {
  echo -e "${BLUE}[$(timestamp)] [INFO]${NC} $*" | tee -a "${LOG_DIR}/init.log"
}

log_success() {
  echo -e "${GREEN}[$(timestamp)] [SUCCESS]${NC} $*" | tee -a "${LOG_DIR}/init.log"
}

log_warn() {
  echo -e "${YELLOW}[$(timestamp)] [WARN]${NC} $*" | tee -a "${LOG_DIR}/init.log"
}

log_error() {
  echo -e "${RED}[$(timestamp)] [ERROR]${NC} $*" | tee -a "${LOG_DIR}/init.log"
}

# ============================================================================
# Configuration Loading
# ============================================================================

load_config() {
  if [[ ! -f "$DEFAULT_CONFIG" ]]; then
    log_error "Configuration file not found: $DEFAULT_CONFIG"
    exit 1
  fi

  # Parse YAML config using yq
  TOPOLOGY=$(yq '.topology' "$DEFAULT_CONFIG" | tr -d '"')
  MAX_AGENTS=$(yq '.maxAgents' "$DEFAULT_CONFIG")
  ENABLE_MEMORY=$(yq '.enableMemory' "$DEFAULT_CONFIG")
  ENABLE_NEURAL=$(yq '.enableNeural' "$DEFAULT_CONFIG")
  AUTO_ASSIGN=$(yq '.autoAssignment.autoAssignByFileType' "$DEFAULT_CONFIG")

  # Read coordinator types
  COORDINATOR_TYPES=$(yq '.coordinatorTypes[]' "$DEFAULT_CONFIG" | tr '\n' ',' | sed 's/,$//')

  log_info "Configuration loaded:"
  log_info "  Topology: ${TOPOLOGY}"
  log_info "  Max Agents: ${MAX_AGENTS}"
  log_info "  Memory Enabled: ${ENABLE_MEMORY}"
  log_info "  Neural Enabled: ${ENABLE_NEURAL}"
  log_info "  Coordinators: ${COORDINATOR_TYPES}"
}

# ============================================================================
# Topology Auto-Detection
# ============================================================================

detect_optimal_topology() {
  local task_description="$1"
  local task_complexity="${2:-medium}"

  log_info "Auto-detecting optimal topology for task: ${task_description}"

  # Complexity-based topology selection
  case "$task_complexity" in
    simple|low)
      TOPOLOGY="mesh"
      MAX_AGENTS=3
      log_info "Simple task detected -> Using MESH topology with 3 agents"
      ;;
    medium)
      TOPOLOGY="adaptive"
      MAX_AGENTS=6
      log_info "Medium complexity task -> Using ADAPTIVE topology with 6 agents"
      ;;
    complex|high)
      TOPOLOGY="hierarchical"
      MAX_AGENTS=10
      log_info "Complex task detected -> Using HIERARCHICAL topology with 10 agents"
      ;;
    *)
      # Use config defaults
      log_info "Using default topology from config: ${TOPOLOGY}"
      ;;
  esac

  # Task-specific overrides
  if echo "$task_description" | grep -qi "backend\|api\|server"; then
    TOPOLOGY="hierarchical"
    log_info "Backend development detected -> Forcing HIERARCHICAL topology"
  elif echo "$task_description" | grep -qi "research\|analyze"; then
    TOPOLOGY="mesh"
    log_info "Research task detected -> Forcing MESH topology"
  elif echo "$task_description" | grep -qi "test\|qa"; then
    TOPOLOGY="adaptive"
    log_info "Testing task detected -> Forcing ADAPTIVE topology"
  fi
}

# ============================================================================
# Swarm Initialization
# ============================================================================

initialize_swarm() {
  local session_id="swarm-$(date +%s)-$$"
  local session_file="${SESSION_DIR}/${session_id}.json"

  log_info "Initializing Claude Flow swarm..."
  log_info "Session ID: ${session_id}"

  # Initialize swarm with detected topology
  local init_output
  if init_output=$(npx claude-flow@alpha swarm init \
    --topology "$TOPOLOGY" \
    --max-agents "$MAX_AGENTS" \
    --session-id "$session_id" \
    2>&1); then

    log_success "Swarm initialized successfully"

    # Store session metadata
    cat > "$session_file" <<EOF
{
  "sessionId": "${session_id}",
  "topology": "${TOPOLOGY}",
  "maxAgents": ${MAX_AGENTS},
  "timestamp": "$(timestamp)",
  "status": "active",
  "coordinators": []
}
EOF

    # Export session ID for other scripts
    echo "$session_id" > "${SESSION_DIR}/current-session.txt"
    export HIVE_MIND_SESSION_ID="$session_id"

    log_info "Session file created: ${session_file}"
  else
    log_warn "Swarm init returned warning (may already be initialized):"
    log_warn "$init_output"

    # Create session file anyway for tracking
    cat > "$session_file" <<EOF
{
  "sessionId": "${session_id}",
  "topology": "${TOPOLOGY}",
  "maxAgents": ${MAX_AGENTS},
  "timestamp": "$(timestamp)",
  "status": "active-existing",
  "note": "Swarm may have been previously initialized"
}
EOF
    echo "$session_id" > "${SESSION_DIR}/current-session.txt"
  fi

  echo "$session_id"
}

# ============================================================================
# Coordinator Agents Setup
# ============================================================================

spawn_coordinators() {
  local session_id="$1"

  log_info "Spawning coordinator agents..."

  # Split coordinator types by comma
  IFS=',' read -ra COORDS <<< "$COORDINATOR_TYPES"

  for coordinator in "${COORDS[@]}"; do
    coordinator=$(echo "$coordinator" | xargs) # trim whitespace

    log_info "Spawning coordinator: ${coordinator}"

    if npx claude-flow@alpha agent spawn \
      --type "$coordinator" \
      --session-id "$session_id" \
      2>&1 | tee -a "${LOG_DIR}/coordinators.log"; then

      log_success "Coordinator spawned: ${coordinator}"
    else
      log_warn "Failed to spawn coordinator: ${coordinator} (may not be critical)"
    fi
  done
}

# ============================================================================
# Memory Layer Setup
# ============================================================================

initialize_memory() {
  local session_id="$1"

  if [[ "$ENABLE_MEMORY" != "true" ]]; then
    log_info "Memory layer disabled in config"
    return 0
  fi

  log_info "Initializing memory layer..."

  # Create memory structure
  local memory_session_dir="${MEMORY_DIR}/${session_id}"
  mkdir -p "$memory_session_dir"

  # Initialize memory store via hooks
  if npx claude-flow@alpha hooks session-restore \
    --session-id "$session_id" \
    2>&1 | tee -a "${LOG_DIR}/memory.log"; then

    log_success "Memory layer initialized"
  else
    log_warn "Memory initialization had issues (non-critical)"
  fi

  # Store initial state
  cat > "${memory_session_dir}/init-state.json" <<EOF
{
  "sessionId": "${session_id}",
  "topology": "${TOPOLOGY}",
  "timestamp": "$(timestamp)",
  "memoryEnabled": true,
  "neuralEnabled": ${ENABLE_NEURAL}
}
EOF
}

# ============================================================================
# Health Check
# ============================================================================

health_check() {
  log_info "Running hive-mind health check..."

  local health_status=0

  # Check if swarm is responsive
  if npx claude-flow@alpha swarm status 2>&1 | grep -qi "active\|running"; then
    log_success "Swarm status: HEALTHY"
  else
    log_warn "Swarm status: UNKNOWN"
    health_status=1
  fi

  # Check memory directory
  if [[ -d "$MEMORY_DIR" ]]; then
    log_success "Memory storage: READY"
  else
    log_error "Memory storage: NOT READY"
    health_status=1
  fi

  # Check session tracking
  if [[ -f "${SESSION_DIR}/current-session.txt" ]]; then
    local current_session=$(cat "${SESSION_DIR}/current-session.txt")
    log_success "Current session: ${current_session}"
  else
    log_warn "No active session found"
    health_status=1
  fi

  return $health_status
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
  local task_description="${1:-General task execution}"
  local complexity="${2:-medium}"

  log_info "=========================================="
  log_info "HIVE-MIND AUTO-INITIALIZATION"
  log_info "=========================================="

  # Step 1: Load configuration
  load_config

  # Step 2: Auto-detect optimal topology
  detect_optimal_topology "$task_description" "$complexity"

  # Step 3: Initialize swarm
  local session_id
  session_id=$(initialize_swarm)

  # Step 4: Spawn coordinator agents
  spawn_coordinators "$session_id"

  # Step 5: Initialize memory layer
  initialize_memory "$session_id"

  # Step 6: Health check
  if health_check; then
    log_success "=========================================="
    log_success "HIVE-MIND INITIALIZATION COMPLETE"
    log_success "Session ID: ${session_id}"
    log_success "Topology: ${TOPOLOGY}"
    log_success "Max Agents: ${MAX_AGENTS}"
    log_success "=========================================="

    # Output session info for parent process
    cat <<EOF
HIVE_MIND_SESSION_ID=${session_id}
HIVE_MIND_TOPOLOGY=${TOPOLOGY}
HIVE_MIND_MAX_AGENTS=${MAX_AGENTS}
HIVE_MIND_STATUS=active
EOF
  else
    log_warn "Hive-mind initialized with warnings"
    exit 0  # Non-critical, allow execution to continue
  fi
}

# Execute main function
main "$@"
