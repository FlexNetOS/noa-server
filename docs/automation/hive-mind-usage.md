# Hive-Mind Auto-Initialization System

## Overview

The Hive-Mind Auto-Initialization System ensures that every task in the
Noa-server starts with an active Claude Flow swarm coordination environment.
This provides intelligent task distribution, memory persistence, and neural
pattern learning across all development activities.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Task Execution Entry                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Hive-Mind Pre-Task Hook (Automatic)            │
│  - Check for active session                                 │
│  - Auto-initialize if needed                                │
│  - Detect optimal topology                                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Claude Flow Swarm Init                      │
│  - Initialize swarm with detected topology                  │
│  - Spawn coordinator agents                                 │
│  - Setup memory persistence layer                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Task Execution                           │
│  - Agents coordinate via memory                             │
│  - Hooks track file edits                                   │
│  - Neural patterns learned                                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Hive-Mind Post-Task Hook                       │
│  - Save session state                                       │
│  - Archive metrics                                          │
│  - Generate task summary                                    │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Initialization Script (`scripts/automation/hive-mind-init.sh`)

**Purpose**: Automatically initializes Claude Flow swarm before task execution.

**Features**:

- Auto-detects optimal topology based on task description
- Spawns appropriate coordinator agents
- Initializes memory persistence layer
- Health check validation

**Usage**:

```bash
# Manual initialization
bash scripts/automation/hive-mind-init.sh "Build REST API backend" "high"

# With complexity detection
bash scripts/automation/hive-mind-init.sh "Research API patterns" "medium"

# Default initialization
bash scripts/automation/hive-mind-init.sh
```

**Parameters**:

1. `task_description` (optional): Description of the task for topology detection
2. `complexity` (optional): Task complexity (`simple`, `medium`, `complex`)

**Output**:

```bash
HIVE_MIND_SESSION_ID=swarm-1234567890-12345
HIVE_MIND_TOPOLOGY=hierarchical
HIVE_MIND_MAX_AGENTS=10
HIVE_MIND_STATUS=active
```

### 2. Hooks Script (`scripts/automation/hive-mind-hooks.sh`)

**Purpose**: Coordination hooks for pre-task, post-task, and session management.

**Available Hooks**:

#### Pre-Task Hook

```bash
bash scripts/automation/hive-mind-hooks.sh pre-task "Build feature X" "task-123"
```

- Checks for active hive-mind session
- Auto-initializes if needed
- Runs Claude Flow pre-task hook
- Stores task metadata

#### Post-Task Hook

```bash
bash scripts/automation/hive-mind-hooks.sh post-task "task-123" "completed"
```

- Runs Claude Flow post-task hook
- Updates task metadata
- Generates execution summary

#### Post-Edit Hook

```bash
bash scripts/automation/hive-mind-hooks.sh post-edit "/path/to/file.js" "swarm/edits/feature-x"
```

- Tracks file modifications
- Stores in swarm memory
- Enables neural pattern learning

#### Session Restore Hook

```bash
bash scripts/automation/hive-mind-hooks.sh session-restore "swarm-1234567890-12345"
```

- Restores previous session state
- Loads memory context
- Reactivates agents

#### Session End Hook

```bash
bash scripts/automation/hive-mind-hooks.sh session-end true
```

- Archives session data
- Exports metrics
- Clears active session

#### Notification Hook

```bash
bash scripts/automation/hive-mind-hooks.sh notify "Deployment completed" "info"
```

- Sends notification to swarm
- Logs to session notifications

### 3. Configuration (`config/hive-mind/default-config.yaml`)

**Purpose**: Central configuration for hive-mind behavior.

**Key Settings**:

```yaml
# Swarm topology (hierarchical, mesh, adaptive)
topology: 'adaptive'

# Maximum concurrent agents
maxAgents: 6

# Coordinator types
coordinatorTypes:
  - 'hierarchical-coordinator'
  - 'mesh-coordinator'
  - 'adaptive-coordinator'

# Memory and neural features
enableMemory: true
enableNeural: true

# Auto-assignment by file type
autoAssignment:
  autoAssignByFileType: true
  fileTypeMapping:
    - pattern: '*.js|*.ts'
      agent: 'coder'
    - pattern: '*.test.*'
      agent: 'tester'

# Task complexity detection
complexityDetection:
  enabled: true
  rules:
    - keyword: 'backend|api'
      complexity: 'high'
      topology: 'hierarchical'
```

## Integration with package.json

The hive-mind system is automatically integrated with all major npm scripts via
pre-hooks:

```json
{
  "scripts": {
    "swarm:init": "bash scripts/automation/hive-mind-init.sh",
    "prehive": "bash scripts/automation/hive-mind-hooks.sh pre-task 'General task'",
    "posthive": "bash scripts/automation/hive-mind-hooks.sh post-task"
  }
}
```

### Adding Hive-Mind to Custom Tasks

**Option 1: Automatic Pre-Hook**

```bash
# Add to scripts/tasks/your-task.sh
#!/bin/bash
set -euo pipefail

# Auto-initialize hive-mind
bash "$(dirname "$0")/../automation/hive-mind-hooks.sh" pre-task "Your task description"

# Your task logic here
echo "Running task..."

# Post-task hook
bash "$(dirname "$0")/../automation/hive-mind-hooks.sh" post-task "task-id" "completed"
```

**Option 2: Manual Integration**

```bash
# Initialize hive-mind
source <(bash scripts/automation/hive-mind-init.sh "Task description" "medium")

# Use session ID
echo "Session: $HIVE_MIND_SESSION_ID"

# Execute task with coordination
npx claude-flow@alpha task execute --session-id "$HIVE_MIND_SESSION_ID"
```

## Topology Selection Guide

### Hierarchical Topology

**Best for**: Complex backend development, API design, multi-service
architectures

**Characteristics**:

- Coordinator agents manage worker agents
- Clear task delegation hierarchy
- Best for coordinated, sequential workflows

**Auto-triggers**:

- Task description contains: `backend`, `api`, `server`, `database`
- Complexity: `high` or `complex`

**Max Agents**: 10

### Mesh Topology

**Best for**: Research, analysis, parallel independent tasks

**Characteristics**:

- All agents are peers
- Direct agent-to-agent communication
- Best for distributed, parallel workflows

**Auto-triggers**:

- Task description contains: `research`, `analyze`, `investigate`
- Complexity: `simple` or `low`

**Max Agents**: 3-5

### Adaptive Topology

**Best for**: Testing, general development, mixed workflows

**Characteristics**:

- Dynamically adjusts based on workload
- Learns optimal patterns over time
- Best for varied, unpredictable workflows

**Auto-triggers**:

- Task description contains: `test`, `qa`, `validation`
- Complexity: `medium`
- Default when no specific pattern detected

**Max Agents**: 6

## Memory Persistence

### Storage Structure

```
.hive-mind/
├── memory/
│   ├── swarm-1234567890-12345/
│   │   ├── init-state.json
│   │   ├── task-task-123.json
│   │   ├── edited-files.json
│   │   └── notifications.json
│   └── swarm-9876543210-54321/
├── sessions/
│   ├── current-session.txt
│   ├── swarm-1234567890-12345.json
│   └── archive/
│       └── swarm-old-session.json
└── logs/
    ├── init.log
    ├── hooks.log
    └── coordinators.log
```

### Session Metadata Format

```json
{
  "sessionId": "swarm-1234567890-12345",
  "topology": "hierarchical",
  "maxAgents": 10,
  "timestamp": "2025-10-22T07:00:00Z",
  "status": "active",
  "coordinators": ["hierarchical-coordinator", "mesh-coordinator"],
  "endTime": "2025-10-22T08:00:00Z"
}
```

### Task Metadata Format

```json
{
  "taskId": "task-123",
  "description": "Build REST API backend",
  "sessionId": "swarm-1234567890-12345",
  "startTime": "2025-10-22T07:00:00Z",
  "endTime": "2025-10-22T07:30:00Z",
  "status": "completed"
}
```

## Claude Flow Coordination Protocol

Every task execution follows this coordination protocol:

### 1. Pre-Task Phase

```bash
# Auto-run by hive-mind-hooks.sh
npx claude-flow@alpha hooks pre-task --description "Build feature X"
npx claude-flow@alpha hooks session-restore --session-id "$HIVE_MIND_SESSION_ID"
```

### 2. During Task Execution

```bash
# After file edits
npx claude-flow@alpha hooks post-edit \
  --file "src/server.js" \
  --memory-key "swarm/backend/server-implementation"

# Progress notifications
npx claude-flow@alpha hooks notify \
  --message "API endpoints implemented"
```

### 3. Post-Task Phase

```bash
# Auto-run by hive-mind-hooks.sh
npx claude-flow@alpha hooks post-task --task-id "task-123"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## Health Monitoring

### Manual Health Check

```bash
bash scripts/automation/hive-mind-init.sh && \
  grep "HEALTHY" logs/hive-mind/init.log
```

### Automated Health Checks

Configured in `config/hive-mind/default-config.yaml`:

```yaml
healthCheck:
  enabled: true
  interval: 30 # seconds
  checkMemory: true
  checkAgents: true
  checkSession: true
  autoRestart: true
```

## Troubleshooting

### Issue: No Active Session

**Symptom**: `No active hive-mind session found`

**Solution**:

```bash
# Manual initialization
bash scripts/automation/hive-mind-init.sh "Task description"

# Verify session
cat .hive-mind/sessions/current-session.txt
```

### Issue: Memory Initialization Failure

**Symptom**: `Memory initialization had issues`

**Solution**:

```bash
# Check memory directory permissions
ls -la .hive-mind/memory/

# Recreate memory directory
rm -rf .hive-mind/memory
mkdir -p .hive-mind/memory

# Reinitialize
bash scripts/automation/hive-mind-init.sh
```

### Issue: Swarm Already Initialized

**Symptom**: `Swarm may have been previously initialized`

**Solution**: This is non-critical. The system will reuse the existing swarm.

```bash
# Check swarm status
npx claude-flow@alpha swarm status

# Force new session (if needed)
bash scripts/automation/hive-mind-hooks.sh session-end true
bash scripts/automation/hive-mind-init.sh
```

## Performance Metrics

### Expected Performance Gains

- **84.8%** SWE-Bench solve rate with swarm coordination
- **32.3%** token reduction through memory reuse
- **2.8-4.4x** speed improvement from parallel execution

### Monitoring Performance

```bash
# View session metrics
cat .hive-mind/sessions/swarm-*/metrics.json

# View coordination logs
tail -f logs/hive-mind/hooks.log

# View coordinator activity
tail -f logs/hive-mind/coordinators.log
```

## Advanced Usage

### Custom Topology Configuration

```bash
# Override topology in config
sed -i 's/topology: "adaptive"/topology: "hierarchical"/' \
  config/hive-mind/default-config.yaml

# Reinitialize with new topology
bash scripts/automation/hive-mind-init.sh
```

### Multi-Session Management

```bash
# Start new parallel session
SESSION_ID="swarm-custom-$(date +%s)"
bash scripts/automation/hive-mind-hooks.sh session-restore "$SESSION_ID"

# Switch between sessions
echo "swarm-new-session" > .hive-mind/sessions/current-session.txt
```

### Neural Pattern Training

```bash
# Enable neural training in config
sed -i 's/autoTrain: false/autoTrain: true/' \
  config/hive-mind/default-config.yaml

# Trigger manual training
npx claude-flow@alpha hooks neural-train --session-id "$HIVE_MIND_SESSION_ID"
```

## Best Practices

### 1. Always Use Pre-Task Hooks

```bash
# Good
bash scripts/automation/hive-mind-hooks.sh pre-task "Task description"
# Your task logic
bash scripts/automation/hive-mind-hooks.sh post-task "task-id"

# Bad - no coordination
# Your task logic without hooks
```

### 2. Provide Descriptive Task Names

```bash
# Good - enables smart topology detection
bash scripts/automation/hive-mind-init.sh "Build REST API with authentication" "high"

# Bad - generic description
bash scripts/automation/hive-mind-init.sh "Do work"
```

### 3. Track All File Edits

```bash
# After modifying file
bash scripts/automation/hive-mind-hooks.sh post-edit \
  "$FILE_PATH" \
  "swarm/feature-x/$(basename "$FILE_PATH")"
```

### 4. Clean Up Sessions

```bash
# End session when task complete
bash scripts/automation/hive-mind-hooks.sh session-end true

# Archive old sessions (auto-configured)
# Sessions older than 30 days are automatically archived
```

## Configuration Reference

See `config/hive-mind/default-config.yaml` for all available options:

- **Swarm Settings**: topology, maxAgents, coordinatorTypes
- **Memory Settings**: enableMemory, enableNeural, persistencePath
- **Performance**: parallelExecution, maxConcurrentTasks, taskTimeout
- **Auto-Assignment**: fileTypeMapping, complexityDetection
- **Health Checks**: enabled, interval, autoRestart
- **Logging**: level, logDirectory, rotateDaily
- **Security**: validateAgentCommands, requireApproval

## Support and Resources

- **Claude Flow Documentation**: https://github.com/ruvnet/claude-flow
- **Issue Tracker**: https://github.com/ruvnet/claude-flow/issues
- **Project Guide**: `/home/deflex/noa-server/CLAUDE.md`

## License

Part of the Noa-server project. See project LICENSE for details.
