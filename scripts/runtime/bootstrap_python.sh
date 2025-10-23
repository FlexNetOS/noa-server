#!/bin/bash
# Bootstrap Python virtual environment and install requirements deterministically.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_DIR="$ROOT_DIR/.venv"
REQUIREMENTS_FILE="$ROOT_DIR/requirements.txt"
PYTHON_BIN="${PYTHON_BIN:-python3}"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
  echo "[$(timestamp)] [bootstrap_python] $1"
}

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  log "Python interpreter '$PYTHON_BIN' not found."
  exit 1
fi

if [[ ! -d "$VENV_DIR" ]]; then
  log "Creating virtual environment at $VENV_DIR"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
else
  log "Virtual environment already exists."
fi

source "$VENV_DIR/bin/activate"

python -m pip install --upgrade pip >/dev/null

if [[ -f "$REQUIREMENTS_FILE" ]]; then
  log "Installing requirements from $REQUIREMENTS_FILE"
  pip install --no-cache-dir -r "$REQUIREMENTS_FILE"
else
  log "No requirements.txt found; skipping dependency install."
fi

log "Python environment ready."
