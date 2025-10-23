# Development Environment Setup

This guide will help you set up your development environment for NOA Server. Follow each step carefully to ensure a smooth setup experience.

## Prerequisites

### Required Software

#### 1. Node.js (v20+)

**macOS (using Homebrew):**
```bash
brew install node@20
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Linux (using nvm):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
```

**Windows (using Chocolatey):**
```powershell
choco install nodejs-lts
```

**Verify installation:**
```bash
node --version  # Should be v20.x.x or higher
npm --version   # Should be v10.x.x or higher
```

#### 2. pnpm (v9.11.0+)

pnpm is our package manager of choice for monorepo management.

```bash
npm install -g pnpm@9.11.0
```

**Verify installation:**
```bash
pnpm --version  # Should be 9.11.0 or higher
```

#### 3. Git

**macOS:**
```bash
brew install git
```

**Linux:**
```bash
sudo apt-get install git  # Ubuntu/Debian
sudo yum install git      # CentOS/RHEL
```

**Windows:**
Download from https://git-scm.com/download/win

**Configure Git:**
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@noa-server.dev"
git config --global init.defaultBranch main
```

#### 4. Docker & Docker Compose

We use Docker for local development of services like Redis, RabbitMQ, and PostgreSQL.

**macOS:**
```bash
brew install --cask docker
# Open Docker Desktop and complete setup
```

**Linux:**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**Windows:**
Download Docker Desktop from https://www.docker.com/products/docker-desktop

**Verify installation:**
```bash
docker --version
docker-compose --version
docker run hello-world  # Test Docker
```

#### 5. IDE Setup (VS Code Recommended)

Download VS Code from https://code.visualstudio.com/

**Install Required Extensions:**
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension prisma.prisma
code --install-extension christian-kohler.path-intellisense
code --install-extension formulahendry.auto-rename-tag
code --install-extension eamodio.gitlens
code --install-extension github.copilot  # Optional
```

**Configure VS Code Settings:**

Create `.vscode/settings.json` in your home directory:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Optional but Recommended

#### Claude Code CLI (for AI-assisted development)

```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Configure MCP servers
claude mcp add claude-flow pnpm dlx claude-flow@alpha mcp start
```

#### Additional Tools

```bash
# Postman/Insomnia for API testing
brew install --cask postman  # macOS

# jq for JSON processing
brew install jq  # macOS
sudo apt-get install jq  # Linux

# htop for system monitoring
brew install htop  # macOS
sudo apt-get install htop  # Linux
```

## Repository Setup

### 1. Clone the Repository

```bash
# Clone via SSH (recommended)
git clone git@github.com:noa-server/noa-server.git
cd noa-server

# Or via HTTPS
git clone https://github.com/noa-server/noa-server.git
cd noa-server
```

### 2. Install Dependencies

```bash
# Install all dependencies for the monorepo
pnpm install

# This will:
# - Install dependencies for all packages
# - Link workspace packages
# - Set up git hooks
# - Run postinstall scripts
```

**Expected output:**
```
Packages: +2847
+++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 2847, reused 2710, downloaded 137, added 2847, done
```

### 3. Environment Variables Setup

We use environment variables for configuration. Each package may have its own `.env` file.

#### Root Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit with your settings
nano .env  # or use your preferred editor
```

**Required variables in root `.env`:**
```bash
NODE_ENV=development

# AI Provider API Keys (get from team lead)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Database (for local development)
DATABASE_URL=postgresql://postgres:password@localhost:5432/noa_dev

# Redis
REDIS_URL=redis://localhost:6379

# Message Queue (RabbitMQ)
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Monitoring (optional)
SENTRY_DSN=
```

#### Package-specific Environment Variables

```bash
# AI Provider
cp packages/ai-provider/.env.example packages/ai-provider/.env

# AI Inference API
cp packages/ai-inference-api/.env.example packages/ai-inference-api/.env

# Message Queue
cp packages/message-queue/.env.example packages/message-queue/.env

# Monitoring
cp packages/monitoring/.env.example packages/monitoring/.env
```

### 4. Database Setup

#### Start PostgreSQL with Docker

```bash
# Start PostgreSQL container
docker run -d \
  --name noa-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=noa_dev \
  -p 5432:5432 \
  postgres:15-alpine

# Verify it's running
docker ps | grep noa-postgres
```

#### Run Migrations (if applicable)

```bash
# Navigate to the package with database migrations
cd packages/ai-provider

# Run migrations
pnpm db:migrate

# Seed development data (optional)
pnpm db:seed
```

### 5. Redis Setup

```bash
# Start Redis container
docker run -d \
  --name noa-redis \
  -p 6379:6379 \
  redis:7-alpine

# Verify it's running
docker exec noa-redis redis-cli ping  # Should return PONG
```

### 6. RabbitMQ Setup (Optional)

Only needed if working on message queue features.

```bash
# Start RabbitMQ container
docker run -d \
  --name noa-rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management

# Access management UI at http://localhost:15672
# Username: guest, Password: guest
```

### 7. Docker Compose (All Services)

Alternatively, start all services with Docker Compose:

```bash
# Start all development services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop all services
docker-compose -f docker-compose.dev.yml down
```

## Verification

### 1. Run Tests

Verify your setup by running the test suite:

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run with coverage
pnpm test:coverage
```

**Expected output:**
```
 ✓ packages/ai-provider/src/__tests__/index.test.ts (10 tests) 523ms
 ✓ packages/message-queue/src/__tests__/queue.test.ts (8 tests) 412ms
 ✓ packages/monitoring/src/__tests__/health.test.ts (5 tests) 201ms

Test Files  23 passed (23)
     Tests  156 passed (156)
  Duration  8.5s
```

### 2. Start Development Server

```bash
# Start the AI Inference API
cd packages/ai-inference-api
pnpm dev

# Or use the root script
pnpm --filter @noa/ai-inference-api dev
```

**Expected output:**
```
[INFO] Starting NOA Server AI Inference API...
[INFO] Environment: development
[INFO] API listening on http://localhost:3000
[INFO] Swagger docs available at http://localhost:3000/api-docs
[INFO] Health check endpoint: http://localhost:3000/health
```

### 3. Test API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","uptime":1234,"timestamp":"2025-10-23T..."}

# Test inference endpoint (requires valid API key)
curl -X POST http://localhost:3000/api/v1/inference \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 4. Access Dashboard

If the monitoring dashboard is running:

```bash
cd packages/monitoring
pnpm dev

# Dashboard available at http://localhost:3001
```

### 5. Verify Type Checking

```bash
# Run TypeScript type checker
pnpm typecheck

# Expected: No errors
```

### 6. Verify Linting

```bash
# Run linter
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix
```

## Troubleshooting

### Common Setup Issues

#### Issue: `pnpm install` fails with permission errors

**Solution:**
```bash
# Fix npm permissions
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER ~/.pnpm

# Reinstall
rm -rf node_modules
pnpm install
```

#### Issue: Docker containers won't start

**Solution:**
```bash
# Check Docker is running
docker info

# If not running, start Docker Desktop (macOS/Windows)
# or start Docker daemon (Linux):
sudo systemctl start docker

# Check for port conflicts
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :5672  # RabbitMQ
```

#### Issue: Tests fail with database connection errors

**Solution:**
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check connection
psql postgresql://postgres:password@localhost:5432/noa_dev

# Restart container if needed
docker restart noa-postgres
```

#### Issue: TypeScript errors in IDE

**Solution:**
```bash
# Restart TypeScript server in VS Code
# Command Palette (Cmd+Shift+P): "TypeScript: Restart TS Server"

# Rebuild TypeScript declarations
pnpm build:all

# Clear VS Code cache
rm -rf .vscode
```

#### Issue: API key environment variables not loaded

**Solution:**
```bash
# Verify .env file exists
ls -la .env packages/*/.env

# Check environment variables are loaded
node -e "require('dotenv').config(); console.log(process.env.OPENAI_API_KEY)"

# Restart development server
```

### Platform-Specific Issues

#### macOS: Permission denied errors

```bash
# Fix Homebrew permissions
sudo chown -R $(whoami) /usr/local/bin /usr/local/lib

# Fix npm permissions
sudo chown -R $USER:$GROUP ~/.npm
```

#### Windows (WSL2): Docker integration issues

```bash
# Enable WSL2 integration in Docker Desktop settings
# Settings → Resources → WSL Integration → Enable for your distro

# Verify
docker run hello-world
```

#### Linux: Docker requires sudo

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then verify
docker run hello-world  # Should work without sudo
```

## Next Steps

Now that your environment is set up:

1. **[Architecture Overview](ARCHITECTURE.md)** - Understand the system architecture
2. **[Codebase Tour](CODEBASE_TOUR.md)** - Navigate the codebase
3. **[Development Workflow](WORKFLOW.md)** - Learn our Git workflow
4. **[Testing Guide](TESTING.md)** - Write and run tests

## Getting Help

If you encounter issues not covered here:

1. Check the [Troubleshooting Guide](DEBUGGING.md)
2. Search existing issues on GitHub
3. Ask in `#help` on Slack
4. Contact your mentor
5. Open an issue with details about your setup

---

**Next**: [Architecture Overview →](ARCHITECTURE.md)
