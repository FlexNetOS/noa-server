#!/bin/bash
# Symlink Health Check Script
# Verifies symlink status and detects broken links

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
  echo -e "${BLUE}[$(timestamp)]${NC} $1"
}

success() {
  echo -e "${GREEN}✓${NC} $1"
}

warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

error() {
  echo -e "${RED}✗${NC} $1"
}

check_symlink() {
  local link="$1"
  local category="$2"
  local full_path="$ROOT_DIR/$link"

  if [[ ! -e "$full_path" && ! -L "$full_path" ]]; then
    return 0  # Not a symlink, not a problem
  fi

  if [[ -L "$full_path" ]]; then
    local target="$(readlink "$full_path")"
    if [[ -e "$full_path" ]]; then
      success "$category: $link -> $target"
      return 0
    else
      error "$category: BROKEN: $link -> $target (target not found)"
      return 1
    fi
  else
    warning "$category: Not a symlink: $link (regular file/directory)"
    return 0
  fi
}

# Header
log "Noa Server Symlink Health Check"
log "Root: $ROOT_DIR"
log "Environment: ${NODE_ENV:-development}"
log ""

TOTAL_CHECKS=0
FAILED_CHECKS=0

# Custom Package Symlinks
log "=== Custom Package Symlinks ==="
CUSTOM_SYMLINKS=(
  "packages/claude-flow-alpha"
  "packages/claude-cookbooks"
  "packages/claude-code"
  "packages/mcp-agent"
  "packages/claude-flow.wiki"
  "packages/contains-studio-agents"
)

for link in "${CUSTOM_SYMLINKS[@]}"; do
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if ! check_symlink "$link" "Package"; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
done

log ""

# Database Symlinks
log "=== Database Symlinks ==="
DATABASE_SYMLINKS=(
  ".swarm/memory.db"
  ".hive-mind/hive.db"
  "claude-flow/.hive-mind/memory.db"
  "claude-flow/docker/docker-test/.swarm/memory.db"
  "claude-flow/benchmark/.hive-mind/hive.db"
  "mcp/test.db"
)

for link in "${DATABASE_SYMLINKS[@]}"; do
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if ! check_symlink "$link" "Database"; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
done

log ""

# Runtime Symlinks
log "=== Runtime Symlinks ==="
RUNTIME_SYMLINKS=(
  ".runtime/node-current"
)

for link in "${RUNTIME_SYMLINKS[@]}"; do
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if ! check_symlink "$link" "Runtime"; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
done

log ""

# Python Environment Symlinks
log "=== Python Environment Symlinks ==="
PYTHON_SYMLINKS=(
  ".venv/lib64"
  ".venv/bin/python"
  ".venv/bin/python3"
)

for link in "${PYTHON_SYMLINKS[@]}"; do
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if ! check_symlink "$link" "Python"; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
done

log ""

# Check for unexpected symlinks
log "=== Scanning for Unexpected Symlinks ==="

UNEXPECTED_COUNT=0
while IFS= read -r -d '' symlink; do
  relative_path="${symlink#$ROOT_DIR/}"

  # Skip known symlinks
  if [[ "$relative_path" =~ ^packages/ ]] || \
     [[ "$relative_path" =~ ^\.venv/ ]] || \
     [[ "$relative_path" =~ ^noa/venv/ ]] || \
     [[ "$relative_path" =~ ^\.runtime/ ]] || \
     [[ "$relative_path" =~ /node_modules/ ]] || \
     [[ "$relative_path" =~ ^\.swarm/ ]] || \
     [[ "$relative_path" =~ ^\.hive-mind/ ]] || \
     [[ "$relative_path" =~ ^claude-flow/ ]] || \
     [[ "$relative_path" =~ ^mcp/ ]]; then
    continue
  fi

  warning "Unexpected symlink: $relative_path -> $(readlink "$symlink")"
  UNEXPECTED_COUNT=$((UNEXPECTED_COUNT + 1))
done < <(find "$ROOT_DIR" -type l -print0 2>/dev/null)

if [[ $UNEXPECTED_COUNT -eq 0 ]]; then
  success "No unexpected symlinks found"
else
  warning "Found $UNEXPECTED_COUNT unexpected symlinks"
fi

log ""

# Environment-specific recommendations
log "=== Environment Recommendations ==="

if [[ "${NODE_ENV:-}" == "production" ]]; then
  if [[ $FAILED_CHECKS -gt 0 ]]; then
    error "Production environment should not have broken symlinks"
    error "Run 'npm run symlink:fix-prod' to resolve issues"
  fi

  # Check for custom package symlinks in production
  CUSTOM_SYMLINK_COUNT=0
  for link in "${CUSTOM_SYMLINKS[@]}"; do
    if [[ -L "$ROOT_DIR/$link" ]]; then
      CUSTOM_SYMLINK_COUNT=$((CUSTOM_SYMLINK_COUNT + 1))
    fi
  done

  if [[ $CUSTOM_SYMLINK_COUNT -gt 0 ]]; then
    error "Found $CUSTOM_SYMLINK_COUNT custom package symlinks in production"
    error "Production should use NPM workspaces or git submodules"
    error "See docs/SYMLINKS.md for migration guide"
  else
    success "No custom package symlinks (production best practice)"
  fi
else
  if [[ $FAILED_CHECKS -gt 0 ]]; then
    warning "Development environment has broken symlinks"
    warning "Run 'npm run symlink:setup-dev' to fix"
  else
    success "Development environment symlinks are healthy"
  fi
fi

log ""

# Summary
log "=== Summary ==="
log "Total checks: $TOTAL_CHECKS"
log "Failed: $FAILED_CHECKS"
log "Passed: $((TOTAL_CHECKS - FAILED_CHECKS))"

if [[ $UNEXPECTED_COUNT -gt 0 ]]; then
  log "Unexpected symlinks: $UNEXPECTED_COUNT"
fi

log ""

if [[ $FAILED_CHECKS -eq 0 ]]; then
  success "All symlinks are healthy"
  exit 0
else
  error "$FAILED_CHECKS broken symlinks detected"
  log ""
  log "To fix broken symlinks:"
  log "  Development: npm run symlink:setup-dev"
  log "  Production: npm run symlink:setup-prod"
  log ""
  log "For detailed guidance, see: docs/SYMLINKS.md"
  exit 1
fi
