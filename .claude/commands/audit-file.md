# Audit Specific File or Directory

Run targeted audit on a specific file or directory.

## What This Command Does

Performs deep analysis on specified path:
- **File System Scanner**: Counts files, LOC, directory structure
- **Code Analyzer**: AST parsing, complexity metrics, quality analysis
- **Hash & Index Agent**: SHA-256 hashing, integrity verification
- **Cross-Reference Agent**: Validates against git history and documentation

## Usage

```bash
# Audit a directory
/audit-file ./src

# Audit a specific file
/audit-file ./src/server.ts

# Audit with description
/audit-file ./src/auth --description "Authentication module audit"

# Audit with custom claims
/audit-file ./src/api --claims '{"endpoints":15,"middleware":5}'
```

## Command Execution

Please specify the file or directory path to audit:

```bash
cd /home/deflex/noa-server/claude-flow
node hooks/run-audit.js \
  --task-id "file-audit-{{timestamp:$(date +%s)}}" \
  --target "{{filePath}}" \
  --description "{{description:File audit via /audit-file command}}" \
  {{args}}
```

## What Gets Analyzed

### For Directories:
- Total file count (recursive)
- Lines of code (total, code, comments, blank)
- Directory structure tree
- File type distribution
- Code complexity metrics
- Test coverage indicators

### For Files:
- File metadata (size, modified date, permissions)
- Content hash (SHA-256)
- Code analysis (if source code)
- AST structure
- Complexity score
- Documentation coverage

## Output

Results include:
- **File Count**: Actual vs claimed
- **LOC Breakdown**: Code, comments, blank lines
- **Complexity**: Cyclomatic complexity, nesting depth
- **Quality Score**: Based on multiple factors
- **Hash Tree**: SHA-256 hashes for all files

## Example

```bash
/audit-file ./src/hive-mind --description "Verify Phase 5 hive-mind implementation" --claims '{"files":89,"loc":10750}'
```

Expected output:
```
✅ File System Scan: 10 files found (claimed: 89) ⚠️  DISCREPANCY
📊 Lines of Code: 856 (claimed: 10,750) ⚠️  DISCREPANCY
🔐 SHA-256 Hashes: Generated for all files
📋 Evidence: Saved to .claude/audit-history/
```
