# Symlink Analysis and Strategy for Noa Server

**Generated:** 2025-10-22 **Location:** `/home/deflex/noa-server` **Purpose:**
Comprehensive documentation of symlink strategy for deployment and portability

---

## Executive Summary

Noa Server uses 35+ symlinks for three primary purposes:

1. **Development Convenience** - Local package references (custom symlinks)
2. **System Integration** - Runtime and dependency management (system symlinks)
3. **Database Organization** - Centralized database storage (infrastructure
   symlinks)

**Action Required:** Custom symlinks need conversion to npm workspaces or proper
package references for portable deployments.

---

## Symlink Categories

### Category 1: Custom Symlinks (CONVERSION REQUIRED)

These symlinks link to local development repositories and must be converted for
production deployments:

| Symlink                           | Target                                                 | Conversion Strategy                                   |
| --------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| `packages/claude-flow-alpha`      | `/home/deflex/noa-server/claude-flow`                  | **NPM Workspace** - Already in monorepo               |
| `packages/claude-cookbooks`       | `/home/deflex/ai-dev-repos/anthropic-cookbook`         | **Git Submodule** or NPM package reference            |
| `packages/claude-code`            | `/home/deflex/noa-server/claude-code`                  | **NPM Workspace** - Missing directory, needs creation |
| `packages/mcp-agent`              | `/home/deflex/noa-server/mcp`                          | **NPM Workspace** - Missing directory, needs creation |
| `packages/claude-flow.wiki`       | `/home/deflex/noa-server/claude-flow/claude-flow-wiki` | **NPM Workspace** - Documentation subpackage          |
| `packages/contains-studio-agents` | `/home/deflex/.claude/agents/contains-studio`          | **Git Submodule** - External agent definitions        |

**Impact:** These symlinks break when:

- Deploying to containers (Docker/Kubernetes)
- Deploying to different servers
- Running CI/CD pipelines
- Archiving/backing up the project

---

### Category 2: Database Symlinks (INFRASTRUCTURE)

Centralized database storage strategy using relative symlinks:

| Symlink                                           | Target                                                                             | Purpose                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------ |
| `.swarm/memory.db`                                | `../databases/noa-server/.swarm/memory.db`                                         | Claude Flow swarm memory |
| `.hive-mind/hive.db`                              | `../databases/noa-server/.hive-mind/hive.db`                                       | Hive mind coordination   |
| `claude-flow/.hive-mind/memory.db`                | `../../databases/noa-server/claude-flow/.hive-mind/memory.db`                      | Claude Flow hive memory  |
| `claude-flow/docker/docker-test/.swarm/memory.db` | `../../../../databases/noa-server/claude-flow/docker/docker-test/.swarm/memory.db` | Docker test memory       |
| `claude-flow/benchmark/.hive-mind/hive.db`        | `../../../databases/noa-server/claude-flow/benchmark/.hive-mind/hive.db`           | Benchmark data           |
| `mcp/test.db`                                     | `../databases/noa-server/mcp/test.db`                                              | MCP test database        |

**Strategy:** These are CORRECT for local development. Use relative paths for
portability.

**Deployment Options:**

1. **Container Volumes:** Mount `/databases` as persistent volume
2. **Environment Variables:** Configure `DATABASE_PATH` for alternative
   locations
3. **Config Files:** Use `config/database.json` for path overrides

---

### Category 3: Runtime Symlinks (SYSTEM - NO CHANGE)

Node.js runtime management:

| Symlink                                         | Target                                          | Purpose                        |
| ----------------------------------------------- | ----------------------------------------------- | ------------------------------ |
| `.runtime/node-current`                         | `node-v20.17.0-linux-x64`                       | Active Node.js version pointer |
| `.runtime/node-v20.17.0-linux-x64/bin/npm`      | `../lib/node_modules/npm/bin/npm-cli.js`        | NPM binary                     |
| `.runtime/node-v20.17.0-linux-x64/bin/npx`      | `../lib/node_modules/npm/bin/npx-cli.js`        | NPX binary                     |
| `.runtime/node-v20.17.0-linux-x64/bin/corepack` | `../lib/node_modules/corepack/dist/corepack.js` | Corepack binary                |

**Strategy:** Leave unchanged. These are standard Node.js installation symlinks.

**Deployment:** Use official Node.js Docker images or `nvm`/`fnm` in production.

---

### Category 4: Python Virtual Environment (SYSTEM - NO CHANGE)

Python virtual environment symlinks:

| Symlink                | Target             | Purpose                   |
| ---------------------- | ------------------ | ------------------------- |
| `.venv/lib64`          | `lib`              | Library directory alias   |
| `.venv/bin/python`     | `python3`          | Python interpreter chain  |
| `.venv/bin/python3`    | `/usr/bin/python3` | System Python reference   |
| `.venv/bin/python3.12` | `python3`          | Version-specific Python   |
| `noa/venv/lib64`       | `lib`              | Legacy venv library alias |
| `noa/venv/bin/python*` | (similar)          | Legacy venv interpreters  |

**Strategy:** Standard Python venv structure. Recreate with
`python3 -m venv .venv` in deployment.

---

### Category 5: Node Modules (DEPENDENCY - NO CHANGE)

Package manager-generated symlinks in `node_modules/.bin/`:

- `eslint`, `tsc`, `prettier`, `jest`, `webpack`, etc.
- `ruv-swarm`, `claude-flow`, `prisma`, etc.

**Strategy:** Automatically created by `npm install` or `pnpm install`. Never
commit to git.

---

## Conversion Strategy

### Phase 1: Monorepo Workspace Configuration

**Already Configured** in `/home/deflex/noa-server/package.json`:

```json
{
  "workspaces": ["packages/*", "servers/*", "apps/*"]
}
```

**Action Required:** Convert symlinks to actual packages.

---

### Phase 2: Package Reference Conversion

#### Option A: Internal Packages (Recommended)

For packages already in the monorepo (`claude-flow`, `claude-code`, `mcp`):

```bash
# Remove symlinks
cd /home/deflex/noa-server/packages
rm claude-flow-alpha claude-code mcp-agent

# Reference in package.json using workspace protocol
{
  "dependencies": {
    "claude-flow": "workspace:*",
    "claude-code": "workspace:*",
    "mcp-agent": "workspace:*"
  }
}
```

#### Option B: Git Submodules (For External Repos)

For external repositories (`claude-cookbooks`, `contains-studio-agents`):

```bash
# Remove symlinks
cd /home/deflex/noa-server/packages
rm claude-cookbooks contains-studio-agents

# Add as git submodules
cd /home/deflex/noa-server
git submodule add https://github.com/anthropics/anthropic-cookbook.git packages/claude-cookbooks
git submodule add <repo-url> packages/contains-studio-agents

# Initialize submodules in CI/CD
git submodule update --init --recursive
```

#### Option C: NPM Package References

For published packages:

```json
{
  "dependencies": {
    "claude-flow": "^2.7.0",
    "flow-nexus": "^0.1.128",
    "ruv-swarm": "^1.0.20"
  }
}
```

---

### Phase 3: Build Script Updates

Update `/home/deflex/noa-server/scripts/repos/consolidate.sh` to handle both
development and production:

```bash
#!/bin/bash
# Symlink setup for LOCAL DEVELOPMENT ONLY
# Production deployments should use:
# - NPM workspaces (for internal packages)
# - Git submodules (for external repos)
# - Published NPM packages (for stable releases)

if [[ "${NODE_ENV:-development}" == "production" ]]; then
  echo "Production mode: Skipping symlink creation"
  echo "Ensure packages are properly installed via npm/pnpm"
  exit 0
fi

# Development mode: Create convenience symlinks
create_symlink "$ROOT_DIR/claude-flow" "$PACKAGES_DIR/claude-flow-alpha"
# ... rest of symlinks
```

---

## Deployment Strategies

### Strategy 1: Docker Container (Recommended)

**Dockerfile approach:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/

# Install dependencies (NO SYMLINKS)
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Build application
RUN pnpm run build

# Database volume
VOLUME /app/databases

CMD ["node", "dist/server.js"]
```

**Docker Compose:**

```yaml
services:
  noa-server:
    build: .
    volumes:
      - ./databases:/app/databases # Persistent database storage
      - ./logs:/app/logs # Log storage
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/databases
```

---

### Strategy 2: Traditional Server Deployment

**Setup script for production:**

```bash
#!/bin/bash
# Production setup - NO SYMLINKS

# Clone repository
git clone https://github.com/your-org/noa-server.git
cd noa-server

# Initialize git submodules (if using)
git submodule update --init --recursive

# Install Node.js dependencies
pnpm install --frozen-lockfile

# Setup Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create database directories
mkdir -p databases/noa-server/{.swarm,.hive-mind}
mkdir -p databases/noa-server/claude-flow/{.hive-mind,docker/docker-test/.swarm,benchmark/.hive-mind}
mkdir -p databases/noa-server/mcp

# Build application
pnpm run build

# Start services
pnpm start
```

---

### Strategy 3: CI/CD Pipeline

**GitHub Actions example:**

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive # Initialize git submodules

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm run build

      - name: Test
        run: pnpm test
```

---

## Migration Plan

### Immediate Actions (Critical Priority)

1. **Audit Missing Directories**
   - `/home/deflex/noa-server/claude-code` - symlink target missing
   - `/home/deflex/noa-server/mcp` - symlink target missing
   - Action: Remove broken symlinks or create proper packages

2. **Update consolidate.sh**
   - Add `NODE_ENV` check
   - Skip symlinks in production
   - Document development-only behavior

3. **Create Setup Scripts**
   - `scripts/symlink-management/setup-dev.sh` - Development symlinks
   - `scripts/symlink-management/setup-prod.sh` - Production packages
   - `scripts/symlink-management/verify-symlinks.sh` - Health check

### Short-term Actions (1-2 weeks)

4. **Convert Internal Packages**
   - Move `claude-flow` to proper workspace package
   - Update all imports to use workspace protocol
   - Test monorepo build

5. **Setup Git Submodules**
   - Add `claude-cookbooks` as submodule
   - Add `contains-studio-agents` as submodule
   - Update CI/CD to initialize submodules

6. **Update Documentation**
   - README.md - Add deployment section
   - DEVELOPMENT.md - Explain symlink strategy
   - DEPLOYMENT.md - Production setup guide

### Long-term Actions (1-2 months)

7. **Publish Internal Packages**
   - Package `claude-flow-alpha` for npm
   - Package `mcp-agent` for npm
   - Version and release cycle

8. **Containerization**
   - Create optimized Dockerfile
   - Setup Docker Compose for local dev
   - Kubernetes manifests for production

9. **Database Strategy**
   - Implement database path configuration
   - Add environment variable support
   - Create migration scripts

---

## Health Check Script

Run `/home/deflex/noa-server/scripts/symlink-management/verify-symlinks.sh` to
check symlink status:

```bash
#!/bin/bash
# Verify symlink health

check_symlink() {
  local link="$1"
  if [[ -L "$link" ]]; then
    if [[ -e "$link" ]]; then
      echo "✓ $link -> $(readlink "$link")"
    else
      echo "✗ BROKEN: $link -> $(readlink "$link")"
      return 1
    fi
  else
    echo "- Not a symlink: $link"
  fi
}

# Check custom package symlinks
check_symlink "packages/claude-flow-alpha"
check_symlink "packages/claude-cookbooks"
check_symlink "packages/claude-code"
check_symlink "packages/mcp-agent"

# Check database symlinks
check_symlink ".swarm/memory.db"
check_symlink ".hive-mind/hive.db"

# Check runtime symlinks
check_symlink ".runtime/node-current"
```

---

## Frequently Asked Questions

### Why use symlinks at all?

**Development Convenience:** Allows working on multiple related repositories
simultaneously without publishing packages.

**Example:** Edit `claude-flow` source and immediately see changes in
`noa-server` without reinstalling.

### Why are symlinks problematic?

1. **Container Isolation:** Docker containers can't access parent directory
   paths
2. **Absolute Paths:** Symlinks with absolute paths break on different machines
3. **Version Control:** Git doesn't preserve symlink targets
4. **CI/CD:** Build servers don't have local development directories

### What's the best production strategy?

**Monorepo Workspaces + Git Submodules:**

- Internal packages: NPM workspaces
- External repos: Git submodules
- Published packages: NPM registry

### How do I test if my deployment works?

```bash
# Simulate production build
NODE_ENV=production pnpm install
pnpm run build

# Check for broken references
find packages/ -type l -exec test ! -e {} \; -print

# Run tests
pnpm test
```

---

## References

- **NPM Workspaces:** https://docs.npmjs.com/cli/v7/using-npm/workspaces
- **PNPM Workspaces:** https://pnpm.io/workspaces
- **Git Submodules:** https://git-scm.com/book/en/v2/Git-Tools-Submodules
- **Docker Multi-stage Builds:**
  https://docs.docker.com/build/building/multi-stage/

---

## Appendix: Full Symlink Inventory

### Custom Package Symlinks (6)

```
packages/claude-flow-alpha -> /home/deflex/noa-server/claude-flow
packages/claude-cookbooks -> /home/deflex/ai-dev-repos/anthropic-cookbook
packages/claude-code -> /home/deflex/noa-server/claude-code (BROKEN)
packages/mcp-agent -> /home/deflex/noa-server/mcp (BROKEN)
packages/claude-flow.wiki -> /home/deflex/noa-server/claude-flow/claude-flow-wiki
packages/contains-studio-agents -> /home/deflex/.claude/agents/contains-studio
```

### Database Symlinks (6)

```
.swarm/memory.db -> ../databases/noa-server/.swarm/memory.db
.hive-mind/hive.db -> ../databases/noa-server/.hive-mind/hive.db
claude-flow/.hive-mind/memory.db -> ../../databases/noa-server/claude-flow/.hive-mind/memory.db
claude-flow/docker/docker-test/.swarm/memory.db -> ../../../../databases/noa-server/claude-flow/docker/docker-test/.swarm/memory.db
claude-flow/benchmark/.hive-mind/hive.db -> ../../../databases/noa-server/claude-flow/benchmark/.hive-mind/hive.db
mcp/test.db -> ../databases/noa-server/mcp/test.db
```

### Runtime Symlinks (4)

```
.runtime/node-current -> node-v20.17.0-linux-x64
.runtime/node-v20.17.0-linux-x64/bin/npm -> ../lib/node_modules/npm/bin/npm-cli.js
.runtime/node-v20.17.0-linux-x64/bin/npx -> ../lib/node_modules/npm/bin/npx-cli.js
.runtime/node-v20.17.0-linux-x64/bin/corepack -> ../lib/node_modules/corepack/dist/corepack.js
```

### Python Venv Symlinks (8)

```
.venv/lib64 -> lib
.venv/bin/python -> python3
.venv/bin/python3 -> /usr/bin/python3
.venv/bin/python3.12 -> python3
noa/venv/lib64 -> lib
noa/venv/bin/python -> python3
noa/venv/bin/python3 -> /usr/bin/python3
noa/venv/bin/python3.12 -> python3
```

### Node Modules Symlinks (100+)

```
node_modules/.bin/* (managed by npm/pnpm)
packages/*/node_modules/.bin/* (managed by npm/pnpm)
```

---

**Document Version:** 1.0.0 **Last Updated:** 2025-10-22 **Maintained By:**
DevOps Team **Review Cycle:** Quarterly
