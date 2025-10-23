#!/bin/bash
# Development Environment Symlink Setup
# Creates convenience symlinks for local development
# DO NOT USE IN PRODUCTION - See setup-prod.sh instead

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PACKAGES_DIR="$ROOT_DIR/packages"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
  echo "[$(timestamp)] [setup-dev] $1"
}

error() {
  echo "[$(timestamp)] [ERROR] $1" >&2
}

create_dev_symlink() {
  local source_path="$1"
  local target_path="$2"
  local description="$3"

  if [[ -e "$target_path" && ! -L "$target_path" ]]; then
    log "Target exists (not a symlink): ${target_path#$ROOT_DIR/}. Skipping."
    return 0
  fi

  if [[ -L "$target_path" ]]; then
    local existing_target="$(readlink "$target_path")"
    if [[ "$existing_target" == "$source_path" ]]; then
      log "Symlink already correct: ${target_path#$ROOT_DIR/}"
      return 0
    else
      log "Updating symlink: ${target_path#$ROOT_DIR/}"
      rm "$target_path"
    fi
  fi

  if [[ ! -e "$source_path" ]]; then
    error "Source not found: ${source_path#$ROOT_DIR/} - $description"
    error "Please clone/create the required repository or run 'npm run workspace:sync'"
    return 1
  fi

  ln -s "$source_path" "$target_path"
  log "Created: ${target_path#$ROOT_DIR/} -> ${source_path#$ROOT_DIR/} ($description)"
}

# Main execution
log "Setting up development environment symlinks"
log "Root: $ROOT_DIR"

# Check environment
if [[ "${NODE_ENV:-}" == "production" ]]; then
  error "NODE_ENV=production detected. Use setup-prod.sh for production deployments."
  exit 1
fi

# Create packages directory
mkdir -p "$PACKAGES_DIR"

# Package symlinks
log "Creating package symlinks..."

create_dev_symlink \
  "$ROOT_DIR/claude-flow" \
  "$PACKAGES_DIR/claude-flow-alpha" \
  "Claude Flow alpha development version" || true

create_dev_symlink \
  "$ROOT_DIR/claude-flow/claude-flow-wiki" \
  "$PACKAGES_DIR/claude-flow.wiki" \
  "Claude Flow documentation" || true

create_dev_symlink \
  "$ROOT_DIR/claude-code" \
  "$PACKAGES_DIR/claude-code" \
  "Claude Code development tools" || true

create_dev_symlink \
  "$ROOT_DIR/mcp" \
  "$PACKAGES_DIR/mcp-agent" \
  "MCP agent tools" || true

create_dev_symlink \
  "$ROOT_DIR/../.claude/agents/contains-studio" \
  "$PACKAGES_DIR/contains-studio-agents" \
  "Contains Studio agent definitions" || true

create_dev_symlink \
  "$ROOT_DIR/../ai-dev-repos/anthropic-cookbook" \
  "$PACKAGES_DIR/claude-cookbooks" \
  "Anthropic Claude cookbook examples" || true

# Alternative cookbooks location
if [[ ! -e "$PACKAGES_DIR/claude-cookbooks" ]]; then
  create_dev_symlink \
    "$ROOT_DIR/ai-dev-repos/anthropic-cookbook" \
    "$PACKAGES_DIR/claude-cookbooks" \
    "Anthropic Claude cookbook (alternative path)" || true
fi

# Database symlinks (relative paths - these are portable)
log "Verifying database symlinks..."

mkdir -p "$ROOT_DIR/databases/noa-server/.swarm"
mkdir -p "$ROOT_DIR/databases/noa-server/.hive-mind"
mkdir -p "$ROOT_DIR/databases/noa-server/claude-flow/.hive-mind"
mkdir -p "$ROOT_DIR/databases/noa-server/claude-flow/docker/docker-test/.swarm"
mkdir -p "$ROOT_DIR/databases/noa-server/claude-flow/benchmark/.hive-mind"
mkdir -p "$ROOT_DIR/databases/noa-server/mcp"

create_database_link() {
  local link_path="$1"
  local relative_target="$2"
  local description="$3"

  mkdir -p "$(dirname "$ROOT_DIR/$link_path")"

  if [[ -L "$ROOT_DIR/$link_path" ]]; then
    log "Database link exists: $link_path"
    return 0
  fi

  if [[ -f "$ROOT_DIR/$link_path" ]]; then
    log "Database file exists (not a link): $link_path. Backing up..."
    mv "$ROOT_DIR/$link_path" "$ROOT_DIR/$link_path.backup"
  fi

  cd "$(dirname "$ROOT_DIR/$link_path")"
  ln -s "$relative_target" "$(basename "$link_path")"
  log "Created database link: $link_path -> $relative_target"
}

create_database_link ".swarm/memory.db" "../databases/noa-server/.swarm/memory.db" "Swarm memory"
create_database_link ".hive-mind/hive.db" "../databases/noa-server/.hive-mind/hive.db" "Hive mind"
create_database_link "claude-flow/.hive-mind/memory.db" "../../databases/noa-server/claude-flow/.hive-mind/memory.db" "Claude Flow hive memory"
create_database_link "mcp/test.db" "../databases/noa-server/mcp/test.db" "MCP test database"

# Runtime symlink (already created by bootstrap_node.sh)
if [[ -L "$ROOT_DIR/.runtime/node-current" ]]; then
  log "Runtime symlink verified: .runtime/node-current"
else
  log "Runtime symlink missing. Run: npm run runtime:bootstrap"
fi

# Summary
log "Development environment setup complete"
log ""
log "Symlink Status:"
log "  Custom Packages: $(find "$PACKAGES_DIR" -maxdepth 1 -type l 2>/dev/null | wc -l) symlinks"
log "  Database Links: Verified and created"
log "  Runtime: $(readlink "$ROOT_DIR/.runtime/node-current" 2>/dev/null || echo "not configured")"
log ""
log "Next steps:"
log "  1. Run 'npm run workspace:sync' to sync workspace packages"
log "  2. Run 'pnpm install' to install dependencies"
log "  3. Run 'npm run verify' to verify installation"
log ""
log "For production deployment, use: scripts/symlink-management/setup-prod.sh"
