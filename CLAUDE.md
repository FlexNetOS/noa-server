# Claude Code Configuration - SPARC Development Environment

## 🚨 CRITICAL: CONCURRENT EXECUTION & FILE MANAGEMENT

**ABSOLUTE RULES**:
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories
4. **USE CLAUDE CODE'S TASK TOOL** for spawning agents concurrently, not just MCP

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**MANDATORY PATTERNS:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **Task tool (Claude Code)**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
- **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

### 🎯 CRITICAL: Claude Code Task Tool for Agent Execution

**Claude Code's Task tool is the PRIMARY way to spawn agents:**
```javascript
// ✅ CORRECT: Use Claude Code's Task tool for parallel agent execution
[Single Message]:
  Task("Research agent", "Analyze requirements and patterns...", "researcher")
  Task("Coder agent", "Implement core features...", "coder")
  Task("Tester agent", "Create comprehensive tests...", "tester")
  Task("Reviewer agent", "Review code quality...", "reviewer")
  Task("Architect agent", "Design system architecture...", "system-architect")
```

**MCP tools are ONLY for coordination setup:**
- `mcp__claude-flow__swarm_init` - Initialize coordination topology
- `mcp__claude-flow__agent_spawn` - Define agent types for coordination
- `mcp__claude-flow__task_orchestrate` - Orchestrate high-level workflows

### 📁 File Organization Rules

**NEVER save to root folder. Use these directories:**
- `/src` - Source code files
- `/tests` - Test files
- `/docs` - Documentation and markdown files
- `/config` - Configuration files
- `/scripts` - Utility scripts
- `/examples` - Example code

## Project Overview

This project uses SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology with Claude-Flow orchestration for systematic Test-Driven Development.

## SPARC Commands

### Core Commands
- `npx claude-flow sparc modes` - List available modes
- `npx claude-flow sparc run <mode> "<task>"` - Execute specific mode
- `npx claude-flow sparc tdd "<feature>"` - Run complete TDD workflow
- `npx claude-flow sparc info <mode>` - Get mode details

### Batchtools Commands
- `npx claude-flow sparc batch <modes> "<task>"` - Parallel execution
- `npx claude-flow sparc pipeline "<task>"` - Full pipeline processing
- `npx claude-flow sparc concurrent <mode> "<tasks-file>"` - Multi-task processing

### Build Commands
- `npm run build` - Build project
- `npm run test` - Run tests
- `npm run lint` - Linting
- `npm run typecheck` - Type checking

## SPARC Workflow Phases

1. **Specification** - Requirements analysis (`sparc run spec-pseudocode`)
2. **Pseudocode** - Algorithm design (`sparc run spec-pseudocode`)
3. **Architecture** - System design (`sparc run architect`)
4. **Refinement** - TDD implementation (`sparc tdd`)
5. **Completion** - Integration (`sparc run integration`)

## Code Style & Best Practices

- **Modular Design**: Files under 500 lines
- **Environment Safety**: Never hardcode secrets
- **Test-First**: Write tests before implementation
- **Clean Architecture**: Separate concerns
- **Documentation**: Keep updated

## 🚀 Available Agents (54 Total)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `collective-intelligence-coordinator`, `swarm-memory-manager`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-builder`, `crdt-synchronizer`, `quorum-manager`, `security-manager`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `task-orchestrator`, `memory-coordinator`, `smart-agent`

### GitHub & Repository
`github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `workflow-automation`, `project-board-sync`, `repo-architect`, `multi-repo-swarm`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `system-architect`, `code-analyzer`, `base-template-generator`

### Testing & Validation
`tdd-london-swarm`, `production-validator`

### Migration & Planning
`migration-planner`, `swarm-init`

## 🎯 Claude Code vs MCP Tools

### Claude Code Handles ALL EXECUTION:
- **Task tool**: Spawn and run agents concurrently for actual work
- File operations (Read, Write, Edit, MultiEdit, Glob, Grep)
- Code generation and programming
- Bash commands and system operations
- Implementation work
- Project navigation and analysis
- TodoWrite and task management
- Git operations
- Package management
- Testing and debugging

### MCP Tools ONLY COORDINATE:
- Swarm initialization (topology setup)
- Agent type definitions (coordination patterns)
- Task orchestration (high-level planning)
- Memory management
- Neural features
- Performance tracking
- GitHub integration

**KEY**: MCP coordinates the strategy, Claude Code's Task tool executes with real agents.

## 🚀 Quick Setup

```bash
# Add MCP servers (Claude Flow required, others optional)
claude mcp add claude-flow npx claude-flow@alpha mcp start
claude mcp add ruv-swarm npx ruv-swarm mcp start  # Optional: Enhanced coordination
claude mcp add flow-nexus npx flow-nexus@latest mcp start  # Optional: Cloud features
```

### 🧠 llama.cpp + Claude Code MCP Integration Setup

**Local Neural Processing with Claude Code:**

```bash
# Navigate to llama.cpp package
cd ~/noa-server/packages/llama.cpp

# Launch Claude Code with MCP neural processing (bypasses permission checks)
(praisonai_env) deflex@FlexNetOS-1001:~/noa-server/packages/llama.cpp$ claude --dangerously-skip-permissions

# Verify MCP server connection
claude mcp list
# Expected: neural-processing: ✓ Connected

# Available neural tools in Claude Code:
# - chat_completion: Generate text responses
# - stream_chat: Real-time streaming responses
# - benchmark_model: Performance testing
# - validate_model: GGUF file integrity checks
# - get_system_info: System configuration details
# - list_available_models: Browse available models
```

**MCP Configuration:**

- **Server**: `neural-processing` (llama.cpp MCP server)
- **Location**: `~/noa-server/packages/llama.cpp/shims/http_bridge.py`
- **Models**: GGUF format in `~/noa-server/packages/llama.cpp/models/`
- **Acceleration**: CUDA enabled with VMM support
- **Environment**: `praisonai_env` virtual environment

## MCP Tool Categories

### Coordination

`swarm_init`, `agent_spawn`, `task_orchestrate`

### Monitoring

`swarm_status`, `agent_list`, `agent_metrics`, `task_status`, `task_results`

### Memory & Neural

`memory_usage`, `neural_status`, `neural_train`, `neural_patterns`

### GitHub Integration

`github_swarm`, `repo_analyze`, `pr_enhance`, `issue_triage`, `code_review`

### System

`benchmark_run`, `features_detect`, `swarm_monitor`

### Flow-Nexus MCP Tools (Optional Advanced Features)

Flow-Nexus extends MCP capabilities with 70+ cloud-based orchestration tools:

**Key MCP Tool Categories:**

- **Swarm & Agents**: `swarm_init`, `swarm_scale`, `agent_spawn`, `task_orchestrate`
- **Sandboxes**: `sandbox_create`, `sandbox_execute`, `sandbox_upload` (cloud execution)
- **Templates**: `template_list`, `template_deploy` (pre-built project templates)
- **Neural AI**: `neural_train`, `neural_patterns`, `seraphina_chat` (AI assistant)
- **GitHub**: `github_repo_analyze`, `github_pr_manage` (repository management)
- **Real-time**: `execution_stream_subscribe`, `realtime_subscribe` (live monitoring)
- **Storage**: `storage_upload`, `storage_list` (cloud file management)

**Authentication Required:**

- Register: `mcp__flow-nexus__user_register` or `npx flow-nexus@latest register`
- Login: `mcp__flow-nexus__user_login` or `npx flow-nexus@latest login`
- Access 70+ specialized MCP tools for advanced orchestration

## 🚀 Agent Execution Flow with Claude Code

### The Correct Pattern

1. **Optional**: Use MCP tools to set up coordination topology
2. **REQUIRED**: Use Claude Code's Task tool to spawn agents that do actual work
3. **REQUIRED**: Each agent runs hooks for coordination
4. **REQUIRED**: Batch all operations in single messages

### Example Full-Stack Development

```javascript
// Single message with all agent spawning via Claude Code's Task tool
[Parallel Agent Execution]:
  Task("Backend Developer", "Build REST API with Express. Use hooks for coordination.", "backend-dev")
  Task("Frontend Developer", "Create React UI. Coordinate with backend via memory.", "coder")
  Task("Database Architect", "Design PostgreSQL schema. Store schema in memory.", "code-analyzer")
  Task("Test Engineer", "Write Jest tests. Check memory for API contracts.", "tester")
  Task("DevOps Engineer", "Setup Docker and CI/CD. Document in memory.", "cicd-engineer")
  Task("Security Auditor", "Review authentication. Report findings via hooks.", "reviewer")

  // All todos batched together
  TodoWrite { todos: [...8-10 todos...] }

  // All file operations together
  Write "backend/server.js"
  Write "frontend/App.jsx"
  Write "database/schema.sql"
```

## 📋 Agent Coordination Protocol

### Every Agent Spawned via Task Tool MUST

**1️⃣ BEFORE Work:**

```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-[id]"
```

**2️⃣ DURING Work:**

```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[what was done]"
```

**3️⃣ AFTER Work:**

```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## 🎯 Concurrent Execution Examples

### ✅ CORRECT WORKFLOW: MCP Coordinates, Claude Code Executes

```javascript
// Step 1: MCP tools set up coordination (optional, for complex tasks)
[Single Message - Coordination Setup]:
  mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }
  mcp__claude-flow__agent_spawn { type: "researcher" }
  mcp__claude-flow__agent_spawn { type: "coder" }
  mcp__claude-flow__agent_spawn { type: "tester" }

// Step 2: Claude Code Task tool spawns ACTUAL agents that do the work
[Single Message - Parallel Agent Execution]:
  // Claude Code's Task tool spawns real agents concurrently
  Task("Research agent", "Analyze API requirements and best practices. Check memory for prior decisions.", "researcher")
  Task("Coder agent", "Implement REST endpoints with authentication. Coordinate via hooks.", "coder")
  Task("Database agent", "Design and implement database schema. Store decisions in memory.", "code-analyzer")
  Task("Tester agent", "Create comprehensive test suite with 90% coverage.", "tester")
  Task("Reviewer agent", "Review code quality and security. Document findings.", "reviewer")

  // Batch ALL todos in ONE call
  TodoWrite { todos: [
    {id: "1", content: "Research API patterns", status: "in_progress", priority: "high"},
    {id: "2", content: "Design database schema", status: "in_progress", priority: "high"},
    {id: "3", content: "Implement authentication", status: "pending", priority: "high"},
    {id: "4", content: "Build REST endpoints", status: "pending", priority: "high"},
    {id: "5", content: "Write unit tests", status: "pending", priority: "medium"},
    {id: "6", content: "Integration tests", status: "pending", priority: "medium"},
    {id: "7", content: "API documentation", status: "pending", priority: "low"},
    {id: "8", content: "Performance optimization", status: "pending", priority: "low"}
  ]}

  // Parallel file operations
  Bash "mkdir -p app/{src,tests,docs,config}"
  Write "app/package.json"
  Write "app/src/server.js"
  Write "app/tests/server.test.js"
  Write "app/docs/API.md"
```

### ❌ WRONG (Multiple Messages)

```javascript
Message 1: mcp__claude-flow__swarm_init
Message 2: Task("agent 1")
Message 3: TodoWrite { todos: [single todo] }
Message 4: Write "file.js"
// This breaks parallel coordination!
```

## Performance Benefits

- **84.8% SWE-Bench solve rate**
- **32.3% token reduction**
- **2.8-4.4x speed improvement**
- **27+ neural models**

## Hooks Integration

### Pre-Operation

- Auto-assign agents by file type
- Validate commands for safety
- Prepare resources automatically
- Optimize topology by complexity
- Cache searches

### Post-Operation

- Auto-format code
- Train neural patterns
- Update memory
- Analyze performance
- Track token usage

### Session Management

- Generate summaries
- Persist state
- Track metrics
- Restore context
- Export workflows

## Advanced Features (v2.0.0)

- 🚀 Automatic Topology Selection
- ⚡ Parallel Execution (2.8-4.4x speed)
- 🧠 Neural Training
- 📊 Bottleneck Analysis
- 🤖 Smart Auto-Spawning
- 🛡️ Self-Healing Workflows
- 💾 Cross-Session Memory
- 🔗 GitHub Integration

## Integration Tips

1. Start with basic swarm init
2. Scale agents gradually
3. Use memory for context
4. Monitor progress regularly
5. Train patterns from success
6. Enable hooks automation
7. Use GitHub tools first

## 🔍 Audit System - Mandatory Truth Verification

### Overview

The project includes a comprehensive **Hive-Mind Audit Agent Swarm** that automatically verifies all completed tasks using:

- **7 Specialized Audit Agents** running concurrently
- **Triple-Verification Protocol** (Pass A, Pass B, Pass C)
- **Truth Gate** with evidence ledger and cryptographic hashing
- **Neural Processing** via llama.cpp Queen coordinator
- **SHA-256 Blockchain-style Evidence Chain**

### Automatic Audit Enforcement

**The audit system runs AUTOMATICALLY when you mark a todo as completed.**

When you use TodoWrite with `status: "completed"`, the system:
1. ✅ Intercepts the completion via `.claude/hooks/post-task`
2. 🔍 Spawns the 7-agent audit swarm
3. 📊 Executes triple-verification protocol
4. 🔐 Generates cryptographic evidence ledger
5. 📋 Saves results to `.claude/audit-history/<task-id>/`

**Configuration**: `.claude/config.json`
- `audit.enabled`: Enable/disable audit system
- `audit.mandatory`: Make audits mandatory
- `audit.autoTrigger`: Auto-run on TodoWrite completions
- `audit.minConfidence`: Minimum confidence threshold (default: 0.95)

### Audit Slash Commands

#### `/audit` - Comprehensive Audit
Run full audit on current workspace or specified target.

```bash
/audit                                    # Audit current directory
/audit --target ./src                     # Audit specific directory
/audit --claims '{"files":10,"loc":500}'  # Audit with claims
```

#### `/audit-task` - Audit Specific Task
Audit a completed or in-progress task by ID.

```bash
/audit-task task-123
/audit-task task-123 --description "Phase 5 implementation"
/audit-task task-123 --claims '{"filesCreated":89,"linesOfCode":10750}'
```

#### `/audit-file` - Audit File or Directory
Deep analysis on specific file or directory.

```bash
/audit-file ./src/hive-mind
/audit-file ./src/server.ts
/audit-file ./tests --claims '{"testFiles":20}'
```

#### `/audit-report` - Generate Audit Report
Generate comprehensive report for completed audit.

```bash
/audit-report task-123
/audit-report task-123 --format markdown
```

#### `/audit-config` - View/Modify Configuration
Manage audit system settings.

```bash
/audit-config                             # View current config
/audit-config --show minConfidence        # Show specific setting
/audit-config --enable neural-analysis    # Enable feature
/audit-config --set minConfidence=0.90    # Modify threshold
```

#### `/audit-history` - View Audit History
Display audit execution history and statistics.

```bash
/audit-history                            # Show all audits
/audit-history --limit 10                 # Show last 10
/audit-history --failed                   # Show only failures
/audit-history --stats                    # Show statistics
```

### Audit Agents

The system uses 7 specialized agents:

1. **Report Verification Agent** - Verifies completion reports with formatting/error-correction
2. **File System Scanner** - Recursive file scanning, LOC counting, tree generation
3. **Code Analyzer** - AST parsing, complexity metrics, quality analysis
4. **Cross-Reference Agent** - Multi-source verification with git history
5. **Deep Analytics Agent** - Statistical analysis, anomaly detection, neural processing
6. **Gap Scanner Agent** - Detects missing files and incomplete implementations
7. **Hash & Index Agent** - SHA-256 cryptographic hashing with blockchain-style ledger

### Triple-Verification Protocol

Every audit executes three independent verification passes:

- **Pass A (Self-Check)**: Agent verifies own work
- **Pass B (Independent)**: Different agent re-derives results without Pass A evidence
- **Pass C (Adversarial)**: Actively challenges findings from Pass A and B

**Final confidence** = Average of all passes (with 10% bonus if all complete)

### Truth Gate

Evidence validation system that:
- Prioritizes truth sources (file-system > git > tests > analysis > reports)
- Generates blockchain-style evidence ledger
- Uses SHA-256 cryptographic hashing
- Requires ≥95% confidence threshold by default
- Tracks evidence chain integrity

### Manual Audit Execution

```bash
# Navigate to claude-flow
cd /home/deflex/noa-server/claude-flow

# Run standalone audit
node hooks/run-audit.js --task-id my-task --target ./src

# With custom claims
node hooks/run-audit.js \
  --task-id phase-5 \
  --target ./src/hive-mind \
  --claims '{"filesCreated":89,"linesOfCode":10750}'

# View results
ls -la ../.claude/audit-history/my-task/reports/
```

### Audit Output

Results saved to `.claude/audit-history/<task-id>/`:
- `reports/audit-result.json` - Detailed verification results
- `reports/audit-report.json` - Human-readable report
- `evidence/` - Evidence files with SHA-256 hashes

### Example Audit Result

```json
{
  "verified": false,
  "confidence": 0.15,
  "discrepancies": [
    {
      "type": "file-count-mismatch",
      "severity": "critical",
      "expected": 89,
      "actual": 10,
      "description": "Claimed 89 files created, but only 10 files found"
    },
    {
      "type": "loc-discrepancy",
      "severity": "critical",
      "expected": 10750,
      "actual": 856,
      "description": "Claimed 10,750 LOC, but only 856 LOC found"
    }
  ],
  "evidence": [
    {
      "source": "file-system",
      "hash": "a3f5...",
      "timestamp": "2025-10-22T..."
    }
  ]
}
```

### Integration with Development Workflow

1. **During Development**: Work on tasks normally
2. **Mark Complete**: Use TodoWrite with `status: "completed"`
3. **Automatic Audit**: System spawns audit swarm automatically
4. **Review Results**: Check `.claude/audit-history/<task-id>/`
5. **Fix Discrepancies**: Address any issues found
6. **Re-audit**: Mark fixed tasks as completed again

### Best Practices

- ✅ Always mark tasks as completed in TodoWrite to trigger audits
- ✅ Review audit results before proceeding
- ✅ Address critical and high-severity discrepancies
- ✅ Keep `.claude/config.json` in version control
- ✅ Use `/audit-history` to track progress over time
- ⚠️  Don't disable mandatory audits without good reason
- ⚠️  Investigate low confidence scores (<95%)

## 🤖 Model Selector - Automatic SLLM Selection for Queen

### Overview

The **Model Selector** intelligently chooses the optimal Small Language Model (SLLM) for the Queen coordinator based on hardware capabilities, task requirements, and quality metrics. It eliminates manual model configuration by automatically detecting system resources and selecting from a curated database of 20+ pre-profiled models.

**Key Features:**
- 🎯 **Automatic Hardware Detection** - CPU/GPU/RAM/VRAM detection
- 📊 **Multi-Criteria Scoring** - Weighted algorithm balancing quality, speed, and memory
- 🔄 **Fallback Chains** - Automatic failover to alternative models
- 📈 **Queen Fitness Metrics** - Custom scores for coordination, reasoning, JSON reliability
- 🛠️ **CLI Management Tool** - Interactive model selection, testing, comparison
- ⚡ **Hot-Swappable Models** - Change models at runtime without restart

### How Automatic Selection Works

When Queen initializes without a hardcoded model path:

1. **Hardware Detection**
   ```bash
   # Detects via nvidia-smi and os module
   - CPU: Model, cores
   - RAM: Total system memory
   - GPU: NVIDIA VRAM (if available)
   - OS: Platform and version
   ```

2. **Model Scoring Algorithm**
   ```typescript
   score = queen_fitness * 0.40      // Strategic planning capability
         + reasoning_score * 0.25    // Multi-step reasoning
         + json_reliability * 0.20   // Structured output quality
         + speed_score * 0.10        // Inference performance
         + memory_fit_score * 0.05   // Resource efficiency
   ```

3. **Selection Logic**
   ```
   if (GPU && VRAM >= 6GB) → Llama-3.1-8B Q5 (Premium tier)
   else if (GPU && VRAM >= 4GB) → Phi-3.5-mini Q4 (Balanced tier)
   else if (RAM >= 8GB) → Phi-3.5-mini Q4 CPU (Balanced tier)
   else → Qwen2-1.5B Q4 (Lightweight tier)
   ```

4. **Fallback Chain Generation**
   - Primary model + 3 fallback alternatives
   - Ordered by compatibility score
   - Ensures graceful degradation

### CLI Tool Commands

The Model Selector includes a comprehensive CLI tool for manual selection and testing:

#### List Available Models

```bash
# List all models
node claude-flow/hooks/select-queen-model.js --list

# Filter by tier
node claude-flow/hooks/select-queen-model.js --list --tier Premium
node claude-flow/hooks/select-queen-model.js --list --tier Balanced
node claude-flow/hooks/select-queen-model.js --list --tier Lightweight

# Filter by model family
node claude-flow/hooks/select-queen-model.js --list --family Phi
node claude-flow/hooks/select-queen-model.js --list --family Llama
node claude-flow/hooks/select-queen-model.js --list --family Qwen
```

#### Get Recommendations

```bash
# Auto-recommend best model for current hardware
node claude-flow/hooks/select-queen-model.js --recommend

# Recommend CPU-only model
node claude-flow/hooks/select-queen-model.js --recommend --cpu-only

# Recommend with memory constraint
node claude-flow/hooks/select-queen-model.js --recommend --max-memory 4
```

#### Model Information

```bash
# Show detailed model info
node claude-flow/hooks/select-queen-model.js --info phi-3.5-mini
node claude-flow/hooks/select-queen-model.js --info llama-3.1-8b
node claude-flow/hooks/select-queen-model.js --info qwen2-7b
```

#### Benchmarking

```bash
# Benchmark a specific model
node claude-flow/hooks/select-queen-model.js --benchmark phi-3.5-mini-instruct

# Compare multiple models
node claude-flow/hooks/select-queen-model.js --compare phi-3.5-mini,llama-3.1-8b,qwen2-7b
```

#### System Information

```bash
# Show detected hardware
node claude-flow/hooks/select-queen-model.js --hardware

# Show database statistics
node claude-flow/hooks/select-queen-model.js --stats
```

### Recommended Models by Tier

#### Premium Tier (High Performance)
**Requirements**: GPU with ≥6GB VRAM or ≥8GB RAM

| Model | Parameters | Quant | Fitness | Reasoning | JSON | Speed (GPU) |
|-------|-----------|-------|---------|-----------|------|-------------|
| Llama-3.1-8B-Instruct | 8B | Q5_K_M | 92% | 94% | 95% | 90 tok/s |
| Gemma2-9B-Instruct | 9B | Q4_K_M | 90% | 92% | 93% | 75 tok/s |
| Phi-3.5-mini-instruct | 3.8B | Q8_0 | 95% | 95% | 98% | 120 tok/s |

**Use Cases**: Complex strategic planning, multi-agent coordination, critical decision-making

#### Balanced Tier (Recommended)
**Requirements**: ≥4GB RAM (CPU or GPU)

| Model | Parameters | Quant | Fitness | Reasoning | JSON | Speed (CPU) |
|-------|-----------|-------|---------|-----------|------|-------------|
| Phi-3.5-mini-instruct | 3.8B | Q4_K_M | 95% | 95% | 98% | 40 tok/s |
| Gemma2-2B-Instruct | 2B | Q5_K_M | 87% | 88% | 91% | 65 tok/s |
| Qwen2-7B-Instruct | 7B | Q4_K_M | 88% | 90% | 92% | 30 tok/s |

**Use Cases**: Standard coordination, real-time decisions, production deployments

#### Lightweight Tier (Minimal Resources)
**Requirements**: ≥2GB RAM

| Model | Parameters | Quant | Fitness | Reasoning | JSON | Speed (CPU) |
|-------|-----------|-------|---------|-----------|------|-------------|
| Qwen2-1.5B-Instruct | 1.5B | Q4_K_M | 82% | 85% | 88% | 75 tok/s |
| Gemma2-2B-Instruct | 2B | Q4_K_M | 85% | 86% | 89% | 55 tok/s |
| Llama-3.2-1B-Instruct | 1B | Q4_K_M | 78% | 80% | 84% | 85 tok/s |

**Use Cases**: Edge deployment, resource-constrained environments, development/testing

### Hardware Requirements

#### Minimum Requirements
- **CPU**: 2+ cores
- **RAM**: 2GB minimum (4GB recommended)
- **Disk**: 2-8GB for model files
- **OS**: Linux, macOS, Windows (WSL2)

#### GPU Acceleration (Optional)
- **NVIDIA GPU** with CUDA support
- **VRAM**: 3GB minimum (6GB recommended)
- **Driver**: Latest NVIDIA drivers with CUDA 11+

#### Optimal Configurations
- **Development**: 8GB RAM, CPU-only, Phi-3.5-mini Q4
- **Production**: 16GB RAM + 6GB VRAM, Llama-3.1-8B Q5
- **Edge/Mobile**: 4GB RAM, CPU-only, Qwen2-1.5B Q4

### Configuration

#### Enable Automatic Selection

Edit `.claude/config.json`:

```json
{
  "audit": {
    "llamaCpp": {
      "enabled": true,
      "modelPath": null,                    // Set to null for auto-selection
      "cudaEnabled": false,                 // Set true if GPU available
      "queenNeuralProcessing": true,
      "autoSelectModel": true,              // Enable auto-selection
      "modelSelectionProfile": "balanced"   // Profile: balanced/high-performance/lightweight
    }
  }
}
```

#### Deployment Profiles

Available profiles in `claude-flow/src/hive-mind/config/queen-models.json`:

- **high-performance**: Best reasoning, requires GPU ≥6GB VRAM
- **balanced**: Good CPU/GPU performance, optimal for most deployments
- **lightweight**: Minimal resources, fast on CPU
- **reasoning-focused**: Maximum strategic thinking capabilities
- **fast-coordination**: Speed priority, real-time coordination
- **production**: Balanced reliability and performance for 24/7 operation

#### Manual Model Override

To use a specific model instead of auto-selection:

```json
{
  "audit": {
    "llamaCpp": {
      "modelPath": "/path/to/your/model.gguf",
      "autoSelectModel": false
    }
  }
}
```

### Integration with Queen Coordinator

The Model Selector integrates seamlessly with the Queen coordinator:

#### Automatic Integration

```typescript
// Queen.ts automatically initializes with best model
const queen = new Queen(config);
await queen.initialize();
// Model auto-selected based on hardware

// Get current model info
const modelInfo = queen.getModelInfo();
console.log(`Using: ${modelInfo.model_name}`);
console.log(`Fitness: ${modelInfo.queen_fitness_score}`);
```

#### Runtime Model Switching

```typescript
// Switch to a different model at runtime
const newModel = await selector.findModel('llama-3.1-8b', 'Q4_K_M');
if (newModel) {
  await queen.switchModel(newModel);
  console.log('Model switched successfully');
}
```

#### Performance Benchmarking

```typescript
// Benchmark current model
const benchmark = await queen.benchmarkCurrentModel();
console.log(`Tokens/sec: ${benchmark.tokensPerSecond}`);
console.log(`Latency: ${benchmark.averageLatency}ms`);
```

### Model Database Management

The model database is stored in CSV format for easy updates:

**Location**: `/home/deflex/noa-server/models/queen-model-profiles.csv`

**Adding New Models**:
1. Download GGUF model file
2. Add row to CSV with metrics:
   - Model name, family, parameters, quantization
   - Queen fitness score (0-1)
   - Reasoning score (0-1)
   - JSON reliability (0-1)
   - Inference speeds (CPU/GPU)
   - Memory requirements
   - Download URL, license, tier
3. Reload Queen or restart application

**Example CSV Entry**:
```csv
Phi-3.5-mini-instruct,Phi,3.8B,Q4_K_M,0.95,0.95,0.98,40,120,2.5,2.5,4096,2.3,MIT,...
```

### Events and Monitoring

Queen emits events during model selection:

```typescript
queen.on('model-auto-selected', (event) => {
  console.log(`Selected: ${event.profile.model_name}`);
  console.log(`Reasoning: ${event.reasoning}`);
  console.log(`Fallbacks: ${event.fallbacks.map(f => f.model_name).join(', ')}`);
});

queen.on('model-switched', (event) => {
  console.log(`Switched to: ${event.profile.model_name}`);
});
```

### Troubleshooting

#### Model Selection Fails

```bash
# Check hardware detection
node claude-flow/hooks/select-queen-model.js --hardware

# Verify models in database
node claude-flow/hooks/select-queen-model.js --stats

# Try manual recommendation
node claude-flow/hooks/select-queen-model.js --recommend --cpu-only
```

#### Performance Issues

```bash
# Benchmark current model
node claude-flow/hooks/select-queen-model.js --benchmark <model-name>

# Try lightweight tier
# Edit .claude/config.json: "modelSelectionProfile": "lightweight"
```

#### GPU Not Detected

```bash
# Verify NVIDIA drivers
nvidia-smi

# Check CUDA availability
# If no GPU, selector automatically uses CPU-optimized models
```

### Best Practices

- ✅ **Start with auto-selection** - Let the system choose optimal model
- ✅ **Use balanced profile** - Best for most deployments
- ✅ **Benchmark before production** - Test model performance with your workload
- ✅ **Monitor Queen events** - Track model selection and switching
- ✅ **Keep CSV updated** - Add new models as they become available
- ✅ **Test fallbacks** - Verify fallback chain works in your environment
- ⚠️  **Don't hardcode model paths** - Use auto-selection for flexibility
- ⚠️  **Review fitness scores** - Ensure model meets your quality requirements

## Support

- Documentation: <https://github.com/ruvnet/claude-flow>
- Issues: <https://github.com/ruvnet/claude-flow/issues>
- Flow-Nexus Platform: <https://flow-nexus.ruv.io> (registration required for cloud features)

---

Remember: **Claude Flow coordinates, Claude Code creates!**

## Important Instruction Reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.
