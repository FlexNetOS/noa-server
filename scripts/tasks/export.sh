#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT="$ROOT_DIR/claude-suite.zip"

rm -f "$OUTPUT"

echo "[export] Creating claude-suite.zip"
zip -r "$OUTPUT" . \
  -x "*.git*" \
  -x "node_modules/*" \
  -x "*.venv/*" \
  -x "logs/ui/server.log" \
  -x "logs/orchestrator/state/*" \
  -x "claude-suite.zip"

python3 <<'PY'
import hashlib
import json
from pathlib import Path

root = Path('.')
output = root / 'claude-suite.zip'
manifest = {
    'artifact': str(output),
    'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
}
(root / '.export_manifest.json').write_text(json.dumps(manifest, indent=2))
print('Export manifest written to .export_manifest.json')
PY
