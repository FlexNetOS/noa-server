# Audit Configuration

View or modify audit system configuration.

## What This Command Does

Manages audit system settings:

- View current configuration
- Modify confidence thresholds
- Enable/disable features
- Configure neural processing
- Set audit policies

## Usage

```bash
# View current config
/audit-config

# Show specific setting
/audit-config --show minConfidence

# Enable/disable features
/audit-config --enable neural-analysis
/audit-config --disable truth-gate

# Set confidence threshold
/audit-config --set minConfidence=0.90

# Reset to defaults
/audit-config --reset
```

## Command Execution

```bash
cd /home/deflex/noa-server

# Display current configuration
if [ -f ".claude/config.json" ]; then
  echo "═══════════════════════════════════════════════════════"
  echo "          AUDIT SYSTEM CONFIGURATION"
  echo "═══════════════════════════════════════════════════════"
  echo ""

  # Parse and display audit configuration
  jq -r '.audit | to_entries[] | "\(.key | ascii_upcase):\n  \(.value)\n"' .claude/config.json

  echo "═══════════════════════════════════════════════════════"
  echo ""
  echo "📁 Config file: $(pwd)/.claude/config.json"
  echo ""
  echo "To modify configuration:"
  echo "  1. Edit .claude/config.json directly, or"
  echo "  2. Use /audit-config --set <key>=<value>"
  echo ""
else
  echo "❌ Configuration file not found: .claude/config.json"
  echo ""
  echo "Creating default configuration..."

  mkdir -p .claude
  cat > .claude/config.json <<'EOF'
{
  "audit": {
    "enabled": true,
    "mandatory": true,
    "autoTrigger": true,
    "minConfidence": 0.95,
    "enableNeuralAnalysis": true,
    "enableTruthGate": true,
    "enableTripleVerification": true,
    "outputDirectory": ".claude/audit-history",
    "hooks": {
      "postTask": true,
      "postEdit": false,
      "preCommit": false
    },
    "promptInjection": {
      "enabled": true,
      "frequency": "every-response"
    },
    "todoInterception": {
      "enabled": true,
      "interceptCompletions": true,
      "requireAudit": true
    },
    "llamaCpp": {
      "enabled": true,
      "modelPath": "/home/deflex/noa-server/packages/llama.cpp/models/",
      "cudaEnabled": false,
      "queenNeuralProcessing": true
    }
  }
}
EOF

  echo "✅ Default configuration created"
  echo "📁 Location: $(pwd)/.claude/config.json"
fi
```

## Configuration Options

### Core Settings

- **`enabled`** (boolean): Enable/disable audit system
- **`mandatory`** (boolean): Make audits mandatory for task completions
- **`autoTrigger`** (boolean): Automatically trigger audits on TodoWrite
  completions
- **`minConfidence`** (number): Minimum confidence threshold (0-1)

### Features

- **`enableNeuralAnalysis`** (boolean): Enable llama.cpp neural processing
- **`enableTruthGate`** (boolean): Enable Truth Gate validation
- **`enableTripleVerification`** (boolean): Enable Pass A/B/C verification

### Hooks

- **`hooks.postTask`** (boolean): Run audit after task completion
- **`hooks.postEdit`** (boolean): Run audit after file edits
- **`hooks.preCommit`** (boolean): Run audit before git commits

### Prompt Injection

- **`promptInjection.enabled`** (boolean): Enable audit reminders
- **`promptInjection.frequency`** (string): Injection frequency
  - `"every-response"`: Every response
  - `"every-n-responses"`: Every N responses
  - `"on-completion-only"`: Only when completing tasks
  - `"adaptive"`: Adaptive based on context

### TodoWrite Interception

- **`todoInterception.enabled`** (boolean): Intercept TodoWrite calls
- **`todoInterception.interceptCompletions`** (boolean): Intercept
  status="completed"
- **`todoInterception.requireAudit`** (boolean): Require audit before completion

### llama.cpp Integration

- **`llamaCpp.enabled`** (boolean): Enable llama.cpp
- **`llamaCpp.modelPath`** (string): Path to GGUF models
- **`llamaCpp.cudaEnabled`** (boolean): Enable CUDA acceleration
- **`llamaCpp.queenNeuralProcessing`** (boolean): Use neural processing in Queen

## Example Output

```
═══════════════════════════════════════════════════════
          AUDIT SYSTEM CONFIGURATION
═══════════════════════════════════════════════════════

ENABLED:
  true

MANDATORY:
  true

MINTRIGGER:
  true

MINCONFIDENCE:
  0.95

ENABLENEURALANALYSIS:
  true

ENABLETRUTHGATE:
  true

ENABLETRIPLEVERIFICATION:
  true

OUTPUTDIRECTORY:
  .claude/audit-history

═══════════════════════════════════════════════════════

📁 Config file: /home/deflex/noa-server/.claude/config.json

To modify configuration:
  1. Edit .claude/config.json directly, or
  2. Use /audit-config --set <key>=<value>
```

## Modifying Configuration

To change a setting, edit `.claude/config.json`:

```json
{
  "audit": {
    "minConfidence": 0.90,  // Changed from 0.95
    "enableNeuralAnalysis": false,  // Disabled
    ...
  }
}
```

Or use command:

```bash
/audit-config --set minConfidence=0.90
```
