# Auto-Commit Workflow Documentation

## Overview

The Auto-Commit Workflow provides intelligent, automated git commits integrated
with Claude Code agent workflows. It uses llama.cpp neural processing to
generate meaningful commit messages following the Conventional Commits
specification.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Workflows                           │
│  (coder, tester, reviewer, build, etc.)                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Claude Flow Hooks                               │
│  post-task, post-build, post-test                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│           Auto-Commit Hook Scripts                           │
│  • post-agent-task.sh                                       │
│  • post-build.sh                                            │
│  • post-test.sh                                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│         Commit Message Generator (TypeScript)                │
│  • Neural generation (llama.cpp)                            │
│  • Template fallback                                        │
│  • Conventional Commits format                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Git Commit                                │
│  Staged changes → Commit → Optional Push                    │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Hook Scripts

Located in `scripts/automation/auto-commit-hooks/`:

#### post-agent-task.sh

Triggered after agent task completion.

**Features:**

- Analyzes git diff statistics
- Detects breaking changes
- Determines commit type from changed files
- Generates AI-powered commit messages
- Creates commits with proper attribution

**Usage:**

```bash
# Automatic (via claude-flow hooks)
npx claude-flow@alpha hooks post-task --task-id "task-123"

# Manual
./scripts/automation/auto-commit-hooks/post-agent-task.sh "task-123" "Implement feature X" "coder"
```

#### post-build.sh

Triggered after successful builds.

**Features:**

- Commits build artifacts
- Handles dependency updates
- Supports multiple build environments

**Usage:**

```bash
# After build
./scripts/automation/auto-commit-hooks/post-build.sh 0 "production"
```

#### post-test.sh

Triggered after test runs.

**Features:**

- Commits new test files
- Updates test coverage data
- Only commits on passing tests

**Usage:**

```bash
# After tests
./scripts/automation/auto-commit-hooks/post-test.sh 0 "unit" 80
```

### 2. Commit Message Generator

Located at `src/automation/commit-message-generator.ts`:

**Features:**

- AI-powered message generation using llama.cpp
- Template-based fallback
- Conventional Commits compliance
- Context-aware analysis

**Input Format:**

```json
{
  "taskId": "task-123",
  "taskDescription": "Add user authentication",
  "agentType": "coder",
  "commitType": "feat",
  "commitScope": "auth",
  "filesChanged": 5,
  "insertions": 120,
  "deletions": 15,
  "breakingChange": false,
  "changedFiles": ["src/auth.ts", "tests/auth.test.ts"],
  "diffStat": "5 files changed, 120 insertions(+), 15 deletions(-)"
}
```

**Output Format:**

```
feat(auth): add user authentication

Agent: coder
Task ID: task-123

Changes:
- Files changed: 5
- Insertions: +120
- Deletions: -15

Modified files:
- src/auth.ts
- tests/auth.test.ts

Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Coder <coder@claude-code.anthropic.com>
```

### 3. Configuration

Located at `config/automation/commit-policy.yaml`:

**Key Settings:**

```yaml
# Enable/disable features
enabled: true
use_neural: true

# Trigger configuration
triggers:
  post_agent_task:
    enabled: true
    min_changes: 1

# Message generation
commit_message:
  use_neural: true
  neural:
    max_tokens: 150
    temperature: 0.7

# File filtering
file_filters:
  exclude:
    - '*.log'
    - '.env'
    - 'credentials.*'
```

## Integration with Agent Workflows

### Claude Flow Integration

The auto-commit system integrates seamlessly with Claude Flow hooks:

```bash
# 1. Agent starts task
npx claude-flow@alpha hooks pre-task --description "Build feature"

# 2. Agent performs work
# ... coding, testing, building ...

# 3. Agent completes task
npx claude-flow@alpha hooks post-task --task-id "task-123"

# 4. Auto-commit hook triggers
./scripts/automation/auto-commit-hooks/post-agent-task.sh "task-123"

# 5. Commit created automatically
```

### Agent Execution Pattern

```javascript
// Single message with parallel agent execution
[Parallel Execution]:
  // Spawn agents via Claude Code Task tool
  Task("Backend Developer", "Build API. Use hooks for coordination.", "backend-dev")
  Task("Test Engineer", "Write tests. Coordinate via memory.", "tester")

  // Each agent runs hooks internally
  Bash "npx claude-flow@alpha hooks pre-task --description 'Build API'"
  // ... do work ...
  Bash "npx claude-flow@alpha hooks post-task --task-id 'task-xyz'"

  // Auto-commit triggers for each agent's changes
```

## Conventional Commits

The system follows the
[Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/updates
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Other changes
- `revert`: Revert previous commit

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Examples

**Feature:**

```
feat(auth): add JWT token authentication

Implemented JWT-based authentication for API endpoints.

Changes:
- Files changed: 3
- Insertions: +85
- Deletions: -12

Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Coder <coder@claude-code.anthropic.com>
```

**Bug Fix:**

```
fix(database): resolve connection timeout issue

Fixed race condition in database connection pool.

Changes:
- Files changed: 2
- Insertions: +15
- Deletions: -8

Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Reviewer <reviewer@claude-code.anthropic.com>
```

**Breaking Change:**

```
feat(api): redesign REST endpoint structure

Restructured API endpoints for better consistency.

BREAKING CHANGE: API endpoints moved from /v1/ to /api/v2/

Changes:
- Files changed: 12
- Insertions: +234
- Deletions: -189

Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Coder <coder@claude-code.anthropic.com>
```

## Neural Commit Message Generation

### How It Works

1. **Context Analysis**: Hook script analyzes git diff and changed files
2. **Prompt Construction**: Builds context-aware prompt for llama.cpp
3. **Neural Processing**: Sends prompt to llama.cpp via HTTP bridge
4. **Message Generation**: AI generates conventional commit message
5. **Validation**: Validates format and length constraints
6. **Fallback**: Uses template if neural generation fails

### Prompt Template

```
You are a professional software developer writing a git commit message.

Task: {taskDescription}
Agent: {agentType}
Type: {commitType}({commitScope})

Changes:
- Files changed: {filesChanged}
- Lines added: +{insertions}
- Lines deleted: -{deletions}
- Changed files: {fileList}

Write a concise, professional commit message following Conventional Commits.
```

### Configuration

```yaml
commit_message:
  use_neural: true
  neural:
    model_path: '' # Auto-detect
    max_tokens: 150
    temperature: 0.7
    context_size: 2048
    timeout_ms: 30000
```

## Safety Features

### 1. Protected Branches

Prevents accidental commits to main/master:

```yaml
safety:
  protected_branches:
    enabled: true
    branches:
      - main
      - master
      - production
    action: 'warn' # or "block"
```

### 2. File Filtering

Excludes sensitive files:

```yaml
file_filters:
  exclude:
    - '.env'
    - '*.key'
    - '*.pem'
    - 'credentials.*'
    - 'secrets.*'
```

### 3. Breaking Change Detection

Automatically detects breaking changes:

```yaml
breaking_changes:
  enabled: true
  patterns:
    - 'BREAKING CHANGE'
    - 'removed.*function'
    - 'incompatible'
```

### 4. Large Change Confirmation

Prompts for large changesets:

```yaml
safety:
  confirm_large_changes:
    enabled: true
    threshold_files: 50
    threshold_lines: 1000
```

## Usage Examples

### Example 1: Feature Development

```bash
# Agent develops feature
Task("Coder", "Add user profile page", "coder")

# Auto-commit triggers
# Result:
# feat(profile): add user profile page
#
# Agent: coder
# Task ID: task-456
#
# Changes:
# - Files changed: 4
# - Insertions: +156
# - Deletions: -23
```

### Example 2: Test Addition

```bash
# Agent writes tests
Task("Tester", "Add API endpoint tests", "tester")

# Auto-commit triggers
# Result:
# test(api): add API endpoint tests
#
# Test suite: all
# All tests passing
#
# Changes:
# - New test files: 2
# - Modified test files: 1
```

### Example 3: Build Updates

```bash
# Build completes
npm run build

# Post-build hook triggers
./scripts/automation/auto-commit-hooks/post-build.sh 0 "production"

# Result:
# build(production): update production build artifacts
#
# Build completed successfully for production environment.
```

## Troubleshooting

### Issue: Neural generation fails

**Solution:**

```bash
# Check llama.cpp setup
python3 ~/noa-server/packages/llama.cpp/shims/http_bridge.py info

# Verify model path
echo $LLM_MODEL_PATH

# Disable neural and use templates
export USE_NEURAL_COMMITS=false
```

### Issue: No commits created

**Solution:**

```bash
# Check if changes exist
git status

# Check policy configuration
cat config/automation/commit-policy.yaml | grep enabled

# Run hook manually with debug
bash -x scripts/automation/auto-commit-hooks/post-agent-task.sh
```

### Issue: Wrong commit type detected

**Solution:**

```yaml
# Customize scope detection in config
conventional_commits:
  auto_scope: true
  scopes:
    src/api: 'api'
    src/auth: 'auth'
    src/db: 'database'
```

## Best Practices

1. **Review Generated Messages**: Always review AI-generated messages before
   pushing
2. **Configure File Filters**: Exclude sensitive and generated files
3. **Use Scopes Consistently**: Define clear scopes for your project
4. **Enable Notifications**: Get notified of auto-commits via hooks
5. **Test First**: Run with `dry_run: true` to preview commits
6. **Backup Important Work**: Enable backup feature for critical changes
7. **Monitor Performance**: Track neural generation times and success rates

## Performance Metrics

Expected performance:

- Neural generation: 2-5 seconds
- Template fallback: <100ms
- Total commit time: 3-10 seconds

## Future Enhancements

- [ ] Multi-language support for commit messages
- [ ] Smart commit splitting for large changes
- [ ] Integration with PR templates
- [ ] Automatic changelog generation
- [ ] Semantic versioning automation
- [ ] Commit message quality scoring
- [ ] Learning from manual edits

## Support

- Documentation: [CLAUDE.md](/CLAUDE.md)
- Issues: GitHub Issues
- Claude Flow: https://github.com/ruvnet/claude-flow

---

**Generated with Claude Code** Version: 1.0.0 Last Updated: 2025-10-22
