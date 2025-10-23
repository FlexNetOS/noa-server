#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST_DIR="$ROOT_DIR/packages/ui-dashboard/dist"
LOG_DIR="$ROOT_DIR/logs/ui"
PID_FILE="$LOG_DIR/ui.pid"
PORT="${UI_PORT:-9200}"

mkdir -p "$LOG_DIR"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "[ui:start] UI dashboard not built. Run npm run ui:build first." >&2
  exit 1
fi

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "[ui:start] UI server already running (PID $(cat "$PID_FILE"))."
  exit 0
fi

nohup python3 -m http.server "$PORT" --directory "$DIST_DIR" >"$LOG_DIR/server.log" 2>&1 &
echo $! > "$PID_FILE"
echo "[ui:start] UI server started on http://localhost:$PORT (PID $(cat "$PID_FILE"))"
