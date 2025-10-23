<!-- filepath: /home/deflex/workspace/tools/todo-hooks/01-noa-auth-verify.sh -->
#!/bin/bash

# NOA Auth Service Verification Hook
# Triggers authentication and verification for completed tasks

set -euo pipefail

NOA_AUTH_SERVICE="$HOME/noa-server/packages/auth-service"
LOG_FILE="$HOME/logs/applications/noa-auth-hook.log"

# Ensure the service directory exists
if [[ ! -d "$NOA_AUTH_SERVICE" ]]; then
    echo "Warning: NOA auth service not found at $NOA_AUTH_SERVICE"
    exit 0
fi

# Log the hook execution
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Auth verification triggered" >> "$LOG_FILE"
echo "Task JSON: $TASK_JSON" >> "$LOG_FILE"
echo "Completion Time: $COMPLETION_TIMESTAMP" >> "$LOG_FILE"

# Parse task details
PRIORITY=$(echo "$TASK_JSON" | grep -oP '"priority":"\K[^"]+' || echo "unknown")
CATEGORY=$(echo "$TASK_JSON" | grep -oP '"category":"\K[^"]+' || echo "unknown")
DESCRIPTION=$(echo "$TASK_JSON" | grep -oP '"description":"\K[^"]+' || echo "unknown")

# Prepare auth verification payload
AUTH_PAYLOAD=$(cat <<EOF
{
  "event": "task_completion",
  "timestamp": "$COMPLETION_TIMESTAMP",
  "task": {
    "priority": "$PRIORITY",
    "category": "$CATEGORY",
    "description": "$DESCRIPTION"
  },
  "verifier": "$(whoami)",
  "source": "todo_helper",
  "verification_type": "automated"
}
EOF
)

# Check if the auth service has a verification endpoint
if [[ -f "$NOA_AUTH_SERVICE/verify-completion.js" ]]; then
    # Run the Node.js verification script
    cd "$NOA_AUTH_SERVICE"
    echo "$AUTH_PAYLOAD" | node verify-completion.js 2>&1 | tee -a "$LOG_FILE"
elif [[ -f "$NOA_AUTH_SERVICE/verify.sh" ]]; then
    # Run the shell verification script
    cd "$NOA_AUTH_SERVICE"
    echo "$AUTH_PAYLOAD" | ./verify.sh 2>&1 | tee -a "$LOG_FILE"
else
    # Create a verification record
    VERIFY_FILE="$NOA_AUTH_SERVICE/verifications/$(date +%Y%m%d_%H%M%S)_task.json"
    mkdir -p "$(dirname "$VERIFY_FILE")"
    echo "$AUTH_PAYLOAD" > "$VERIFY_FILE"
    echo "Verification record created: $VERIFY_FILE" | tee -a "$LOG_FILE"
fi

# Signal success
echo "✓ NOA Auth verification completed"
exit 0
