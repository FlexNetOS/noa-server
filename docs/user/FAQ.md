# Frequently Asked Questions (FAQ)

Common questions and answers about Noa Server.

## 📋 Table of Contents

- [General](#general)
- [Installation and Setup](#installation-and-setup)
- [Swarms and Agents](#swarms-and-agents)
- [MCP Integration](#mcp-integration)
- [Neural Processing](#neural-processing)
- [Performance](#performance)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## General

### What is Noa Server?

Noa Server is a comprehensive platform for orchestrating AI agent swarms,
managing workflows, and performing neural processing. It combines agent
coordination, MCP (Model Context Protocol) integration, and local AI processing
to enable systematic, scalable development workflows.

### What makes Noa Server different?

- **54+ specialized agents** for different development tasks
- **Multiple coordination topologies** (mesh, hierarchical, adaptive)
- **Local neural processing** with llama.cpp (no external API required)
- **SPARC methodology** for systematic development
- **Cross-session memory** for persistent context
- **84.8% SWE-Bench solve rate** and 32.3% token reduction

### Is Noa Server free?

Yes, Noa Server is open source. Optional cloud features via Flow-Nexus require
registration but include free tiers.

### What are the system requirements?

**Minimum**:

- Node.js 18+, 4GB RAM, 10GB disk, 2 CPU cores

**Recommended**:

- Node.js 20+, 8GB+ RAM, 50GB+ disk, 4+ CPU cores, CUDA GPU for neural
  processing

## Installation and Setup

### How do I install Noa Server?

```bash
git clone https://github.com/your-org/noa-server.git
cd noa-server
npm install
npm run build
```

See the [Getting Started Guide](GETTING_STARTED.md) for details.

### Do I need Claude Code?

Claude Code is recommended for using MCP features. You can run Noa Server
standalone, but MCP integration enhances coordination capabilities.

### What MCP servers are required?

- **claude-flow** (required): Core orchestration
- **ruv-swarm** (optional): Enhanced coordination
- **flow-nexus** (optional): Cloud features
- **neural-processing** (optional): Built-in with llama.cpp

### How do I set up MCP servers?

```bash
# Required
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Optional
claude mcp add ruv-swarm npx ruv-swarm mcp start
claude mcp add flow-nexus npx flow-nexus@latest mcp start
```

### Can I run Noa Server in Docker?

Yes! A Dockerfile is included:

```bash
docker build -t noa-server .
docker run -p 3000:3000 noa-server
```

### How do I upgrade to a new version?

```bash
git pull origin main
npm install
npm run build
npm run db:migrate  # If database schema changed
npm run test        # Verify
```

## Swarms and Agents

### What is a swarm?

A swarm is a coordinated group of AI agents working together to solve complex
tasks. Agents communicate through shared memory and coordination protocols.

### Which topology should I use?

- **Mesh** (3-7 agents): Collaborative tasks, peer review
- **Hierarchical** (10+ agents): Large projects, clear structure
- **Adaptive** (variable): Auto-optimizing, production workloads

### How many agents can I run?

Depends on your hardware:

- **4GB RAM**: Up to 5 agents
- **8GB RAM**: Up to 10 agents
- **16GB+ RAM**: Up to 20+ agents

Use auto-scaling to optimize based on load.

### What agent types are available?

54+ agents including:

- **Development**: coder, backend-dev, frontend-dev, mobile-dev
- **Quality**: reviewer, tester, debugger
- **Architecture**: system-architect, code-analyzer
- **Operations**: cicd-engineer, perf-analyzer
- **Coordination**: hierarchical-coordinator, mesh-coordinator

See [Features](FEATURES.md) for the complete list.

### How do I create a custom agent?

See [Custom Agent Example](../developer/examples/custom-agent.md) in developer
documentation.

### Can agents work across multiple repositories?

Yes! Use the `multi-repo-swarm` agent:

```bash
npx claude-flow@alpha agent spawn --type multi-repo-swarm
```

### How do agents coordinate?

Through:

- **Shared memory**: Key-value store for context
- **Hooks**: Pre/post operation coordination
- **Message passing**: Direct agent communication
- **Consensus protocols**: Byzantine, Raft, Gossip

## MCP Integration

### What is MCP?

Model Context Protocol (MCP) is a standard for connecting AI agents with tools
and data sources. It enables coordinated tool usage across multiple agents.

### What MCP tools are available?

70+ tools including:

- **Swarm**: init, scale, status, metrics
- **Agents**: spawn, list, metrics
- **Tasks**: orchestrate, status, results
- **Memory**: store, retrieve, export
- **Neural**: train, apply patterns
- **GitHub**: repo analyze, PR manage, issue triage

### Can I create custom MCP tools?

Yes! See [MCP Server Development](../developer/MCP_SERVER_DEVELOPMENT.md).

### How do I debug MCP issues?

```bash
# Check connection
claude mcp list

# View logs
claude mcp logs claude-flow

# Restart server
claude mcp restart claude-flow

# Test tool
mcp__claude-flow__swarm_status
```

### Do MCP tools work without internet?

Yes! Core MCP tools (claude-flow, neural-processing) work completely offline.
Only Flow-Nexus cloud features require internet.

## Neural Processing

### What is neural processing?

Local AI model inference using llama.cpp. Run LLaMA, Mistral, and other models
on your hardware without external APIs.

### Do I need a GPU?

No, but highly recommended:

- **CPU only**: Works but slower (minutes per response)
- **GPU (CUDA)**: Up to 10x faster (seconds per response)

### What models are supported?

Any GGUF format model:

- LLaMA 2 (7B, 13B, 70B)
- Mistral (7B)
- CodeLLaMA
- Custom models from Hugging Face

### How do I add a new model?

```bash
cd packages/llama.cpp/models
wget https://huggingface.co/<model-path>/<model-file>.gguf

# Validate
mcp__neural-processing__validate_model --model-path "models/<model-file>.gguf"
```

### Why is inference slow?

- Using CPU instead of GPU
- Model too large for hardware
- Insufficient memory

**Solutions**:

- Enable CUDA if available
- Use quantized model (Q4_K_M)
- Reduce context size
- Increase batch size

### Can I use external APIs instead?

Yes! Noa Server supports:

- OpenAI API
- Anthropic API
- Custom API endpoints

Configure in `.env`:

```env
EXTERNAL_AI_PROVIDER=openai
OPENAI_API_KEY=your-key
```

## Performance

### How fast is Noa Server?

- **84.8% SWE-Bench solve rate**
- **32.3% token reduction**
- **2.8-4.4x speed improvement** over sequential execution
- **Concurrent operations**: 10+ agents simultaneously

### How can I improve performance?

1. **Use adaptive topology**: Auto-optimizes structure
2. **Enable caching**: Reuse results
3. **Parallel execution**: Batch operations
4. **Optimize agent count**: More isn't always better
5. **Use CUDA**: For neural processing
6. **Reduce logging**: In production

### What affects performance?

- **Hardware**: CPU, RAM, GPU availability
- **Topology**: Mesh has more overhead than hierarchical
- **Agent count**: More agents = more coordination overhead
- **Task complexity**: Complex tasks take longer
- **Network latency**: If using cloud features

### How do I monitor performance?

```bash
# Real-time dashboard
npx claude-flow@alpha metrics dashboard --watch

# Performance analysis
npx claude-flow@alpha perf analyze

# Bottleneck detection
npx claude-flow@alpha perf analyze --identify-bottlenecks
```

## Security

### Is Noa Server secure?

Yes, with multiple security layers:

- JWT authentication
- Role-based access control (RBAC)
- TLS/SSL encryption
- Secrets management
- Security scanning
- Audit logging

### How do I enable authentication?

```env
# .env
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h
AUTH_ENABLED=true
```

### Can I integrate with OAuth?

Yes! Supports OAuth 2.0:

```env
OAUTH_ENABLED=true
OAUTH_PROVIDER=github
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
```

### How are secrets managed?

- Never commit secrets to git
- Use `.env` files (gitignored)
- Support for HashiCorp Vault
- AWS Secrets Manager integration
- Environment variables

### How do I run a security audit?

```bash
npx claude-flow@alpha security audit \
  --scan-dependencies true \
  --scan-code true \
  --report security-report.html
```

### Are communications encrypted?

Yes:

- TLS/SSL for external communications
- Encrypted storage for sensitive data
- Secure agent-to-agent communication
- Key rotation support

## Troubleshooting

### The server won't start

**Common causes**:

- Port already in use
- Database connection failed
- Missing environment variables

**Solution**:

```bash
# Check port
lsof -i :3000

# Check database
psql $DATABASE_URL

# Check environment
cat .env
```

See [Troubleshooting Guide](TROUBLESHOOTING.md) for details.

### Agents aren't spawning

**Common causes**:

- Swarm not initialized
- Resource limits reached
- MCP connection lost

**Solution**:

```bash
# Check swarm
npx claude-flow@alpha swarm status

# Check MCP
claude mcp list

# Check resources
npx claude-flow@alpha metrics system
```

### MCP tools aren't working

**Common causes**:

- MCP server not connected
- Permissions issue
- Version mismatch

**Solution**:

```bash
# Reconnect MCP server
claude mcp remove claude-flow
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Verify
claude mcp list
```

### Neural processing is slow

**Common causes**:

- Using CPU instead of GPU
- Model too large
- Insufficient memory

**Solution**:

```bash
# Check CUDA
nvidia-smi

# Use smaller model
export LLAMA_MODEL=llama-2-7b

# Enable optimizations
export LLAMA_MMAP=1
export LLAMA_BATCH_SIZE=512
```

### Out of memory errors

**Common causes**:

- Too many agents
- Memory leaks
- Large models

**Solution**:

```bash
# Reduce agents
npx claude-flow@alpha swarm scale --agents 5

# Clear cache
npx claude-flow@alpha cache clear

# Increase Node.js heap
node --max-old-space-size=4096 dist/server.js
```

### Where can I get help?

- **Documentation**: [docs/](../)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **GitHub Issues**:
  [Report bugs](https://github.com/your-org/noa-server/issues)
- **Discord**: [Join community](#)
- **Email**: support@noa-server.com

## Still Have Questions?

- Check the [User Guide](USER_GUIDE.md) for comprehensive documentation
- Read [Getting Started](GETTING_STARTED.md) for setup instructions
- Explore [Features](FEATURES.md) for detailed feature documentation
- Try [Tutorials](tutorials/) for hands-on learning
- Join our [Discord community](#) for real-time help

---

**Can't find your question?**
[Ask on GitHub Discussions](https://github.com/your-org/noa-server/discussions)
