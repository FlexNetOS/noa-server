#!/bin/bash
# Consolidates required repositories under packages/ using symlinks or archive fetches.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PACKAGES_DIR="$ROOT_DIR/packages"
DOWNLOADS_DIR="$ROOT_DIR/downloads"
FETCH_MISSING="${FETCH_MISSING:-1}"

mkdir -p "$PACKAGES_DIR" "$DOWNLOADS_DIR"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
  echo "[$(timestamp)] [consolidate] $1"
}

create_symlink() {
  local source_path="$1"
  local target_path="$2"

  if [[ -e "$target_path" ]]; then
    log "Target ${target_path#$ROOT_DIR/} already exists. Skipping."
    return
  fi

  if [[ ! -e "$source_path" ]]; then
    log "Source ${source_path#$ROOT_DIR/} not found."
    return 1
  fi

  ln -s "$source_path" "$target_path"
  log "Linked ${target_path#$ROOT_DIR/} -> ${source_path#$ROOT_DIR/}"
}

fetch_archive() {
  local repo_name="$1"
  local url="$2"
  local dest_dir="$3"

  if [[ -d "$dest_dir" ]]; then
    log "${repo_name} already present at ${dest_dir#$ROOT_DIR/}"
    return 0
  fi

  if [[ "$FETCH_MISSING" != "1" ]]; then
    log "FETCH_MISSING disabled; cannot download ${repo_name}"
    return 1
  fi

  local archive_path="$DOWNLOADS_DIR/${repo_name}.zip"
  log "Downloading ${repo_name} archive"
  curl --fail --location --output "$archive_path" "$url"
  mkdir -p "$dest_dir"
  tmp_dir="$(mktemp -d)"
  unzip -q "$archive_path" -d "$tmp_dir"
  extracted_dir="$(find "$tmp_dir" -mindepth 1 -maxdepth 1 -type d | head -1)"
  if [[ -z "$extracted_dir" ]]; then
    log "Failed to extract ${repo_name}"
    rm -rf "$tmp_dir"
    return 1
  fi
  cp -a "$extracted_dir/." "$dest_dir/"
  rm -rf "$tmp_dir"
  log "Fetched ${repo_name} into ${dest_dir#$ROOT_DIR/}"
}

create_symlink "$ROOT_DIR/claude-code" "$PACKAGES_DIR/claude-code" || true
create_symlink "$ROOT_DIR/claude-flow" "$PACKAGES_DIR/claude-flow-alpha" || true
create_symlink "$ROOT_DIR/claude-flow/claude-flow-wiki" "$PACKAGES_DIR/claude-flow.wiki" || true
create_symlink "$ROOT_DIR/mcp" "$PACKAGES_DIR/mcp-agent" || true
create_symlink "$ROOT_DIR/../.claude/agents/contains-studio" "$PACKAGES_DIR/contains-studio-agents" || create_symlink "$ROOT_DIR/agents" "$PACKAGES_DIR/contains-studio-agents" || true
if [[ ! -e "$PACKAGES_DIR/claude-cookbooks" ]]; then
  create_symlink "$ROOT_DIR/ai-dev-repos/anthropic-cookbook" "$PACKAGES_DIR/claude-cookbooks" || create_symlink "$ROOT_DIR/../ai-dev-repos/anthropic-cookbook" "$PACKAGES_DIR/claude-cookbooks" || true
fi

if [[ ! -d "$PACKAGES_DIR/flow-nexus" ]]; then
  fetch_archive "flow-nexus" "https://codeload.github.com/ruvnet/flow-nexus/zip/refs/heads/main" "$PACKAGES_DIR/flow-nexus" || true
fi
