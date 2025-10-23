# Code Transformation Quick Start Guide

**For**: `/home/deflex` codebase transformations
**Full Inventory**: See `CODE_TRANSFORMATION_INVENTORY.md`

---

## 🚀 Fastest Path to Transform Code

### Option 1: Hive-Mind Wizard (RECOMMENDED)

```bash
# Navigate to project
cd /home/deflex/noa-server

# Launch interactive wizard
claude-flow hive-mind wizard

# Follow prompts to configure and launch transformation swarm
```

**What it does**: Automatically sets up optimal agent configuration, topology, and spawns intelligent swarm for your transformation task.

### Option 2: Direct Swarm Command

```bash
# One-line transformation
claude-flow hive-mind spawn "Analyze and unify duplicate code in /home/deflex"

# With specific requirements
claude-flow swarm "Refactor and optimize /home/deflex/noa-server" \
  --max-agents 15 \
  --topology adaptive \
  --enable-neural
```

### Option 3: SPARC Methodology

```bash
# For structured transformation workflow
npx claude-flow sparc tdd "Code unification for /home/deflex"

# Or batch execution
npx claude-flow sparc batch optimizer,coder,reviewer \
  "Transform /home/deflex codebase"
```

---

## 📋 Common Transformation Tasks

### Task: Find & Remove Duplicates

```bash
# Quick duplicate detection
npx claude-flow sparc run analyzer "/home/deflex duplicate code detection"

# Full unification
claude-flow swarm "Find and unify all duplicate code in /home/deflex" \
  --max-agents 10
```

### Task: Refactor & Optimize

```bash
# Performance optimization
npx claude-flow sparc run optimizer "/home/deflex performance optimization"

# Full refactoring
claude-flow swarm "Refactor /home/deflex for better performance and maintainability" \
  --max-agents 20
```

### Task: Unify Code Structure

```bash
# Architectural unification
npx claude-flow sparc run architect "/home/deflex unified architecture design"

# Execute unification
claude-flow swarm "Implement unified code structure across /home/deflex" \
  --max-agents 15
```

### Task: Condense & Clean

```bash
# Code condensing
npx claude-flow sparc batch optimizer,coder \
  "Condense and clean /home/deflex codebase"
```

---

## 🎯 Claude Code Task Tool (For Interactive Sessions)

When working within Claude Code CLI, use the Task tool for parallel agent execution:

```javascript
// Single message with ALL agents concurrently
[Parallel Transformation]:

Task("Analyzer", "Find all code patterns in /home/deflex", "analyzer")
Task("Optimizer", "Optimize and condense code", "optimizer")
Task("Unifier", "Unify duplicate implementations", "base-template-generator")
Task("Reviewer", "Review and validate changes", "reviewer")
Task("Tester", "Create test coverage", "tester")

TodoWrite { todos: [
  {id: "1", content: "Analysis complete", status: "in_progress", priority: "high"},
  {id: "2", content: "Optimization complete", status: "pending", priority: "high"},
  {id: "3", content: "Unification complete", status: "pending", priority: "high"},
  {id: "4", content: "Review complete", status: "pending", priority: "high"},
  {id: "5", content: "Tests complete", status: "pending", priority: "high"}
]}

// All in ONE message for 2.8-4.4x speed improvement!
```

---

## 🔍 Audit Your Transformation

Always validate transformations with the audit system:

```bash
# After transformation
/audit --target /home/deflex

# With specific claims
/audit --target /home/deflex --claims '{
  "filesModified": 100,
  "linesChanged": 5000,
  "duplicatesRemoved": 50
}'

# View audit history
/audit-history --stats
```

---

## 💾 Save Your Work

Persist successful transformation patterns for future use:

```bash
# Save transformation session
npx claude-flow memory-persist "deflex-transformation-$(date +%Y%m%d)"

# Train neural network on patterns
npx claude-flow neural-train "Successful code unification patterns"
```

---

## 📊 Available Tools Summary

### 74 Core Agents in `.claude/agents/`
- **5 Core Development**: coder, reviewer, tester, planner, researcher
- **18 SPARC Methodology**: analyzer, architect, optimizer, orchestrator, etc.
- **5 Hive-Mind**: queen, worker, scout, memory-manager, collective-intelligence
- **7 Consensus**: byzantine, raft, gossip, crdt, quorum, security, benchmarker
- **13 GitHub Integration**: pr-manager, code-review-swarm, repo-architect, etc.
- **26+ Specialized**: optimization, templates, neural, analysis, etc.

### 90+ MCP Tools
- Swarm coordination, task orchestration, memory management
- Performance tracking, neural processing, GitHub integration

### 25+ Slash Commands
- Automation, optimization, memory, audit, coordination

### 30+ Automation Scripts
- Prompt optimizer, swarm initializer, validation runner, etc.

---

## ⚡ Performance Tips

1. **Always use parallel execution** - spawn all agents concurrently
2. **Batch in single messages** - 1 MESSAGE = ALL OPERATIONS
3. **Use adaptive topology** - auto-optimizes for task complexity
4. **Enable neural processing** - learns from successful patterns
5. **Run continuous audits** - validate as you transform

**Expected Performance**:
- 2.8-4.4x faster with parallel execution
- 10-20x faster with SDK integration
- 84.8% SWE-Bench solve rate
- 32.3% token reduction

---

## 🆘 Need Help?

**Full Documentation**:
- `/home/deflex/noa-server/docs/CODE_TRANSFORMATION_INVENTORY.md` - Complete inventory
- `/home/deflex/noa-server/CLAUDE.md` - Project instructions
- `/home/deflex/noa-server/claude-flow/docs/` - Claude Flow docs

**Interactive Help**:
```bash
npx claude-flow --help
npx claude-flow sparc modes
npx claude-flow hive-mind --help
```

**Agent Information**:
```bash
# List all available agents
npx claude-flow agents list

# Get specific agent info
npx claude-flow agents info <agent-name>
```

---

**Quick Start Version**: 1.0.0
**Last Updated**: 2025-10-22
**Full Guide**: CODE_TRANSFORMATION_INVENTORY.md
