# Development Setup Guide

Complete guide to setting up a development environment for Noa Server.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Environment](#development-environment)
- [IDE Configuration](#ide-configuration)
- [Database Setup](#database-setup)
- [MCP Development Setup](#mcp-development-setup)
- [Testing Setup](#testing-setup)
- [Debugging Setup](#debugging-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

**Node.js and npm**:

```bash
# Install Node.js 18+ (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version  # Should be v18.x or higher
npm --version   # Should be 9.x or higher
```

**Git**:

```bash
# Check installation
git --version

# Configure
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

**PostgreSQL** (for database):

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql

# Start service
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS

# Verify
psql --version
```

**Python 3.9+** (for llama.cpp):

```bash
# Check installation
python3 --version

# Install pip
sudo apt-get install python3-pip  # Linux
brew install python3              # macOS
```

### Optional Software

**Docker** (for containerized development):

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify
docker --version
docker-compose --version
```

**Claude Code** (for MCP development):

```bash
# Install Claude Code
# Visit https://claude.ai/download

# Verify
claude --version
```

## Initial Setup

### Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/noa-server.git
cd noa-server

# Checkout development branch
git checkout develop
```

### Install Dependencies

```bash
# Install all dependencies (monorepo)
npm install

# Or using pnpm (faster)
npm install -g pnpm
pnpm install
```

### Build Project

```bash
# Build all packages
npm run build

# Or build specific package
cd packages/core
npm run build
```

### Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

Essential environment variables:

```env
# Development
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/noa_server_dev

# Authentication
JWT_SECRET=your-development-secret-key
JWT_EXPIRY=24h

# MCP
MCP_ENABLED=true
CLAUDE_FLOW_ENABLED=true

# Neural Processing
LLAMA_CPP_ENABLED=true
LLAMA_CPP_MODEL=models/llama-2-7b.gguf
CUDA_ENABLED=false  # Set to true if you have CUDA

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Development
HOT_RELOAD=true
WATCH_MODE=true
```

### Verify Installation

```bash
# Run tests
npm run test

# Start development server
npm run dev
```

Visit `http://localhost:3000/health` - should return healthy status.

## Development Environment

### Monorepo Structure

```
noa-server/
├── packages/
│   ├── core/           # Core functionality
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   ├── api/            # REST API
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   ├── llama.cpp/      # Neural processing
│   │   ├── src/
│   │   ├── models/
│   │   └── package.json
│   └── web/            # Web interface
│       ├── src/
│       └── package.json
├── config/             # Configuration files
├── scripts/            # Utility scripts
├── tests/              # Integration tests
├── docs/               # Documentation
├── package.json        # Root package.json
└── tsconfig.json       # TypeScript config
```

### Development Workflow

**1. Create Feature Branch**:

```bash
git checkout -b feature/your-feature-name
```

**2. Make Changes**:

```bash
# Edit files
# Run tests continuously
npm run test:watch
```

**3. Run Linting**:

```bash
npm run lint
npm run lint:fix
```

**4. Commit Changes**:

```bash
git add .
git commit -m "feat: add your feature description"
```

**5. Push and Create PR**:

```bash
git push origin feature/your-feature-name
# Create PR on GitHub
```

### Package Development

**Add New Package**:

```bash
# Create package directory
mkdir -p packages/new-package/src
cd packages/new-package

# Initialize package.json
npm init -y

# Update package.json
cat > package.json << 'EOF'
{
  "name": "@noa-server/new-package",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@noa-server/core": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF
```

**Link Packages Locally**:

```bash
# From root
npm install

# Packages are automatically linked via workspace
```

## IDE Configuration

### Visual Studio Code

**Recommended Extensions**:

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "orta.vscode-jest",
    "eamodio.gitlens",
    "ms-vscode-remote.remote-containers",
    "redhat.vscode-yaml",
    "christian-kohler.npm-intellisense"
  ]
}
```

**Settings**:

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.tsdk": "node_modules/typescript/lib",
  "jest.autoRun": "watch",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true
  }
}
```

**Launch Configuration**:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/packages/api/src/server.ts",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/packages/*/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### WebStorm/IntelliJ IDEA

**Configure TypeScript**:

1. Settings → Languages & Frameworks → TypeScript
2. Enable TypeScript language service
3. Set TypeScript version to project version

**Configure ESLint**:

1. Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
2. Enable ESLint
3. Automatic ESLint configuration

**Configure Jest**:

1. Settings → Languages & Frameworks → JavaScript → Jest
2. Set Jest package to project node_modules
3. Enable auto-run tests

## Database Setup

### Create Development Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE noa_server_dev;
CREATE USER noa_dev WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE noa_server_dev TO noa_dev;

# Exit
\q
```

### Run Migrations

```bash
# Install migration tool
npm install -g db-migrate

# Run migrations
npm run db:migrate

# Or manually
db-migrate up --config config/database.json --env development
```

### Seed Database

```bash
# Run seed script
npm run db:seed

# Or manually
psql -U noa_dev -d noa_server_dev < scripts/seed-data.sql
```

### Database Tools

**pgAdmin** (GUI):

```bash
# Install
sudo apt-get install pgadmin4  # Linux
brew install --cask pgadmin4   # macOS

# Connect to localhost:5432
```

**DBeaver** (Universal):

```bash
# Download from https://dbeaver.io/download/
```

## MCP Development Setup

### Install Claude Code

```bash
# Download from https://claude.ai/download
# Or use CLI installer (if available)
```

### Add Development MCP Servers

```bash
# Add local claude-flow (development mode)
claude mcp add claude-flow-dev node ~/noa-server/packages/mcp-server/dist/index.js

# Or use local npx
claude mcp add claude-flow-dev npx --prefix ~/noa-server/packages/mcp-server mcp start
```

### Test MCP Connection

```bash
# List servers
claude mcp list

# Test connection
npx claude-flow@alpha mcp test-connection
```

### MCP Development Workflow

```bash
# 1. Make changes to MCP server code
cd packages/mcp-server
nano src/tools/custom-tool.ts

# 2. Build
npm run build

# 3. Restart MCP server
claude mcp restart claude-flow-dev

# 4. Test tool
# Open Claude Code and test the tool
```

## Testing Setup

### Jest Configuration

Already configured in `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: ['packages/*/src/**/*.ts', '!packages/*/src/**/*.d.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific package
npm test -- packages/core

# Specific file
npm test -- src/api.test.ts
```

### Integration Tests

```bash
# Set up test database
createdb noa_server_test

# Run integration tests
npm run test:integration

# Clean up
dropdb noa_server_test
```

## Debugging Setup

### Node.js Debugging

**Enable Inspector**:

```bash
# Start with debugging
node --inspect dist/server.js

# Or with break on first line
node --inspect-brk dist/server.js
```

**Connect Debugger**:

- Chrome: Navigate to `chrome://inspect`
- VS Code: Use launch configuration above
- WebStorm: Click debug button

### Debug Logging

```bash
# Enable all debug logs
export DEBUG=*
npm run dev

# Specific namespace
export DEBUG=noa:*
npm run dev

# Multiple namespaces
export DEBUG=noa:swarm,noa:agent
npm run dev
```

### Performance Profiling

```bash
# CPU profiling
node --prof dist/server.js

# Process profile
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect --expose-gc dist/server.js
# Open Chrome DevTools → Memory → Take snapshot
```

## Troubleshooting

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
export PORT=3001
npm run dev
```

### TypeScript Errors

```bash
# Clean build
npm run clean
npm run build

# Check TypeScript version
npx tsc --version

# Reinstall types
npm install --save-dev @types/node
```

### Module Not Found

```bash
# Clear node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Rebuild
npm run build
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U noa_dev -d noa_server_dev

# Check DATABASE_URL
echo $DATABASE_URL
```

### MCP Connection Issues

```bash
# Remove and re-add MCP server
claude mcp remove claude-flow-dev
claude mcp add claude-flow-dev <command>

# Check logs
claude mcp logs claude-flow-dev

# Restart Claude Code
# Exit and restart the application
```

## Next Steps

- Read [Contributing Guide](CONTRIBUTING.md) for contribution workflow
- Review [Code Style Guide](CODE_STYLE.md) for coding standards
- Check [Testing Guide](TESTING_GUIDE.md) for testing best practices
- Explore [Package Development](PACKAGE_DEVELOPMENT.md) for creating packages
- See [MCP Server Development](MCP_SERVER_DEVELOPMENT.md) for MCP tools

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Need Help?** Ask in
[GitHub Discussions](https://github.com/your-org/noa-server/discussions) or
[open an issue](https://github.com/your-org/noa-server/issues).
