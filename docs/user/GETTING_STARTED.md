# Getting Started with Noa Server

Welcome to Noa Server! This guide will help you get up and running quickly with the platform.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Your First Workflow](#your-first-workflow)
- [Configuration](#configuration)
- [Next Steps](#next-steps)

## Prerequisites

Before installing Noa Server, ensure you have:

- **Node.js** 18.x or higher
- **npm** 9.x or higher (or **pnpm** 8.x)
- **Git** for version control
- **Docker** (optional, for containerized deployment)
- **Python** 3.9+ (for llama.cpp integration)

### System Requirements

**Minimum**:
- 4GB RAM
- 10GB disk space
- 2 CPU cores

**Recommended**:
- 8GB+ RAM
- 50GB+ disk space
- 4+ CPU cores
- GPU (CUDA-capable) for neural processing

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be v18.x or higher

# Check npm version
npm --version   # Should be 9.x or higher

# Check Git
git --version

# Check Docker (optional)
docker --version
```

## Installation

### Method 1: Quick Install (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/noa-server.git
cd noa-server

# Install dependencies
npm install

# Build the project
npm run build

# Verify installation
npm run test
```

### Method 2: Docker Installation

```bash
# Clone the repository
git clone https://github.com/your-org/noa-server.git
cd noa-server

# Build Docker image
docker build -t noa-server .

# Run container
docker run -p 3000:3000 noa-server
```

### Method 3: Development Setup

For development work, see the [Development Setup Guide](../developer/DEVELOPMENT_SETUP.md).

## Quick Start

### 1. Start the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run start
```

The server will start on `http://localhost:3000` by default.

### 2. Verify Server is Running

```bash
# Check server health
curl http://localhost:3000/health

# Expected response:
# {"status": "healthy", "timestamp": "2025-10-22T...", "version": "1.0.0"}
```

### 3. Configure MCP Servers

Noa Server integrates with Model Context Protocol (MCP) servers for enhanced capabilities:

```bash
# Add Claude Flow MCP server (required)
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Add optional MCP servers
claude mcp add ruv-swarm npx ruv-swarm mcp start
claude mcp add flow-nexus npx flow-nexus@latest mcp start

# Verify MCP servers
claude mcp list
```

### 4. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

Essential environment variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/noa_server

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h

# MCP Configuration
MCP_ENABLED=true
CLAUDE_FLOW_ENABLED=true

# Neural Processing (optional)
LLAMA_CPP_ENABLED=true
LLAMA_CPP_MODEL=models/llama-2-7b.gguf
CUDA_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Your First Workflow

Let's create a simple workflow to understand how Noa Server works.

### 1. Initialize a Swarm

```bash
# Initialize a mesh topology swarm with 3 agents
npx claude-flow@alpha swarm init \
  --topology mesh \
  --max-agents 3 \
  --name "my-first-swarm"
```

### 2. Create a Simple Task

Create a file `tasks/hello-world.json`:

```json
{
  "name": "Hello World Task",
  "description": "A simple task to test the system",
  "agents": [
    {
      "type": "coder",
      "task": "Create a Hello World function"
    },
    {
      "type": "tester",
      "task": "Write tests for the Hello World function"
    },
    {
      "type": "reviewer",
      "task": "Review the code quality"
    }
  ]
}
```

### 3. Execute the Task

```bash
# Run the task using Claude Flow
npx claude-flow@alpha task orchestrate \
  --file tasks/hello-world.json \
  --output results/hello-world-output.json
```

### 4. Check Results

```bash
# View task results
cat results/hello-world-output.json

# Check swarm status
npx claude-flow@alpha swarm status
```

### Example Output

The swarm will coordinate agents to:
1. Generate a Hello World function
2. Create comprehensive tests
3. Review code quality
4. Store results in memory

## Configuration

### Basic Configuration

The main configuration file is `config/default.json`:

```json
{
  "server": {
    "port": 3000,
    "host": "localhost",
    "cors": {
      "enabled": true,
      "origins": ["http://localhost:3000"]
    }
  },
  "mcp": {
    "enabled": true,
    "servers": ["claude-flow", "ruv-swarm"]
  },
  "swarm": {
    "defaultTopology": "mesh",
    "maxAgents": 10,
    "autoSpawn": true
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```

### Advanced Configuration

For production deployments, environment-specific configs:

```bash
# Development
config/development.json

# Staging
config/staging.json

# Production
config/production.json
```

### Configuration Precedence

1. Environment variables (highest priority)
2. Environment-specific config file
3. Default config file
4. Built-in defaults (lowest priority)

## Next Steps

Now that you have Noa Server running, explore these resources:

### Tutorials
- **[First Workflow](tutorials/first-workflow.md)** - Complete workflow walkthrough
- **[Agent Swarm Basics](tutorials/agent-swarm-basics.md)** - Understanding agent coordination
- **[MCP Tools Usage](tutorials/mcp-tools-usage.md)** - Leveraging MCP capabilities

### User Guides
- **[User Guide](USER_GUIDE.md)** - Comprehensive platform documentation
- **[Features](FEATURES.md)** - Detailed feature documentation
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues and solutions

### Developer Resources
- **[Development Setup](../developer/DEVELOPMENT_SETUP.md)** - Set up development environment
- **[Contributing](../developer/CONTRIBUTING.md)** - Contribute to the project
- **[API Documentation](#)** - API reference

### Architecture
- **[Architecture Overview](../architecture/ARCHITECTURE_OVERVIEW.md)** - System architecture
- **[Technology Stack](../architecture/TECHNOLOGY_STACK.md)** - Technologies used

## Getting Help

Need assistance?

- **Documentation**: Browse the [documentation index](../README.md)
- **FAQ**: Check the [Frequently Asked Questions](FAQ.md)
- **Issues**: Report bugs on [GitHub Issues](https://github.com/your-org/noa-server/issues)
- **Community**: Join our [Discord server](#)
- **Support**: Email support@noa-server.com

## Quick Reference

### Essential Commands

```bash
# Start server
npm run dev                  # Development mode
npm run start               # Production mode

# Testing
npm run test               # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage

# Building
npm run build              # Build project
npm run build:packages     # Build packages only

# Linting
npm run lint               # Check code style
npm run lint:fix           # Fix auto-fixable issues

# MCP
claude mcp list            # List MCP servers
npx claude-flow@alpha swarm status  # Check swarm status
```

### Project Structure

```
noa-server/
├── packages/           # Monorepo packages
│   ├── core/          # Core functionality
│   ├── api/           # REST API
│   ├── llama.cpp/     # Neural processing
│   └── web/           # Web interface
├── config/            # Configuration files
├── docs/              # Documentation
├── scripts/           # Utility scripts
└── tests/             # Integration tests
```

---

**Congratulations!** You've successfully set up Noa Server. Start exploring the platform and building amazing workflows!

**Next**: Try the [First Workflow Tutorial](tutorials/first-workflow.md) to learn more.
