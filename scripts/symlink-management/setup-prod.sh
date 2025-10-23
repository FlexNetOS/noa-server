#!/bin/bash
# Production Environment Setup
# NO SYMLINKS - Uses proper package management
# For Docker, CI/CD, and production server deployments

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PACKAGES_DIR="$ROOT_DIR/packages"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
  echo "[$(timestamp)] [setup-prod] $1"
}

error() {
  echo "[$(timestamp)] [ERROR] $1" >&2
}

warning() {
  echo "[$(timestamp)] [WARNING] $1" >&2
}

# Check environment
log "Initializing production environment setup"
log "Root: $ROOT_DIR"

if [[ "${NODE_ENV:-}" != "production" ]]; then
  warning "NODE_ENV is not set to 'production'. Setting it now."
  export NODE_ENV=production
fi

# Verify no development symlinks exist
log "Checking for development symlinks..."

SYMLINK_COUNT=0
if [[ -d "$PACKAGES_DIR" ]]; then
  while IFS= read -r -d '' symlink; do
    warning "Found development symlink: ${symlink#$ROOT_DIR/}"
    SYMLINK_COUNT=$((SYMLINK_COUNT + 1))
  done < <(find "$PACKAGES_DIR" -maxdepth 1 -type l -print0 2>/dev/null)
fi

if [[ $SYMLINK_COUNT -gt 0 ]]; then
  error "Found $SYMLINK_COUNT development symlinks in packages/"
  error "Production deployments should not use symlinks."
  error ""
  error "Choose one of these strategies:"
  error "  1. NPM Workspaces: Use 'workspace:*' protocol in package.json"
  error "  2. Git Submodules: Run 'git submodule update --init --recursive'"
  error "  3. Published Packages: Install from npm registry"
  error ""
  error "See docs/SYMLINKS.md for detailed migration guide"
  exit 1
fi

log "No development symlinks found. Proceeding with production setup..."

# Initialize git submodules (if configured)
log "Checking for git submodules..."

if [[ -f "$ROOT_DIR/.gitmodules" ]]; then
  log "Initializing git submodules..."
  git -C "$ROOT_DIR" submodule update --init --recursive
  log "Git submodules initialized"
else
  log "No git submodules configured"
fi

# Install Node.js dependencies
log "Installing Node.js dependencies..."

if command -v pnpm &> /dev/null; then
  log "Using pnpm for package installation"
  pnpm install --frozen-lockfile --prod
elif command -v npm &> /dev/null; then
  log "Using npm for package installation"
  npm ci --only=production
else
  error "Neither pnpm nor npm found. Please install Node.js package manager."
  exit 1
fi

# Setup Python environment
log "Setting up Python environment..."

if command -v python3 &> /dev/null; then
  if [[ ! -d "$ROOT_DIR/.venv" ]]; then
    log "Creating Python virtual environment..."
    python3 -m venv "$ROOT_DIR/.venv"
  fi

  log "Activating Python virtual environment..."
  source "$ROOT_DIR/.venv/bin/activate"

  if [[ -f "$ROOT_DIR/requirements.txt" ]]; then
    log "Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r "$ROOT_DIR/requirements.txt"
  else
    log "No requirements.txt found. Skipping Python dependencies."
  fi
else
  warning "Python3 not found. Skipping Python environment setup."
fi

# Create database directories
log "Creating database directories..."

mkdir -p "$ROOT_DIR/databases/noa-server/.swarm"
mkdir -p "$ROOT_DIR/databases/noa-server/.hive-mind"
mkdir -p "$ROOT_DIR/databases/noa-server/claude-flow/.hive-mind"
mkdir -p "$ROOT_DIR/databases/noa-server/claude-flow/docker/docker-test/.swarm"
mkdir -p "$ROOT_DIR/databases/noa-server/claude-flow/benchmark/.hive-mind"
mkdir -p "$ROOT_DIR/databases/noa-server/mcp"

# Create database symlinks (these are relative and portable)
create_db_link() {
  local link_path="$1"
  local relative_target="$2"

  local full_link="$ROOT_DIR/$link_path"
  mkdir -p "$(dirname "$full_link")"

  if [[ -L "$full_link" ]]; then
    log "Database link exists: $link_path"
    return 0
  fi

  if [[ -f "$full_link" ]]; then
    warning "Database file exists (not a link): $link_path"
    warning "Backing up to ${link_path}.backup"
    mv "$full_link" "${full_link}.backup"
  fi

  cd "$(dirname "$full_link")"
  ln -s "$relative_target" "$(basename "$full_link")"
  log "Created: $link_path -> $relative_target"
}

log "Setting up database symlinks..."
create_db_link ".swarm/memory.db" "../databases/noa-server/.swarm/memory.db"
create_db_link ".hive-mind/hive.db" "../databases/noa-server/.hive-mind/hive.db"
create_db_link "claude-flow/.hive-mind/memory.db" "../../databases/noa-server/claude-flow/.hive-mind/memory.db"
create_db_link "mcp/test.db" "../databases/noa-server/mcp/test.db"

# Create log directories
log "Creating log directories..."

mkdir -p "$ROOT_DIR/logs/setup"
mkdir -p "$ROOT_DIR/logs/runtime"
mkdir -p "$ROOT_DIR/logs/deployment"

# Verify installation
log "Verifying installation..."

VERIFICATION_FAILED=0

# Check critical files
CRITICAL_FILES=(
  "package.json"
  "pnpm-workspace.yaml"
)

for file in "${CRITICAL_FILES[@]}"; do
  if [[ ! -f "$ROOT_DIR/$file" ]]; then
    error "Missing critical file: $file"
    VERIFICATION_FAILED=1
  fi
done

# Check critical directories
CRITICAL_DIRS=(
  "packages"
  "databases"
  "logs"
)

for dir in "${CRITICAL_DIRS[@]}"; do
  if [[ ! -d "$ROOT_DIR/$dir" ]]; then
    error "Missing critical directory: $dir"
    VERIFICATION_FAILED=1
  fi
done

if [[ $VERIFICATION_FAILED -eq 1 ]]; then
  error "Production setup verification failed"
  exit 1
fi

# Build application
log "Building application..."

if command -v pnpm &> /dev/null; then
  pnpm run build
elif command -v npm &> /dev/null; then
  npm run build
fi

# Generate deployment report
REPORT_FILE="$ROOT_DIR/logs/deployment/setup-$(date +%Y%m%d-%H%M%S).log"

cat > "$REPORT_FILE" <<EOF
Noa Server Production Setup Report
Generated: $(timestamp)
Environment: ${NODE_ENV:-undefined}
Host: $(hostname)
User: $(whoami)

=== Installation Summary ===
Node.js: $(node --version 2>/dev/null || echo "not found")
NPM: $(npm --version 2>/dev/null || echo "not found")
PNPM: $(pnpm --version 2>/dev/null || echo "not found")
Python: $(python3 --version 2>/dev/null || echo "not found")

=== Package Status ===
Workspaces: $(find "$PACKAGES_DIR" -maxdepth 1 -type d 2>/dev/null | wc -l) packages
Symlinks: $(find "$PACKAGES_DIR" -maxdepth 1 -type l 2>/dev/null | wc -l) (should be 0)

=== Database Status ===
Database root: databases/noa-server/
Swarm memory: $(test -e "$ROOT_DIR/.swarm/memory.db" && echo "configured" || echo "not configured")
Hive mind: $(test -e "$ROOT_DIR/.hive-mind/hive.db" && echo "configured" || echo "not configured")

=== Build Status ===
Build completed: $(test -d "$ROOT_DIR/dist" && echo "yes" || echo "no")

=== Security Checklist ===
[ ] Environment variables configured (.env file NOT in git)
[ ] Database credentials secured
[ ] API keys configured in secure location
[ ] Firewall rules configured
[ ] SSL/TLS certificates installed
[ ] Backup strategy implemented
[ ] Monitoring configured

=== Next Steps ===
1. Review security checklist above
2. Configure environment variables (see .env.example)
3. Run health checks: npm run verify
4. Start application: npm start
5. Configure monitoring and alerts
6. Setup automated backups
7. Test disaster recovery procedures

EOF

log "Deployment report saved to: ${REPORT_FILE#$ROOT_DIR/}"

# Success summary
log ""
log "=========================================="
log "Production Setup Complete"
log "=========================================="
log ""
log "Environment: $NODE_ENV"
log "Packages: Properly installed (no symlinks)"
log "Databases: Configured"
log "Build: Completed"
log ""
log "Deployment report: ${REPORT_FILE#$ROOT_DIR/}"
log ""
log "To start the application:"
log "  npm start"
log ""
log "To verify installation:"
log "  npm run verify"
log ""
log "For troubleshooting, see:"
log "  - docs/SYMLINKS.md"
log "  - docs/DEPLOYMENT.md"
log "  - ${REPORT_FILE#$ROOT_DIR/}"
log "=========================================="
