#!/bin/bash
# Generic task runner that dispatches to scripts/tasks/<task>.sh.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TASKS_DIR="$ROOT_DIR/scripts/tasks"
LOG_DIR="$ROOT_DIR/logs/tasks"
mkdir -p "$LOG_DIR" "$TASKS_DIR"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <task-name> [args...]" >&2
  exit 64
fi

TASK_NAME="$1"
shift || true

TASK_SCRIPT="$TASKS_DIR/${TASK_NAME}.sh"
LOG_FILE="$LOG_DIR/${TASK_NAME}.log"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

echo "[$(timestamp)] [INFO] Starting task '${TASK_NAME}'" | tee -a "$LOG_FILE"
if [[ -x "$TASK_SCRIPT" ]]; then
  if ! "$TASK_SCRIPT" "$@" >>"$LOG_FILE" 2>&1; then
    echo "[$(timestamp)] [ERROR] Task '${TASK_NAME}' failed. See $LOG_FILE" | tee -a "$LOG_FILE"
    exit 1
  fi
else
  echo "[$(timestamp)] [WARN] Task script ${TASK_SCRIPT} not found or not executable. Creating placeholder." | tee -a "$LOG_FILE"
  cat >"$TASK_SCRIPT" <<'EOF'
#!/bin/bash
set -euo pipefail
echo "Task placeholder: $(basename "$0" .sh) is not yet implemented."
exit 0
EOF
  chmod +x "$TASK_SCRIPT"
  echo "[$(timestamp)] [INFO] Placeholder created for '${TASK_NAME}'. No action taken." | tee -a "$LOG_FILE"
fi
echo "[$(timestamp)] [INFO] Completed task '${TASK_NAME}'" | tee -a "$LOG_FILE"
