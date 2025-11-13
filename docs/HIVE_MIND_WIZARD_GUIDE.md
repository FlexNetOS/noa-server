# Hive-Mind Interactive Configuration Wizard

Complete guide for configuring and using the Hive-Mind Interactive Wizard to set up your multi-agent swarm coordination system.

## Overview

The Hive-Mind Wizard is a complete replacement for the stub wizard in the global `claude-flow` package. It provides an interactive command-line interface for configuring all aspects of the Hive-Mind system, including:

- MCP tools integration
- Authentication and audit logging
- Neural processing with llama.cpp
- Memory backend configuration
- Dynamic scaling and parallel swarms
- Monitoring and metrics

**Built with zero external dependencies** - uses only Node.js built-in modules (`readline`, `fs`, `path`, `child_process`).

## Installation

The wizard is already integrated into your project. No additional installation required.

## Usage

### Running the Wizard

There are three ways to run the wizard:

```bash
# Method 1: Via NPM script (recommended)
npm run hive:wizard

# Method 2: Via alternative NPM script
npm run hive:configure

# Method 3: Direct execution
npx tsx scripts/hive-mind-wizard.ts
```

### Interactive Prompts

The wizard will guide you through 7 configuration steps:

1. **MCP Tools Configuration** (Step 1)
2. **Authentication Service Setup** (Step 2)
3. **Neural Processing with llama.cpp** (Step 3)
4. **Memory Backend Configuration** (Step 4)
5. **Default Swarm Settings** (Step 5)
6. **Dynamic Scaling Configuration** (Step 6)
7. **Monitoring Configuration** (Step 7)

### Example Session

```
🧙 Hive-Mind Interactive Configuration Wizard

Version 2.0.0 - Complete Integration Setup

📦 Step 1: MCP Tools Configuration

✓ claude-flow detected: 2.7.0
Enable MCP tools integration? (y/n, default: y): y
Enable parallel MCP tool execution? (y/n, default: y): y
MCP tool timeout (ms, default: 60000): 60000

✓ MCP Tools configured

🔐 Step 2: Authentication Service Setup

✓ auth-service.ts found
✓ auth-logger.ts found
Enable authentication and audit logging? (y/n, default: y): y
Log file rotation size (bytes, default: 10485760): 10485760
Number of log files to retain? (default: 10): 10

✓ Authentication configured

... (continues through all 7 steps)

🎉 Hive-Mind Configuration Complete!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Configuration Summary:

  MCP Tools: Enabled
  Auth Service: Enabled
  Neural Processing: Enabled
  Memory Backend: sqlite
  Default Workers: 20
  Dynamic Scaling: Enabled
  Parallel Swarms: Enabled
  Monitoring: Enabled

📁 Configuration Files:

  /home/deflex/noa-server/.hive-mind/config.json
  /home/deflex/noa-server/.hive-mind/wizard-config.json

🚀 Next Steps:

  1. Review configuration: cat /home/deflex/noa-server/.hive-mind/config.json
  2. Initialize hive-mind: npx claude-flow@alpha hive-mind init
  3. Spawn your first swarm: npx claude-flow@alpha hive-mind spawn "Your objective"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Ready to coordinate swarms!
```

## Configuration Steps

### Step 1: MCP Tools Configuration

Configures Model Context Protocol (MCP) tools integration.

**Prompts:**
- Enable MCP tools integration? (y/n, default: y)
- Enable parallel MCP tool execution? (y/n, default: y)
- MCP tool timeout (ms, default: 60000)

**Auto-Detection:**
- Detects `claude-flow` version if installed

**Configuration Generated:**
```json
{
  "mcpTools": {
    "enabled": true,
    "parallel": true,
    "timeout": 60000
  }
}
```

### Step 2: Authentication Service Setup

Configures authentication service and audit logging.

**Prompts:**
- Enable authentication and audit logging? (y/n, default: y)
- Log file rotation size (bytes, default: 10485760)
- Number of log files to retain? (default: 10)

**Auto-Detection:**
- Checks for `.hive-mind/services/auth-service.ts`
- Checks for `.hive-mind/services/auth-logger.ts`

**Configuration Generated:**
```json
{
  "integrations": {
    "authService": {
      "enabled": true,
      "required": true,
      "path": ".hive-mind/services/auth-service.ts"
    },
    "authLogger": {
      "enabled": true,
      "required": true,
      "logPath": ".hive-mind/logs/auth-audit.log",
      "rotationSize": 10485760,
      "retention": 10
    }
  }
}
```

### Step 3: Neural Processing Configuration

Configures llama.cpp integration for Queen coordinator.

**Prompts:**
- Enable llama.cpp neural processing for Queen coordinator? (y/n, default: y)
- Enable CUDA GPU acceleration? (y/n, default: y if GPU detected)
- Path to GGUF model file? (default: auto-detected)
- Fallback to Claude API if llama.cpp fails? (y/n, default: y)

**Auto-Detection:**
- Checks for `packages/llama.cpp/models` directory
- Detects NVIDIA GPU via `nvidia-smi`
- Suggests default model path if found

**Configuration Generated:**
```json
{
  "integrations": {
    "llamaCoordinator": {
      "enabled": true,
      "required": false,
      "path": ".hive-mind/integrations/llama-coordinator.ts",
      "cudaEnabled": true,
      "fallbackToClaude": true
    }
  }
}
```

### Step 4: Memory Backend Configuration

Configures persistent memory storage.

**Prompts:**
- Memory backend? (sqlite/redis/in-memory, default: sqlite)
- Memory cache size (entries, default: 100)
- Memory TTL (seconds, default: 86400)
- Memory sync interval (ms, default: 30000)

**Configuration Generated:**
```json
{
  "memory": {
    "alwaysUse": true,
    "backend": "sqlite",
    "path": ".hive-mind/memory.db",
    "cacheSize": 100,
    "ttl": 86400,
    "syncInterval": 30000
  }
}
```

### Step 5: Default Swarm Settings

Configures default settings for swarm spawning.

**Prompts:**
- Default Queen coordinator type? (strategic/tactical/operational/adaptive, default: strategic)
- Default maximum workers? (default: 20)
- Consensus algorithm? (majority/unanimous/weighted/queen-veto, default: majority)
- Enable auto-scaling by default? (y/n, default: y)

**Configuration Generated:**
```json
{
  "defaults": {
    "queenType": "strategic",
    "maxWorkers": 20,
    "consensusAlgorithm": "majority",
    "memorySize": 100,
    "autoScale": true,
    "encryption": false
  }
}
```

### Step 6: Dynamic Scaling Configuration

Configures dynamic worker scaling and parallel swarms.

**Prompts:**
- Enable dynamic scaling? (y/n, default: y)
- Minimum workers? (default: 2)
- Maximum workers? (default: 50)
- Auto-scale threshold (0-1, default: 0.8)
- Scale up by (workers, default: 5)
- Scale down by (workers, default: 2)
- Cooldown period (ms, default: 300000)
- Enable parallel swarms? (y/n, default: y)
- Maximum concurrent swarms? (default: 10)

**Configuration Generated:**
```json
{
  "dynamicScaling": {
    "enabled": true,
    "minWorkers": 2,
    "maxWorkers": 50,
    "autoScaleThreshold": 0.8,
    "scaleUpBy": 5,
    "scaleDownBy": 2,
    "cooldownPeriod": 300000
  },
  "parallelSwarms": {
    "enabled": true,
    "maxConcurrent": 10,
    "resourceSharing": true,
    "memoryIsolation": false
  }
}
```

### Step 7: Monitoring Configuration

Configures metrics collection and health checks.

**Prompts:**
- Enable monitoring and metrics? (y/n, default: y)
- Metrics collection interval (ms, default: 60000)
- Health check interval (ms, default: 30000)
- Enable performance tracking? (y/n, default: y)

**Configuration Generated:**
```json
{
  "monitoring": {
    "enabled": true,
    "metricsInterval": 60000,
    "healthCheckInterval": 30000,
    "performanceTracking": true
  }
}
```

## Output Files

The wizard generates two configuration files:

### 1. `.hive-mind/config.json`

Main Hive-Mind configuration file containing all runtime settings.

**Location:** `/home/deflex/noa-server/.hive-mind/config.json`

**Contents:**
- `version`: Configuration version (2.0.0)
- `initialized`: Timestamp of initialization
- `defaults`: Default swarm settings
- `mcpTools`: MCP integration settings
- `dynamicScaling`: Auto-scaling configuration
- `parallelSwarms`: Parallel swarm settings
- `integrations`: Auth, neural, and other integrations
- `memory`: Memory backend configuration
- `monitoring`: Monitoring settings

### 2. `.hive-mind/wizard-config.json`

Wizard state and completion tracking.

**Location:** `/home/deflex/noa-server/.hive-mind/wizard-config.json`

**Contents:**
- `wizardVersion`: Wizard version (2.0.0)
- `wizardCompleted`: Completion status (boolean)
- `completedAt`: Completion timestamp
- `mandatorySteps`: Completion status of each step
- `mcpTools`: MCP tool status and paths
- `llamaCpp`: Neural processing settings
- `memory`: Memory configuration

## Reconfiguration

To reconfigure an already-completed wizard:

```bash
npm run hive:wizard
```

The wizard will detect existing configuration and ask:

```
Wizard already completed. Reconfigure? (y/n): y
```

Answer `y` to proceed with reconfiguration, or `n` to keep existing settings.

## Default Values

The wizard provides sensible defaults for all prompts:

| Setting | Default Value | Rationale |
|---------|--------------|-----------|
| MCP Tools Enabled | Yes | Required for coordination |
| Parallel Execution | Yes | Better performance |
| MCP Timeout | 60000ms | 1 minute for tool calls |
| Auth Service | Yes | Security best practice |
| Log Rotation Size | 10485760 bytes | 10MB log files |
| Log Retention | 10 files | 100MB total logs |
| Neural Processing | Yes (if models found) | Enhanced planning |
| CUDA Enabled | Yes (if GPU detected) | Faster inference |
| Fallback to Claude | Yes | Reliability |
| Memory Backend | SQLite | Persistent + portable |
| Cache Size | 100 entries | Balance memory/speed |
| Memory TTL | 86400s (24h) | Daily refresh |
| Queen Type | Strategic | Long-term planning |
| Max Workers | 20 | Good starting point |
| Consensus | Majority | Democratic decisions |
| Auto-Scale | Yes | Resource optimization |
| Min Workers | 2 | Always active |
| Max Workers | 50 | Prevent runaway |
| Scale Threshold | 0.8 (80%) | High utilization trigger |
| Scale Up By | 5 workers | Aggressive scaling |
| Scale Down By | 2 workers | Conservative downsizing |
| Cooldown Period | 300000ms (5min) | Prevent flapping |
| Parallel Swarms | Yes | Multi-task capability |
| Max Concurrent | 10 swarms | Manageable coordination |
| Monitoring | Yes | Observability |
| Metrics Interval | 60000ms (1min) | Regular sampling |
| Health Check | 30000ms (30s) | Quick failure detection |
| Perf Tracking | Yes | Performance insights |

## Next Steps After Wizard

Once the wizard completes, follow these steps:

### 1. Review Configuration

```bash
# View main config
cat .hive-mind/config.json

# View wizard state
cat .hive-mind/wizard-config.json
```

### 2. Initialize Hive-Mind

```bash
# Initialize coordination system
npx claude-flow@alpha hive-mind init
```

This command:
- Validates configuration files
- Initializes memory backend
- Sets up auth service
- Prepares llama.cpp coordinator (if enabled)
- Creates log directories

### 3. Spawn Your First Swarm

```bash
# Basic swarm spawn
npx claude-flow@alpha hive-mind spawn "Analyze codebase for duplicates"

# With options
npx claude-flow@alpha hive-mind spawn \
  "Build REST API with Express and PostgreSQL" \
  --claude \
  --max-workers 10 \
  --queen-type strategic \
  --auto-scale
```

### 4. Monitor Swarm Status

```bash
# Check all swarms
npx claude-flow@alpha hive-mind status

# Check specific swarm
npx claude-flow@alpha hive-mind status <swarm-id>

# View metrics
npx claude-flow@alpha hive-mind metrics
```

## Troubleshooting

### Wizard Crashes or Hangs

If the wizard crashes or hangs:

```bash
# Check Node.js version (requires ≥20.0.0)
node --version

# Check process limits
ulimit -a

# Kill hung processes
pkill -f "tsx scripts/hive-mind-wizard.ts"

# Restart wizard
npm run hive:wizard
```

### Configuration Not Detected

If swarms don't detect configuration:

```bash
# Verify files exist
ls -la .hive-mind/config.json
ls -la .hive-mind/wizard-config.json

# Check file permissions
chmod 644 .hive-mind/*.json

# Validate JSON syntax
npx jsonlint .hive-mind/config.json
npx jsonlint .hive-mind/wizard-config.json
```

### Auth Service Not Found

If auth-service.ts is missing:

```bash
# Check if file exists
ls -la .hive-mind/services/auth-service.ts

# If missing, copy from integration docs
# (File was created in integration phase)

# Rerun wizard to detect
npm run hive:wizard
```

### Neural Processing Fails

If llama.cpp neural processing fails:

```bash
# Check CUDA availability
nvidia-smi

# Verify model file exists
ls -la packages/llama.cpp/models/*.gguf

# Test model manually
cd packages/llama.cpp
python shims/http_bridge.py

# Check fallback to Claude API
# (Should work automatically if configured)
```

### Memory Backend Issues

If memory backend fails to initialize:

```bash
# For SQLite backend
ls -la .hive-mind/memory.db

# Check write permissions
touch .hive-mind/test.db && rm .hive-mind/test.db

# For Redis backend (if selected)
redis-cli ping

# Check memory logs
cat .hive-mind/logs/memory.log
```

## Architecture

### Wizard Implementation

**File:** `.hive-mind/wizard-simple.ts` (786 lines)

**Key Classes:**
- `HiveMindWizard`: Main wizard orchestrator
- Uses Node.js `readline` for interactive prompts
- Zero external dependencies (no inquirer, no chalk)
- Custom ANSI color formatting

**Methods:**
- `run()`: Main wizard flow
- `ask()`: Generic prompt helper
- `select()`: Multi-choice prompt helper
- `configure*()`: Step-specific configuration methods
- `saveConfigurations()`: Persists config files
- `displaySummary()`: Final summary output

### CLI Wrapper

**File:** `scripts/hive-mind-wizard.ts` (25 lines)

Simple wrapper that imports and executes the wizard:

```typescript
import { configureWizard } from '../.hive-mind/wizard-simple';

async function main() {
  try {
    await configureWizard(process.cwd());
  } catch (error) {
    console.error('Wizard execution failed:', error);
    process.exit(1);
  }
}

main();
```

### Integration Points

The wizard integrates with:

1. **auth-service.ts**: RBAC authentication with Octelium authv1
2. **auth-logger.ts**: Comprehensive audit logging
3. **llama-coordinator.ts**: Local neural processing
4. **swarm-lifecycle.ts**: Dynamic agent management
5. **config.json**: Main Hive-Mind configuration
6. **wizard-config.json**: Wizard state tracking

## Best Practices

### Configuration Management

1. **Version Control**
   - Commit `.hive-mind/config.json` to git
   - Commit `.hive-mind/wizard-config.json` to git
   - Use `.gitignore` for `.hive-mind/logs/*` and `.hive-mind/memory.db`

2. **Environment-Specific Configs**
   ```bash
   # Development
   cp .hive-mind/config.json .hive-mind/config.dev.json

   # Production
   cp .hive-mind/config.json .hive-mind/config.prod.json

   # Staging
   cp .hive-mind/config.json .hive-mind/config.staging.json
   ```

3. **Configuration Validation**
   ```bash
   # JSON schema validation
   npx ajv validate \
     -s .hive-mind/config.schema.json \
     -d .hive-mind/config.json
   ```

### Security Considerations

1. **Auth Service**
   - Always enable authentication in production
   - Use strong session tokens
   - Enable log rotation to prevent disk fill

2. **Neural Processing**
   - Enable CUDA only on trusted hardware
   - Use fallback to Claude API for critical tasks
   - Monitor model inference costs

3. **Memory Backend**
   - Use SQLite for development
   - Use Redis for production (better concurrency)
   - Enable encryption for sensitive data

### Performance Optimization

1. **Dynamic Scaling**
   - Set `autoScaleThreshold` to 0.7-0.9 for aggressive scaling
   - Increase `scaleUpBy` for burst workloads
   - Decrease `scaleDownBy` for stable workloads

2. **Parallel Swarms**
   - Enable for multi-task workflows
   - Set `maxConcurrent` based on available resources
   - Monitor resource usage with `hive-mind metrics`

3. **Monitoring**
   - Enable performance tracking in production
   - Set metrics interval to 30-60s for active monitoring
   - Use health checks to detect failures early

## Support

For issues or questions:

1. **Documentation**: Read HIVE_MIND_COMPRESSION_INTEGRATION.md
2. **GitHub Issues**: https://github.com/ruvnet/claude-flow/issues
3. **Source Code**: `.hive-mind/wizard-simple.ts`

## Changelog

### Version 2.0.0 (2025-10-23)

- Initial release of dependency-free wizard
- Complete 7-step configuration flow
- Auto-detection for claude-flow, auth-service, llama.cpp, CUDA
- Interactive prompts with sensible defaults
- Configuration persistence and validation
- Comprehensive summary and next steps
- Zero external dependencies (Node.js built-ins only)
