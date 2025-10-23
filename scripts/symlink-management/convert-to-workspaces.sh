#!/bin/bash
# Convert Symlinks to NPM Workspaces
# Migrates from development symlinks to proper monorepo workspace configuration

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PACKAGES_DIR="$ROOT_DIR/packages"
BACKUP_DIR="$ROOT_DIR/.symlink-backups/$(date +%Y%m%d-%H%M%S)"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
  echo "[$(timestamp)] [convert] $1"
}

error() {
  echo "[$(timestamp)] [ERROR] $1" >&2
}

warning() {
  echo "[$(timestamp)] [WARNING] $1" >&2
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Converting symlinks to NPM workspaces"
log "Root: $ROOT_DIR"
log "Backup: $BACKUP_DIR"

# List of symlinks to convert
SYMLINKS_TO_CONVERT=(
  "packages/claude-flow-alpha|claude-flow|Internal package"
  "packages/claude-code|claude-code|Internal package"
  "packages/mcp-agent|mcp|Internal package"
  "packages/claude-flow.wiki|claude-flow/claude-flow-wiki|Documentation"
)

EXTERNAL_REPOS=(
  "packages/claude-cookbooks|https://github.com/anthropics/anthropic-cookbook.git|External cookbook"
  "packages/contains-studio-agents|<REPO_URL>|External agents"
)

# Step 1: Backup existing symlinks
log "Step 1: Backing up symlinks..."

for entry in "${SYMLINKS_TO_CONVERT[@]}"; do
  IFS='|' read -r symlink_path source_dir description <<< "$entry"
  full_symlink="$ROOT_DIR/$symlink_path"

  if [[ -L "$full_symlink" ]]; then
    target="$(readlink "$full_symlink")"
    echo "$symlink_path -> $target" >> "$BACKUP_DIR/symlinks.txt"
    log "Backed up: $symlink_path"
  fi
done

# Step 2: Verify source directories exist
log "Step 2: Verifying source directories..."

MISSING_SOURCES=()

for entry in "${SYMLINKS_TO_CONVERT[@]}"; do
  IFS='|' read -r symlink_path source_dir description <<< "$entry"
  full_source="$ROOT_DIR/$source_dir"

  if [[ ! -d "$full_source" ]]; then
    error "Source directory missing: $source_dir ($description)"
    MISSING_SOURCES+=("$source_dir")
  else
    log "Verified: $source_dir"
  fi
done

if [[ ${#MISSING_SOURCES[@]} -gt 0 ]]; then
  error "Missing ${#MISSING_SOURCES[@]} source directories. Cannot proceed."
  error "Please create or clone the following repositories:"
  for source in "${MISSING_SOURCES[@]}"; do
    error "  - $ROOT_DIR/$source"
  done
  exit 1
fi

# Step 3: Remove symlinks
log "Step 3: Removing symlinks..."

for entry in "${SYMLINKS_TO_CONVERT[@]}"; do
  IFS='|' read -r symlink_path source_dir description <<< "$entry"
  full_symlink="$ROOT_DIR/$symlink_path"

  if [[ -L "$full_symlink" ]]; then
    rm "$full_symlink"
    log "Removed symlink: $symlink_path"
  elif [[ -e "$full_symlink" ]]; then
    warning "Not a symlink, skipping: $symlink_path"
  fi
done

# Step 4: Verify pnpm-workspace.yaml
log "Step 4: Verifying workspace configuration..."

WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml"

if [[ ! -f "$WORKSPACE_FILE" ]]; then
  log "Creating pnpm-workspace.yaml..."
  cat > "$WORKSPACE_FILE" <<'YAML'
packages:
  - packages/*
  - servers/*
  - apps/*
YAML
fi

log "Workspace configuration verified"

# Step 5: Update package.json dependencies
log "Step 5: Updating root package.json..."

# Create a temporary script to update package.json
TEMP_SCRIPT="$BACKUP_DIR/update-package-json.js"

cat > "$TEMP_SCRIPT" <<'EOSCRIPT'
const fs = require('fs');
const path = require('path');

const packageJsonPath = process.argv[2];
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Ensure dependencies section exists
packageJson.dependencies = packageJson.dependencies || {};

// Add workspace dependencies
const workspaceDeps = {
  'claude-flow': 'workspace:*',
  'claude-code': 'workspace:*',
  'mcp-agent': 'workspace:*'
};

for (const [name, version] of Object.entries(workspaceDeps)) {
  packageJson.dependencies[name] = version;
  console.log(`Added: ${name}@${version}`);
}

// Write back
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('package.json updated successfully');
EOSCRIPT

node "$TEMP_SCRIPT" "$ROOT_DIR/package.json"

# Step 6: Install dependencies
log "Step 6: Installing workspace dependencies..."

if command -v pnpm &> /dev/null; then
  log "Using pnpm..."
  cd "$ROOT_DIR"
  pnpm install
elif command -v npm &> /dev/null; then
  log "Using npm (workspaces require npm 7+)..."
  cd "$ROOT_DIR"
  npm install
else
  error "No package manager found. Please install pnpm or npm."
  exit 1
fi

# Step 7: Verify conversion
log "Step 7: Verifying conversion..."

VERIFICATION_FAILED=0

for entry in "${SYMLINKS_TO_CONVERT[@]}"; do
  IFS='|' read -r symlink_path source_dir description <<< "$entry"
  full_path="$ROOT_DIR/$symlink_path"

  if [[ -L "$full_path" ]]; then
    error "Still a symlink: $symlink_path"
    VERIFICATION_FAILED=1
  elif [[ -d "$full_path" ]]; then
    log "Verified package: $symlink_path"
  else
    error "Package missing: $symlink_path"
    VERIFICATION_FAILED=1
  fi
done

# Step 8: Setup git submodules for external repos
log "Step 8: Setting up git submodules for external repositories..."

log "External repositories require manual setup:"
for entry in "${EXTERNAL_REPOS[@]}"; do
  IFS='|' read -r symlink_path repo_url description <<< "$entry"
  full_symlink="$ROOT_DIR/$symlink_path"

  if [[ -L "$full_symlink" ]]; then
    warning "Remove symlink and add as git submodule:"
    warning "  rm $symlink_path"
    warning "  git submodule add $repo_url $symlink_path"
    rm "$full_symlink" 2>/dev/null || true
  fi
done

# Step 9: Generate migration report
REPORT_FILE="$BACKUP_DIR/migration-report.txt"

cat > "$REPORT_FILE" <<EOF
Symlink to Workspace Migration Report
Generated: $(timestamp)
Root: $ROOT_DIR
Backup: $BACKUP_DIR

=== Converted Packages ===
EOF

for entry in "${SYMLINKS_TO_CONVERT[@]}"; do
  IFS='|' read -r symlink_path source_dir description <<< "$entry"
  echo "  ✓ $symlink_path ($description)" >> "$REPORT_FILE"
done

cat >> "$REPORT_FILE" <<EOF

=== External Repositories (Manual Setup Required) ===
EOF

for entry in "${EXTERNAL_REPOS[@]}"; do
  IFS='|' read -r symlink_path repo_url description <<< "$entry"
  echo "  - $symlink_path" >> "$REPORT_FILE"
  echo "    URL: $repo_url" >> "$REPORT_FILE"
  echo "    Setup: git submodule add $repo_url $symlink_path" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
done

cat >> "$REPORT_FILE" <<EOF

=== Workspace Configuration ===
File: pnpm-workspace.yaml
Packages: packages/*, servers/*, apps/*

=== Root package.json Updates ===
Added workspace dependencies:
  - claude-flow: workspace:*
  - claude-code: workspace:*
  - mcp-agent: workspace:*

=== Verification Status ===
EOF

if [[ $VERIFICATION_FAILED -eq 0 ]]; then
  echo "Status: SUCCESS" >> "$REPORT_FILE"
else
  echo "Status: FAILED (see errors above)" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

=== Next Steps ===
1. Review this report: $REPORT_FILE
2. Setup external git submodules (see above)
3. Run tests: npm test
4. Update CI/CD to initialize submodules
5. Update documentation

=== Rollback Instructions ===
If you need to rollback:
1. Restore symlinks from: $BACKUP_DIR/symlinks.txt
2. Revert package.json changes
3. Run: pnpm install

=== References ===
- PNPM Workspaces: https://pnpm.io/workspaces
- Git Submodules: https://git-scm.com/book/en/v2/Git-Tools-Submodules
- Migration Guide: docs/SYMLINKS.md
EOF

log "Migration report saved: ${REPORT_FILE#$ROOT_DIR/}"

# Final summary
log ""
log "=========================================="
log "Symlink to Workspace Migration Complete"
log "=========================================="
log ""

if [[ $VERIFICATION_FAILED -eq 0 ]]; then
  log "✓ All packages converted successfully"
else
  error "✗ Some packages failed conversion (see errors above)"
fi

log ""
log "Backup location: ${BACKUP_DIR#$ROOT_DIR/}"
log "Migration report: ${REPORT_FILE#$ROOT_DIR/}"
log ""
log "Next steps:"
log "  1. Review migration report"
log "  2. Setup git submodules for external repos"
log "  3. Run tests: npm test"
log "  4. Update CI/CD configuration"
log ""
log "For rollback instructions, see: ${REPORT_FILE#$ROOT_DIR/}"
log "=========================================="

exit $VERIFICATION_FAILED
