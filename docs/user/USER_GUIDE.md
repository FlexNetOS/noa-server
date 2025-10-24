# Noa Server User Guide

Complete guide to using Noa Server for workflow orchestration, agent swarms, and
neural processing.

## 📋 Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Working with Swarms](#working-with-swarms)
- [Agent Management](#agent-management)
- [Task Orchestration](#task-orchestration)
- [MCP Integration](#mcp-integration)
- [Neural Processing](#neural-processing)
- [Memory and State](#memory-and-state)
- [Monitoring and Observability](#monitoring-and-observability)
- [Best Practices](#best-practices)

## Overview

Noa Server is a comprehensive platform for orchestrating AI agent swarms,
managing workflows, and performing neural processing. It combines:

- **Agent Swarms**: Coordinate multiple AI agents to solve complex tasks
- **MCP Integration**: Leverage Model Context Protocol for tool coordination
- **Neural Processing**: Local AI processing with llama.cpp
- **Workflow Orchestration**: SPARC methodology for systematic development
- **Cross-session Memory**: Persistent context across workflows

### Key Features

- 54+ specialized AI agents
- Multiple swarm topologies (mesh, hierarchical, adaptive)
- Real-time coordination and consensus
- Distributed task execution
- Integrated observability
- Security-first architecture

## Core Concepts

### Agents

Agents are specialized AI workers that perform specific tasks. Each agent has:

- **Type**: Defines its specialization (e.g., coder, reviewer, tester)
- **Capabilities**: What tasks it can perform
- **Memory**: Access to shared memory for coordination
- **Hooks**: Integration points for coordination

Example agent types:

```javascript
// Development agents
('coder', 'reviewer', 'tester', 'debugger');

// Specialized agents
('backend-dev', 'frontend-dev', 'mobile-dev', 'ml-developer');

// Coordination agents
('hierarchical-coordinator', 'mesh-coordinator', 'adaptive-coordinator');

// Analysis agents
('code-analyzer', 'perf-analyzer', 'security-manager');
```

### Swarms

A swarm is a coordinated group of agents working together. Swarms have:

- **Topology**: How agents are connected (mesh, hierarchical, star)
- **Coordinator**: Agent managing the swarm
- **Memory**: Shared memory for coordination
- **Tasks**: Work distributed across agents

### Topologies

Different topologies for different use cases:

**Mesh Topology**:

- All agents can communicate directly
- Best for: Collaborative tasks, peer review
- Overhead: Higher communication cost

**Hierarchical Topology**:

- Tree structure with coordinators
- Best for: Large teams, complex workflows
- Overhead: Lower, more organized

**Adaptive Topology**:

- Dynamically adjusts based on task
- Best for: Variable workloads
- Overhead: Intelligent optimization

### Tasks

Tasks define work to be done:

```json
{
  "id": "task-123",
  "name": "Build REST API",
  "description": "Create a REST API with authentication",
  "agents": [
    {
      "type": "backend-dev",
      "subtask": "Implement API endpoints"
    },
    {
      "type": "security-manager",
      "subtask": "Add authentication"
    },
    {
      "type": "tester",
      "subtask": "Write integration tests"
    }
  ],
  "dependencies": [],
  "priority": "high",
  "deadline": "2025-10-25T00:00:00Z"
}
```

## Working with Swarms

### Initialize a Swarm

```bash
# Basic mesh swarm
npx claude-flow@alpha swarm init \
  --topology mesh \
  --max-agents 5 \
  --name "development-swarm"

# Hierarchical swarm for large tasks
npx claude-flow@alpha swarm init \
  --topology hierarchical \
  --max-agents 20 \
  --coordinator-ratio 0.2 \
  --name "enterprise-swarm"

# Adaptive swarm (auto-optimizes)
npx claude-flow@alpha swarm init \
  --topology adaptive \
  --max-agents 10 \
  --auto-scale true \
  --name "smart-swarm"
```

### Check Swarm Status

```bash
# View current swarms
npx claude-flow@alpha swarm list

# Detailed status of specific swarm
npx claude-flow@alpha swarm status --name "development-swarm"

# Monitor in real-time
npx claude-flow@alpha swarm monitor --name "development-swarm" --watch
```

### Scale a Swarm

```bash
# Increase agent count
npx claude-flow@alpha swarm scale \
  --name "development-swarm" \
  --agents 10

# Auto-scale based on load
npx claude-flow@alpha swarm scale \
  --name "development-swarm" \
  --auto-scale true \
  --min-agents 3 \
  --max-agents 15
```

### Stop a Swarm

```bash
# Graceful shutdown
npx claude-flow@alpha swarm stop --name "development-swarm"

# Force stop
npx claude-flow@alpha swarm stop --name "development-swarm" --force

# Stop all swarms
npx claude-flow@alpha swarm stop --all
```

## Agent Management

### Spawn an Agent

```bash
# Spawn specific agent type
npx claude-flow@alpha agent spawn \
  --type backend-dev \
  --swarm "development-swarm" \
  --name "backend-agent-1"

# Spawn multiple agents
npx claude-flow@alpha agent spawn \
  --types "coder,tester,reviewer" \
  --swarm "development-swarm"
```

### List Agents

```bash
# All agents
npx claude-flow@alpha agent list

# Agents in specific swarm
npx claude-flow@alpha agent list --swarm "development-swarm"

# Filter by type
npx claude-flow@alpha agent list --type backend-dev

# Show detailed metrics
npx claude-flow@alpha agent list --verbose
```

### Agent Metrics

```bash
# View agent performance
npx claude-flow@alpha agent metrics --name "backend-agent-1"

# Export metrics
npx claude-flow@alpha agent metrics \
  --name "backend-agent-1" \
  --export metrics/agent-metrics.json
```

### Terminate an Agent

```bash
# Graceful termination
npx claude-flow@alpha agent stop --name "backend-agent-1"

# Force termination
npx claude-flow@alpha agent stop --name "backend-agent-1" --force
```

## Task Orchestration

### Create a Task

```bash
# Simple task
npx claude-flow@alpha task create \
  --name "Build Feature" \
  --description "Implement user authentication" \
  --agents "backend-dev,security-manager,tester"

# Complex task with JSON file
npx claude-flow@alpha task create --file tasks/complex-task.json
```

Example task file (`tasks/complex-task.json`):

```json
{
  "name": "E-commerce Checkout Flow",
  "description": "Build complete checkout system",
  "priority": "high",
  "deadline": "2025-11-01T00:00:00Z",
  "subtasks": [
    {
      "name": "Backend API",
      "agents": ["backend-dev"],
      "deliverables": ["REST API", "Database schema"]
    },
    {
      "name": "Payment Integration",
      "agents": ["backend-dev", "security-manager"],
      "deliverables": ["Payment gateway", "Security audit"]
    },
    {
      "name": "Frontend UI",
      "agents": ["frontend-dev"],
      "dependencies": ["Backend API"],
      "deliverables": ["Checkout UI", "Form validation"]
    },
    {
      "name": "Testing",
      "agents": ["tester"],
      "dependencies": ["Backend API", "Frontend UI"],
      "deliverables": ["Test suite", "Coverage report"]
    }
  ]
}
```

### Execute Tasks

```bash
# Execute single task
npx claude-flow@alpha task execute --id task-123

# Execute with specific swarm
npx claude-flow@alpha task execute \
  --id task-123 \
  --swarm "development-swarm"

# Batch execution
npx claude-flow@alpha task execute --batch tasks/batch-tasks.json
```

### Monitor Tasks

```bash
# Check task status
npx claude-flow@alpha task status --id task-123

# Watch task progress
npx claude-flow@alpha task watch --id task-123

# List all tasks
npx claude-flow@alpha task list --status in_progress
```

### Task Results

```bash
# Get task results
npx claude-flow@alpha task results --id task-123

# Export results
npx claude-flow@alpha task results \
  --id task-123 \
  --export results/task-123.json

# View metrics
npx claude-flow@alpha task metrics --id task-123
```

## MCP Integration

### MCP Servers

Noa Server integrates with multiple MCP servers:

- **claude-flow**: Core orchestration (required)
- **ruv-swarm**: Enhanced coordination (optional)
- **flow-nexus**: Cloud features (optional)
- **neural-processing**: llama.cpp integration (optional)

### Configure MCP Servers

```bash
# Add claude-flow (required)
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Add ruv-swarm (optional)
claude mcp add ruv-swarm npx ruv-swarm mcp start

# Add flow-nexus (optional, requires registration)
claude mcp add flow-nexus npx flow-nexus@latest mcp start

# Verify servers
claude mcp list
```

### Use MCP Tools

MCP tools are available through Claude Code:

```bash
# Initialize swarm coordination
mcp__claude-flow__swarm_init --topology mesh --max-agents 5

# Spawn agent via MCP
mcp__claude-flow__agent_spawn --type coder

# Orchestrate task
mcp__claude-flow__task_orchestrate --task-file tasks/example.json

# Check memory usage
mcp__claude-flow__memory_usage

# View swarm status
mcp__claude-flow__swarm_status
```

### Flow-Nexus Cloud Features

If using flow-nexus (optional):

```bash
# Register account
npx flow-nexus@latest register

# Login
npx flow-nexus@latest login

# Create cloud sandbox
mcp__flow-nexus__sandbox_create --name "dev-sandbox"

# Execute in sandbox
mcp__flow-nexus__sandbox_execute \
  --sandbox "dev-sandbox" \
  --script "npm run build"

# Use AI assistant
mcp__flow-nexus__seraphina_chat \
  --message "Optimize my workflow"
```

## Neural Processing

### llama.cpp Integration

Noa Server includes local neural processing with llama.cpp:

```bash
# Navigate to llama.cpp package
cd packages/llama.cpp

# Activate environment
source ~/praisonai_env/bin/activate

# Start Claude Code with neural processing
claude --dangerously-skip-permissions
```

### Available Neural Tools

```bash
# Chat completion
mcp__neural-processing__chat_completion \
  --prompt "Explain the SPARC methodology" \
  --model "llama-2-7b"

# Streaming chat
mcp__neural-processing__stream_chat \
  --prompt "Generate API documentation"

# Benchmark model
mcp__neural-processing__benchmark_model \
  --model "llama-2-7b" \
  --iterations 100

# Validate model
mcp__neural-processing__validate_model \
  --model-path "models/llama-2-7b.gguf"

# System info
mcp__neural-processing__get_system_info
```

### Model Management

```bash
# List available models
mcp__neural-processing__list_available_models

# Download model (manual)
cd packages/llama.cpp/models
wget https://huggingface.co/TheBloke/Llama-2-7B-GGUF/resolve/main/llama-2-7b.Q4_K_M.gguf
```

### CUDA Acceleration

If GPU is available:

```env
# In .env file
CUDA_ENABLED=true
CUDA_DEVICE=0
```

Verify CUDA:

```bash
nvidia-smi
python -c "import torch; print(torch.cuda.is_available())"
```

## Memory and State

### Shared Memory

Agents coordinate through shared memory:

```bash
# Store in memory
npx claude-flow@alpha memory store \
  --key "swarm/api-design/decisions" \
  --value "Use REST with JWT authentication"

# Retrieve from memory
npx claude-flow@alpha memory retrieve \
  --key "swarm/api-design/decisions"

# List memory keys
npx claude-flow@alpha memory list --prefix "swarm/"

# Export memory
npx claude-flow@alpha memory export --file memory-backup.json
```

### Session Management

```bash
# Save session
npx claude-flow@alpha session save \
  --session-id "dev-session-001" \
  --file sessions/dev-session-001.json

# Restore session
npx claude-flow@alpha session restore \
  --file sessions/dev-session-001.json

# List sessions
npx claude-flow@alpha session list
```

### Neural Patterns

Train and use neural patterns:

```bash
# Train from successful workflows
npx claude-flow@alpha neural train \
  --workflow-id "workflow-123" \
  --pattern-name "api-development"

# Use pattern
npx claude-flow@alpha neural apply \
  --pattern "api-development" \
  --task-id "task-456"

# List patterns
npx claude-flow@alpha neural patterns
```

## Monitoring and Observability

### Metrics

```bash
# System metrics
npx claude-flow@alpha metrics system

# Swarm metrics
npx claude-flow@alpha metrics swarm --name "development-swarm"

# Agent metrics
npx claude-flow@alpha metrics agent --name "backend-agent-1"

# Task metrics
npx claude-flow@alpha metrics task --id task-123
```

### Logging

```bash
# View logs
npx claude-flow@alpha logs --follow

# Filter by level
npx claude-flow@alpha logs --level error

# Filter by component
npx claude-flow@alpha logs --component swarm-coordinator

# Export logs
npx claude-flow@alpha logs --export logs/debug-$(date +%Y%m%d).log
```

### Performance Analysis

```bash
# Analyze bottlenecks
npx claude-flow@alpha perf analyze

# Benchmark workflows
npx claude-flow@alpha perf benchmark \
  --workflow "api-development" \
  --iterations 10

# Generate report
npx claude-flow@alpha perf report --export reports/performance.html
```

### Health Checks

```bash
# Overall health
curl http://localhost:3000/health

# Component health
curl http://localhost:3000/health/swarm
curl http://localhost:3000/health/mcp
curl http://localhost:3000/health/neural

# Detailed diagnostics
npx claude-flow@alpha diagnostics --verbose
```

## Best Practices

### 1. Choose the Right Topology

- **Mesh**: 3-7 agents, collaborative work
- **Hierarchical**: 10+ agents, clear structure
- **Adaptive**: Variable workloads, auto-optimization

### 2. Optimize Agent Selection

Match agents to tasks:

```javascript
// Backend work
['backend-dev', 'security-manager', 'tester'][
  // Frontend work
  ('frontend-dev', 'designer', 'reviewer')
][
  // Full-stack
  ('backend-dev', 'frontend-dev', 'tester', 'reviewer')
];
```

### 3. Use Hooks for Coordination

Always run hooks in agents:

```bash
# Before task
npx claude-flow@alpha hooks pre-task --description "Task details"

# After editing
npx claude-flow@alpha hooks post-edit --file "src/api.ts"

# After task
npx claude-flow@alpha hooks post-task --task-id "task-123"
```

### 4. Leverage Memory

Store decisions and context:

```bash
# Store architectural decisions
npx claude-flow@alpha memory store \
  --key "architecture/api-design" \
  --value "RESTful with GraphQL for complex queries"

# Agents can retrieve and follow
npx claude-flow@alpha memory retrieve \
  --key "architecture/api-design"
```

### 5. Monitor Performance

Track metrics regularly:

```bash
# Set up monitoring
npx claude-flow@alpha monitor enable \
  --metrics "cpu,memory,task-duration" \
  --interval 60

# Review metrics
npx claude-flow@alpha metrics dashboard
```

### 6. Batch Operations

Execute related tasks concurrently:

```bash
# Batch task execution
npx claude-flow@alpha task execute --batch tasks/sprint-tasks.json

# Concurrent agent spawning
npx claude-flow@alpha agent spawn --types "coder,tester,reviewer"
```

### 7. Regular Cleanup

```bash
# Clean up completed tasks
npx claude-flow@alpha task cleanup --status completed --older-than 7d

# Archive old sessions
npx claude-flow@alpha session archive --older-than 30d

# Prune unused agents
npx claude-flow@alpha agent prune --idle-timeout 1h
```

---

**Next Steps**:

- Explore [Features](FEATURES.md) for detailed feature documentation
- Try [Tutorials](tutorials/) for hands-on learning
- Check [Troubleshooting](TROUBLESHOOTING.md) for common issues

**Need Help?** See the [FAQ](FAQ.md) or contact support.
