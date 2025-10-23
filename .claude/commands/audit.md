# Comprehensive Audit

Run a comprehensive audit on the current workspace or specified target using the Hive-Mind Audit Agent Swarm.

## What This Command Does

Executes a full audit with:
- **7 specialized audit agents** running concurrently
- **Triple-verification protocol** (Pass A, Pass B, Pass C)
- **Truth Gate validation** with evidence ledger
- **Neural processing** via llama.cpp (if enabled)
- **SHA-256 cryptographic hashing** for evidence integrity

## Usage

```bash
# Audit current directory
/audit

# Audit with specific target
/audit --target ./src

# Audit with custom claims
/audit --claims '{"filesCreated":10,"linesOfCode":500}'

# Audit with custom confidence threshold
/audit --min-confidence 0.90
```

## Command Execution

Please run the comprehensive audit CLI:

```bash
cd /home/deflex/noa-server/claude-flow
node hooks/run-audit.js --target "{{target:$(pwd)}}" --task-id "manual-{{timestamp:$(date +%s)}}" --description "Manual audit via /audit command" {{args}}
```

## Expected Output

The audit will:
1. ✅ Initialize the Audit System with Queen coordinator
2. 🔍 Spawn 7 audit agents concurrently
3. 📊 Execute triple-verification protocol
4. 🔐 Generate cryptographic evidence ledger
5. 📋 Produce comprehensive audit report

Results saved to: `.claude/audit-history/<task-id>/`

## Exit Codes

- **0** - Audit passed (confidence ≥ threshold)
- **1** - Audit failed (confidence < threshold)
- **2** - Critical discrepancies found
- **3** - Error during execution
