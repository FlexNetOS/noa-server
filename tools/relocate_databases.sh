#!/usr/bin/env bash
set -euo pipefail

# Relocate database files into noa-server/databases and create symlinks.
# Supported extensions: .db, .sqlite, .sqlite3, .duckdb
# Exclusions: node_modules, .git, venv/.venv, praisonai_env, go/*/pkg, go/*/bin, data/snapshots, data/exports,
# downloads, ~/.npm-global, .vscode-server, system caches (.cache, .vs), container storage (~/.local/share/containers),
# rust cargo registry, NSS cert DBs at home (./.pki), generic Backups directories, large data/storage

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TARGET_DIR="$ROOT_DIR/noa-server/databases"
LOG_DIR="$ROOT_DIR/logs/development"
INVENTORY_FILE="$ROOT_DIR/noa-server/databases/INVENTORY.md"
DRY_RUN="true"

usage() {
  echo "Usage: $0 [--apply]" >&2
}

if [[ "${1:-}" == "--apply" ]]; then
  DRY_RUN="false"
fi

mkdir -p "$TARGET_DIR" "$LOG_DIR"

# Build find command with robust pruning of common exclusions
cd "$ROOT_DIR"

echo "[info] Scanning for database files under $ROOT_DIR" >&2
mapfile -t DB_FILES < <(
  find . \
    \( \
      -path './.git' -o -path './.git/*' -o \
      -path './.cache' -o -path './.cache/*' -o \
      -path './.vs' -o -path './.vs/*' -o \
      -path '*/node_modules/*' -o \
      -path '*/.venv/*' -o -path '*/venv/*' -o \
      -path '*/praisonai_env/*' -o \
      -path '*/go/bin/*' -o -path '*/go/pkg/*' -o \
      -path '*/.vscode-server/*' -o \
      -path './.local/share/containers' -o -path './.local/share/containers/*' -o \
      -path './.npm-global' -o -path './.npm-global/*' -o \
      -path './.cargo' -o -path './.cargo/*' -o \
      -path './.pki' -o -path './.pki/*' -o \
      -path './data/snapshots/*' -o -path './data/exports/*' -o \
      -path './data/storage/*' -o \
      -path '*/Backups/*' -o \
      -path './downloads/*' -o \
      -path './noa-server/databases/*' \
    \) -prune -o \
    -type f \( -iname '*.db' -o -iname '*.sqlite' -o -iname '*.sqlite3' -o -iname '*.duckdb' \) -print 2>/dev/null \
  | sort
)

if [[ ${#DB_FILES[@]} -eq 0 ]]; then
  echo "[info] No database files found." >&2
  exit 0
fi

echo "[info] Found ${#DB_FILES[@]} database file(s)." >&2

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
{
  echo "# Database Inventory"
  echo
  echo "Scanned at: $TS (UTC)"
  echo
  echo "| Source Path | New Path | Symlink Back | Size (bytes) | SHA-256 |"
  echo "| --- | --- | --- | ---: | --- |"
} > "$INVENTORY_FILE"

for src in "${DB_FILES[@]}"; do
  rel=${src#./}
  dest_dir="$TARGET_DIR/$(dirname "$rel")"
  dest="$dest_dir/$(basename "$rel")"

  mkdir -p "$dest_dir"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] Move '$rel' → '$dest' and create symlink back" >&2
  else
    if [[ -L "$rel" ]]; then
      echo "[skip] '$rel' is already a symlink." >&2
    else
      mv -f "$rel" "$dest"
      ln -s "$(realpath --relative-to="$(dirname "$rel")" "$dest")" "$rel"
      echo "[moved] '$rel' → '$dest' and symlink created" >&2
    fi
  fi

  # Determine which path currently holds the file for hashing/size
  hash_path="$dest"
  if [[ "$DRY_RUN" == "true" ]]; then
    hash_path="$rel"
  fi

  size=$(stat -c%s "$hash_path" 2>/dev/null || stat -f%z "$hash_path" 2>/dev/null || echo 0)
  sha=$( (command -v sha256sum >/dev/null && sha256sum "$hash_path" | awk '{print $1}') || (command -v shasum >/dev/null && shasum -a 256 "$hash_path" | awk '{print $1}') || echo "NA")
  echo "| $rel | ${dest#${ROOT_DIR}/} | $rel | $size | $sha |" >> "$INVENTORY_FILE"
done

echo "[info] Inventory written to $INVENTORY_FILE" >&2
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[info] Dry run complete. Re-run with --apply to perform moves." >&2
fi
