# Claude Code Desktop - Environment Configuration Guide

## Overview

This document provides comprehensive documentation for configuring the Claude
Code Desktop environment for the NOA Server project. The configuration system
uses a combination of settings files, environment variables, and hooks to create
a robust, automated development environment optimized for SPARC methodology and
multi-agent orchestration.

**Last Updated**: 2025-10-22

---

## Table of Contents

1. [Configuration Files](#configuration-files)
2. [Environment Variables](#environment-variables)
3. [Hooks System](#hooks-system)
4. [Model Selection](#model-selection)
5. [Permissions](#permissions)
6. [MCP Server Integration](#mcp-server-integration)
7. [Troubleshooting](#troubleshooting)

---

## Configuration Files

### Primary Configuration Files

| File                          | Purpose                                      | Scope                     |
| ----------------------------- | -------------------------------------------- | ------------------------- |
| `.env`                        | Environment variables for the entire project | Project-wide              |
| `.claude/settings.json`       | Claude Code settings, permissions, hooks     | Shared team settings      |
| `.claude/settings.local.json` | Personal developer preferences               | Local overrides           |
| `.claude/config.json`         | Audit system and neural processing config    | Project-specific features |

### Settings Precedence

Settings are loaded in the following order (highest to lowest priority):

1. **Command line arguments** - Flags passed when launching Claude Code
2. **Local project settings** - `.claude/settings.local.json`
3. **Shared project settings** - `.claude/settings.json`
4. **User settings** - `~/.claude/settings.json`
5. **Default settings** - Built-in Claude Code defaults

---

## Environment Variables

### Application Environment

```bash
# Application mode
NODE_ENV=development                    # Options: development, production, test
```

### LLM & Neural Processing

```bash
# Model Configuration
LLM_MODEL_PATH=${PWD}/models/demo.gguf  # Path to GGUF model (null = auto-select)
LLM_MODEL_SELECTION_PROFILE=balanced    # Options: balanced, high-performance, lightweight
LLM_CUDA_ENABLED=false                  # Enable GPU acceleration
LLM_CONTEXT_SIZE=4096                   # Model context window size
LLM_THREADS=0                           # Inference threads (0 = auto-detect)

# Neural Processing
QUEEN_NEURAL_PROCESSING=true            # Enable Queen coordinator
MODELS_DIR=${PWD}/packages/llama.cpp/models  # Model directory
```

**Model Selection Profiles**:

- **balanced**: Best for most deployments, good CPU/GPU performance
- **high-performance**: Requires GPU ≥6GB VRAM, maximum reasoning capability
- **lightweight**: Minimal resources, fast on CPU, suitable for edge deployment

### MCP Server Configuration

```bash
# Server Ports
MCP_PORT=8001                          # Neural processing MCP server
FLOW_NEXUS_PORT=9000                   # Flow-Nexus platform
CLAUDE_FLOW_PORT=9100                  # Claude-Flow orchestration
UI_PORT=9200                           # Web UI

# Server URLs
MCP_BASE_URL=http://localhost:8001
FLOW_NEXUS_URL=http://localhost:9000
CLAUDE_FLOW_URL=http://localhost:9100
```

### Claude Flow Configuration

```bash
# Automation Settings
CLAUDE_FLOW_AUTO_COMMIT=false          # Auto-commit changes
CLAUDE_FLOW_AUTO_PUSH=false            # Auto-push to remote
CLAUDE_FLOW_HOOKS_ENABLED=true         # Enable hooks system
CLAUDE_FLOW_TELEMETRY_ENABLED=true     # Enable telemetry
CLAUDE_FLOW_REMOTE_EXECUTION=true      # Allow remote execution
CLAUDE_FLOW_CHECKPOINTS_ENABLED=true   # Enable checkpoints

# Swarm Configuration
CLAUDE_FLOW_TOPOLOGY=mesh              # Options: hierarchical, mesh, adaptive, collective
CLAUDE_FLOW_MAX_AGENTS=10              # Maximum concurrent agents
CLAUDE_FLOW_SPAWN_TIMEOUT=30000        # Agent spawn timeout (ms)
```

**Topology Options**:

- **hierarchical**: Coordinator-worker pattern, best for complex planning
- **mesh**: Peer-to-peer, optimal for parallel tasks
- **adaptive**: Automatically adjusts topology based on task complexity
- **collective**: Consensus-based decision making

### Audit System Configuration

```bash
# Audit Settings
AUDIT_ENABLED=true                     # Enable audit system
AUDIT_MANDATORY=true                   # Make audits mandatory
AUDIT_AUTO_TRIGGER=true                # Auto-run on task completion
AUDIT_MIN_CONFIDENCE=0.95              # Minimum confidence threshold (0-1)
AUDIT_ENABLE_NEURAL_ANALYSIS=true      # Use neural processing for analysis
AUDIT_ENABLE_TRUTH_GATE=true           # Enable truth gate validation
AUDIT_ENABLE_TRIPLE_VERIFICATION=true  # Enable triple-verification protocol
AUDIT_OUTPUT_DIR=.claude/audit-history # Audit results directory

# Audit Hooks
AUDIT_HOOK_POST_TASK=true              # Run audit after task completion
AUDIT_HOOK_POST_EDIT=false             # Run audit after file edits
AUDIT_HOOK_PRE_COMMIT=false            # Run audit before git commits
```

### SPARC Methodology Configuration

```bash
# SPARC Workflow
SPARC_ENABLED=true                     # Enable SPARC methodology
SPARC_MODE=tdd                         # Default mode: tdd, spec, architect, etc.
SPARC_BATCH_ENABLED=true               # Enable batch processing
SPARC_PIPELINE_ENABLED=true            # Enable pipeline execution

# SPARC Phases
SPARC_SPEC_ENABLED=true                # Specification phase
SPARC_PSEUDOCODE_ENABLED=true          # Pseudocode phase
SPARC_ARCHITECTURE_ENABLED=true        # Architecture phase
SPARC_REFINEMENT_ENABLED=true          # Refinement phase
SPARC_COMPLETION_ENABLED=true          # Completion phase
```

### Neural Network Training

```bash
# Training Settings
NEURAL_TRAINING_ENABLED=true           # Enable neural training
NEURAL_PATTERN_LEARNING=true           # Learn from successful patterns
NEURAL_AUTO_OPTIMIZE=true              # Auto-optimize based on patterns

# Paths
NEURAL_TRAINING_DATA_DIR=${PWD}/claude-flow/training-data
NEURAL_PATTERNS_DIR=${PWD}/claude-flow/patterns
```

### GitHub Integration (Optional)

```bash
# GitHub Settings (uncomment to enable)
# GITHUB_TOKEN=your_github_token_here
# GITHUB_OWNER=your_github_username
# GITHUB_REPO=your_repository_name
GITHUB_AUTO_PR=false                   # Auto-create pull requests
GITHUB_AUTO_ISSUE_TRIAGE=false         # Auto-triage issues
```

### Performance & Monitoring

```bash
# Token Tracking
TOKEN_TRACKING_ENABLED=true            # Track token usage
TOKEN_BUDGET_WARNING_THRESHOLD=0.8     # Warn at 80% budget

# Benchmarking
BENCHMARK_ENABLED=true                 # Enable performance benchmarking
BENCHMARK_OUTPUT_DIR=.claude/benchmarks

# Metrics
METRICS_ENABLED=true                   # Enable metrics collection
METRICS_EXPORT_ON_SESSION_END=true     # Export metrics on session end
METRICS_OUTPUT_DIR=.claude/metrics
```

### Session Management

```bash
# Session Settings
SESSION_AUTO_SAVE=true                 # Auto-save session state
SESSION_SAVE_INTERVAL=300000           # Save interval (ms)
SESSION_RESTORE_ON_START=true          # Restore session on start
SESSION_EXPORT_DIR=.claude/sessions
```

### Security & Validation

```bash
# Command Validation
VALIDATE_COMMANDS_ENABLED=true         # Validate commands for safety
VALIDATE_SAFETY_CHECKS=true            # Run safety checks

# File Operations
VALIDATE_FILE_PATHS=true               # Validate file paths
PREVENT_ROOT_WRITES=true               # Prevent writes to root directories

# Secret Detection
SECRET_DETECTION_ENABLED=true          # Detect secrets in code
SECRET_SCAN_ON_COMMIT=true             # Scan before commits
```

### Development Tools

```bash
# Auto-formatting
AUTO_FORMAT_ENABLED=true               # Auto-format on save
AUTO_FORMAT_LANGUAGES=typescript,javascript,json,markdown

# Linting
LINT_ON_SAVE=false                     # Lint on save
LINT_ON_COMMIT=true                    # Lint before commit

# Testing
AUTO_TEST_ON_CHANGE=false              # Run tests on file change
TEST_COVERAGE_THRESHOLD=80             # Coverage threshold (%)
```

### Advanced Options

```bash
# Logging
LOG_LEVEL=info                         # Options: debug, info, warn, error
LOG_OUTPUT_DIR=.claude/logs
DEBUG=false                            # Debug mode
VERBOSE_LOGGING=false                  # Verbose logging

# Python Environment
PYTHON_VENV_PATH=${PWD}/praisonai_env  # Python virtual environment
PRAISON_AI_ENV=praisonai_env
```

---

## Hooks System

Claude Code supports hooks that execute at various lifecycle events. Hooks are
shell commands that run automatically in response to actions.

### Hook Events

| Event              | When It Fires                   | Use Cases                                 |
| ------------------ | ------------------------------- | ----------------------------------------- |
| `SessionStart`     | When Claude Code session begins | Environment validation, dependency checks |
| `SessionEnd`       | When session ends               | Export metrics, save state                |
| `PreToolUse`       | Before any tool executes        | Validation, resource preparation          |
| `PostToolUse`      | After tool completes            | Formatting, metric tracking               |
| `UserPromptSubmit` | When user submits a prompt      | Custom preprocessing                      |
| `Stop`             | When Claude finishes responding | Cleanup, state persistence                |
| `PreCompact`       | Before context compaction       | Guidance reminders                        |

### Hook Configuration

Hooks are configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/script.sh"
          }
        ]
      }
    ]
  }
}
```

### Current Hooks

#### SessionStart Hook

**Location**: `.claude/hooks/session-start`

**Purpose**: Validates environment on session start

**Functions**:

- ✅ Validates `.env` file and environment variables
- ✅ Checks Node.js and npm versions
- ✅ Verifies Claude Flow installation
- ✅ Detects llama.cpp and GGUF models
- ✅ Checks GPU availability via nvidia-smi
- ✅ Validates Python environment
- ✅ Checks MCP server configuration
- ✅ Prepares audit, session, and metric directories
- ✅ Displays environment summary

#### Post-Task Hook

**Location**: `.claude/hooks/post-task`

**Purpose**: Triggers audit system after task completion

**Functions**:

- Intercepts TodoWrite completions
- Spawns 7-agent audit swarm
- Executes triple-verification protocol
- Generates cryptographic evidence ledger

---

## Model Selection

The Model Selector automatically chooses the optimal SLLM (Small Language Model)
for the Queen coordinator based on hardware capabilities.

### How It Works

1. **Hardware Detection**: Detects CPU, RAM, GPU, and VRAM
2. **Model Scoring**: Scores models using multi-criteria algorithm
3. **Automatic Selection**: Selects best model for hardware
4. **Fallback Chain**: Provides 3 fallback alternatives

### Scoring Algorithm

```
score = queen_fitness * 0.40      // Strategic planning capability
      + reasoning_score * 0.25    // Multi-step reasoning
      + json_reliability * 0.20   // Structured output quality
      + speed_score * 0.10        // Inference performance
      + memory_fit_score * 0.05   // Resource efficiency
```

### CLI Commands

```bash
# List available models
node claude-flow/hooks/select-queen-model.js --list

# Get recommendations for current hardware
node claude-flow/hooks/select-queen-model.js --recommend

# Show model information
node claude-flow/hooks/select-queen-model.js --info phi-3.5-mini

# Benchmark a model
node claude-flow/hooks/select-queen-model.js --benchmark llama-3.1-8b

# Show hardware detection
node claude-flow/hooks/select-queen-model.js --hardware
```

### Recommended Models

#### Premium Tier (GPU ≥6GB VRAM)

- **Llama-3.1-8B-Instruct Q5**: Best reasoning, 92% fitness
- **Gemma2-9B-Instruct Q4**: Strong performance, 90% fitness
- **Phi-3.5-mini-instruct Q8**: Excellent JSON reliability, 95% fitness

#### Balanced Tier (≥4GB RAM)

- **Phi-3.5-mini-instruct Q4**: Recommended default, 95% fitness
- **Gemma2-2B-Instruct Q5**: Good speed, 87% fitness
- **Qwen2-7B-Instruct Q4**: Balanced performance, 88% fitness

#### Lightweight Tier (≥2GB RAM)

- **Qwen2-1.5B-Instruct Q4**: Fast inference, 82% fitness
- **Gemma2-2B-Instruct Q4**: Minimal resources, 85% fitness
- **Llama-3.2-1B-Instruct Q4**: Edge deployment, 78% fitness

---

## Permissions

Permissions control which tools and operations Claude Code can perform.
Configured in `.claude/settings.json`.

### Permission Rules

```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)", // Allow all npm commands
      "Read(/home/user/**)", // Allow reading user directory
      "Write(/project/src/**)" // Allow writing to src
    ],
    "deny": [
      "Bash(rm -rf /)", // Deny destructive commands
      "Write(/etc/**)", // Deny system file writes
      "Read(/home/user/.ssh/id_*)" // Deny SSH key access
    ],
    "ask": [
      "Bash(git push:*)" // Always ask before git push
    ]
  }
}
```

### Pattern Syntax

- **Exact match**: `Bash(npm install)` - Only this exact command
- **Prefix match**: `Bash(npm:*)` - All commands starting with "npm"
- **Glob patterns**: `Read(/src/**/*.ts)` - All TypeScript files in src
- **Wildcards**: `Write|Edit` - Multiple tools

### Current Permissions

**Allowed Operations**:

- All `npx claude-flow` commands
- Git operations (status, diff, log, commit, push)
- Node.js and npm commands
- File operations in project directory
- GPU detection (nvidia-smi)
- Python3, pip, and sqlite3

**Denied Operations**:

- Destructive rm commands (`rm -rf /`, `rm -rf ~`)
- System directory writes (`/etc/**`, `/root/**`)
- SSH key access (`.ssh/id_*`)

---

## MCP Server Integration

MCP (Model Context Protocol) servers provide additional capabilities to Claude
Code.

### Available MCP Servers

| Server              | Purpose                   | Installation                                                 |
| ------------------- | ------------------------- | ------------------------------------------------------------ |
| `claude-flow`       | Multi-agent orchestration | `claude mcp add claude-flow npx claude-flow@alpha mcp start` |
| `ruv-swarm`         | Enhanced coordination     | `claude mcp add ruv-swarm npx ruv-swarm mcp start`           |
| `flow-nexus`        | Cloud features (optional) | `claude mcp add flow-nexus npx flow-nexus@latest mcp start`  |
| `neural-processing` | llama.cpp integration     | Configured via `packages/llama.cpp/shims/http_bridge.py`     |

### Enabling MCP Servers

MCP servers are enabled in `.claude/settings.json`:

```json
{
  "enabledMcpjsonServers": ["claude-flow", "ruv-swarm"]
}
```

### Checking MCP Status

```bash
# List configured MCP servers
claude mcp list

# Expected output:
# claude-flow: ✓ Connected
# neural-processing: ✓ Connected
```

---

## Troubleshooting

### Environment Issues

**Problem**: Environment variables not loaded

**Solution**:

```bash
# Verify .env file exists
ls -la /home/deflex/noa-server/.env

# Check for syntax errors
cat .env | grep -E '^[^#]'

# Source manually
source .env
```

**Problem**: SessionStart hook not executing

**Solution**:

```bash
# Verify hook is executable
chmod +x .claude/hooks/session-start

# Test hook manually
./.claude/hooks/session-start

# Check hook configuration in settings.json
cat .claude/settings.json | jq '.hooks.SessionStart'
```

### Model Selection Issues

**Problem**: No models found

**Solution**:

```bash
# Check models directory
ls -la /home/deflex/noa-server/packages/llama.cpp/models

# Download a model (example: Phi-3.5-mini)
cd packages/llama.cpp/models
wget https://huggingface.co/.../*.gguf

# Verify auto-selection
node claude-flow/hooks/select-queen-model.js --recommend
```

**Problem**: GPU not detected

**Solution**:

```bash
# Check NVIDIA drivers
nvidia-smi

# Verify CUDA availability
nvcc --version

# If no GPU, selector automatically uses CPU-optimized models
```

### MCP Server Issues

**Problem**: MCP server not connecting

**Solution**:

```bash
# Check if server is configured
claude mcp list

# Reinstall server
claude mcp remove claude-flow
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Verify server is running
npx claude-flow@alpha --version
```

### Audit System Issues

**Problem**: Audits not running automatically

**Solution**:

```bash
# Check audit configuration
cat .claude/config.json | jq '.audit'

# Verify post-task hook exists
ls -la .claude/hooks/post-task

# Run audit manually
node claude-flow/hooks/run-audit.js --task-id test-task --target ./src
```

### Permission Issues

**Problem**: Tool execution blocked

**Solution**:

```bash
# Check permission rules
cat .claude/settings.json | jq '.permissions'

# Add permission to allow list
# Edit .claude/settings.json and add to permissions.allow

# Test with --dangerously-skip-permissions (development only)
claude --dangerously-skip-permissions
```

---

## Best Practices

### Environment Variables

✅ **Do**:

- Use `.env` for project-wide configuration
- Keep `.env` out of version control
- Provide `.env.example` as template
- Document all variables in this file

⚠️ **Don't**:

- Hardcode sensitive values
- Commit `.env` to git
- Use production credentials in development

### Hooks

✅ **Do**:

- Make hooks executable (`chmod +x`)
- Use absolute paths in hook scripts
- Log hook execution for debugging
- Keep hooks fast (<5 seconds)

⚠️ **Don't**:

- Run long-running operations in hooks
- Use hooks for side effects
- Ignore hook failures silently

### Model Selection

✅ **Do**:

- Start with auto-selection
- Benchmark before production
- Monitor Queen events
- Keep model database updated

⚠️ **Don't**:

- Hardcode model paths
- Use lightweight models for complex tasks
- Ignore low confidence scores

### Permissions

✅ **Do**:

- Use principle of least privilege
- Test permissions thoroughly
- Document permission requirements
- Review permissions regularly

⚠️ **Don't**:

- Grant broad wildcard permissions
- Bypass permissions in production
- Allow destructive operations by default

---

## Additional Resources

- **Claude Code Documentation**: https://docs.claude.com/en/docs/claude-code
- **Claude Flow Repository**: https://github.com/ruvnet/claude-flow
- **Flow-Nexus Platform**: https://flow-nexus.ruv.io
- **llama.cpp Repository**: https://github.com/ggerganov/llama.cpp

---

## Support

For issues or questions:

1. Check this documentation first
2. Review Claude Code docs at https://docs.claude.com
3. File issues at https://github.com/ruvnet/claude-flow/issues
4. Check session logs in `.claude/logs/`

---

**Document Version**: 1.0.0 **Last Updated**: 2025-10-22 **Maintained By**: NOA
Server Development Team
