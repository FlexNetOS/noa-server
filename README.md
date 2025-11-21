# NOA Server

📚 [Master Documentation Index](docs/INDEX.md)


NOA (Neural Operating Architecture) Server - A comprehensive server platform for AI-powered operations.

## 📚 Documentation

### Core Documentation
- [CLAUDE.md](./CLAUDE.md) - Claude Code configuration and SPARC development environment
- [Archon Setup Guide](./docs/ARCHON_SETUP_GUIDE.md) - Comprehensive Archon integration guide
- [Archon Quick Start](./docs/ARCHON_QUICKSTART.md) - 5-minute setup guide

### Quick Links
- [Project Status](./CLAUDE.md#progress) - Current development status
- [Architecture](./CLAUDE.md#project-overview) - System architecture overview
- [Available Agents](./CLAUDE.md#-available-agents-54-total) - 54+ specialized agents
- [SPARC Workflow](./CLAUDE.md#sparc-workflow-phases) - Development methodology

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Desktop
- Python 3.11+ (for some packages)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd noa-server

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm run test
```

---

## 📦 Project Structure

```
noa-server/
├── packages/
│   ├── archon/              # Archon MCP server (knowledge & task management)
│   ├── llama.cpp/           # Neural processing with llama.cpp
│   └── ...                  # Other packages
├── docs/                    # Documentation
├── .claude/                 # Claude Code configuration
├── CLAUDE.md               # Main development guide
└── README.md               # This file
```

---

## 🧠 Integrated Systems

### Archon - Knowledge & Task Management

Archon is integrated as an MCP (Model Context Protocol) server for AI assistants.

**Key Features:**
- Knowledge base management with RAG capabilities
- Smart documentation crawling
- Hierarchical task management
- Multi-LLM support (OpenAI, Anthropic, Ollama, Gemini)

**Quick Setup:**
```bash
cd packages/archon
# Follow setup guide: docs/ARCHON_SETUP_GUIDE.md
docker compose up -d --build
```

**Access:**
- Web UI: http://localhost:3737
- MCP Server: http://localhost:8051

**Documentation:**
- [Comprehensive Setup Guide](./docs/ARCHON_SETUP_GUIDE.md)
- [Quick Start (5 min)](./docs/ARCHON_QUICKSTART.md)

### llama.cpp - Neural Processing

Local neural processing with CUDA acceleration.

**Features:**
- GGUF model support
- 27+ neural models
- MCP integration
- CUDA-enabled inference

**Setup:**
```bash
cd packages/llama.cpp
# Activate environment
source ~/praisonai_env/bin/activate
# Launch Claude Code with MCP
claude --dangerously-skip-permissions
```

---

## 🛠️ Development

### SPARC Methodology

This project uses SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) for systematic development.

**Key Commands:**
```bash
# Run SPARC modes
npx claude-flow sparc modes

# Execute TDD workflow
npx claude-flow sparc tdd "feature description"

# Run specific mode
npx claude-flow sparc run <mode> "task"

# Parallel execution
npx claude-flow sparc batch <modes> "task"
```

### Available Agents (54+)

The project includes 54+ specialized AI agents for development tasks:

- **Core**: coder, reviewer, tester, planner, researcher
- **Swarm**: hierarchical-coordinator, mesh-coordinator, adaptive-coordinator
- **Consensus**: byzantine-coordinator, raft-manager, gossip-coordinator
- **GitHub**: pr-manager, code-review-swarm, issue-tracker, release-manager
- **Development**: backend-dev, mobile-dev, ml-developer, cicd-engineer
- **SPARC**: sparc-coord, sparc-coder, specification, architecture

See [CLAUDE.md](./CLAUDE.md#-available-agents-54-total) for full list.

---

## 🔧 Configuration

### Claude Code Integration

This project is optimized for Claude Code with:
- Concurrent execution patterns
- MCP tool integration
- Hooks automation
- Memory coordination
- Neural processing

See [CLAUDE.md](./CLAUDE.md) for detailed configuration.

### Environment Variables

```bash
# Create .env files as needed
cp .env.example .env

# Archon configuration
cp packages/archon/.env.example packages/archon/.env
```

**Never commit .env files!** They are already in .gitignore.

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run specific tests
npm run test:unit
npm run test:integration

# Linting
npm run lint

# Type checking
npm run typecheck
```

---

## 📋 MCP Integration

### Available MCP Servers

1. **Claude Flow** (Required)
   ```bash
   claude mcp add claude-flow npx claude-flow@alpha mcp start
   ```

2. **Archon** (Knowledge & Tasks)
   ```bash
   claude mcp add archon http://localhost:8051
   ```

3. **Ruv Swarm** (Optional - Enhanced coordination)
   ```bash
   claude mcp add ruv-swarm npx ruv-swarm mcp start
   ```

4. **Flow Nexus** (Optional - Cloud features)
   ```bash
   claude mcp add flow-nexus npx flow-nexus@latest mcp start
   ```

### Verify MCP Connections

```bash
claude mcp list
```

---

## 🎯 Key Features

- **SPARC Development**: Systematic TDD workflow
- **Multi-Agent Swarms**: 54+ specialized agents
- **Archon Integration**: Knowledge & task management
- **Neural Processing**: Local LLM with llama.cpp
- **MCP Protocol**: Standardized AI assistant integration
- **Concurrent Execution**: Optimized performance patterns
- **Hooks Automation**: Pre/post operation automation
- **Memory Coordination**: Cross-session persistence

---

## 🐛 Troubleshooting

### Common Issues

**Port Conflicts**
```bash
# Check port usage
lsof -i :3737
lsof -i :8181
```

**Docker Issues**
```bash
# Reset Docker
docker compose down --remove-orphans
docker system prune -f
```

**MCP Connection Failures**
```bash
# Verify service is running
curl http://localhost:8051

# Check Claude MCP configuration
claude mcp list
```

**Archon Issues**
See [Troubleshooting Guide](./docs/ARCHON_SETUP_GUIDE.md#troubleshooting)

---

## 📖 Additional Resources

### Documentation
- [CLAUDE.md](./CLAUDE.md) - Main development guide
- [Archon Setup](./docs/ARCHON_SETUP_GUIDE.md) - Archon integration
- [Archon Quick Start](./docs/ARCHON_QUICKSTART.md) - Fast setup

### External Links
- Claude Flow: https://github.com/ruvnet/claude-flow
- Archon: https://github.com/coleam00/Archon
- MCP Protocol: https://modelcontextprotocol.io

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Follow SPARC methodology for development
2. Use concurrent execution patterns
3. Update documentation as needed
4. Run tests before committing
5. Use descriptive commit messages

---

## 📄 License

[Add license information here]

---

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Check [CLAUDE.md](./CLAUDE.md) for development guidelines
- Review [Archon documentation](./docs/ARCHON_SETUP_GUIDE.md) for Archon-specific issues

---

**Last Updated**: 2025-10-23

> Last updated: 2025-11-20
