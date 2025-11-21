# Contributing to Noa Server

Thank you for your interest in contributing to Noa Server! This guide will help
you get started.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all.
Please be respectful and constructive in all interactions.

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discriminatory language, or personal attacks
- Trolling, insulting comments, or political attacks
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

## Getting Started

### Prerequisites

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/noa-server.git
   cd noa-server
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/your-org/noa-server.git
   ```
4. **Set up development environment**: See
   [Development Setup](DEVELOPMENT_SETUP.md)

### Find an Issue

- Check
  [good first issues](https://github.com/your-org/noa-server/labels/good%20first%20issue)
- Look for
  [help wanted](https://github.com/your-org/noa-server/labels/help%20wanted)
  labels
- Comment on the issue to let others know you're working on it

## Development Workflow

### 1. Create a Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

Branch naming conventions:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Testing improvements
- `chore/` - Maintenance tasks

### 2. Make Changes

Follow our [Code Style Guide](CODE_STYLE.md):

```bash
# Make your changes
nano packages/core/src/your-file.ts

# Run tests
npm test

# Run linting
npm run lint:fix

# Check types
npm run typecheck
```

### 3. Commit Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat: add new swarm topology"
git commit -m "fix: resolve memory leak in agent coordination"
git commit -m "docs: update API documentation"
```

**Commit Message Format**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples**:

```bash
feat(swarm): add adaptive topology support

Implements dynamic topology adjustment based on workload.
Includes auto-scaling and performance optimization.

Closes #123
```

```bash
fix(agent): resolve race condition in spawn

Fixed race condition that occurred when spawning multiple
agents simultaneously.

Fixes #456
```

### 4. Push Changes

```bash
# Push to your fork
git push origin feature/your-feature-name
```

### 5. Create Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Select your branch
4. Fill out the PR template
5. Submit for review

## Pull Request Process

### PR Template

When creating a PR, include:

```markdown
## Description

Brief description of what this PR does.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues

Closes #123

## Changes Made

- Change 1
- Change 2
- Change 3

## Testing

- [ ] Tests pass locally
- [ ] Added new tests for changes
- [ ] Updated documentation

## Screenshots (if applicable)

[Add screenshots here]

## Checklist

- [ ] Code follows style guide
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests pass
```

### Review Process

1. **Automated Checks**: CI/CD runs tests and linting
2. **Code Review**: Maintainers review your code
3. **Revisions**: Make requested changes
4. **Approval**: Once approved, PR is merged

### Responding to Feedback

```bash
# Make requested changes
nano file.ts

# Commit changes
git add .
git commit -m "refactor: address review comments"

# Push updates
git push origin feature/your-feature-name
```

### Keeping PR Updated

```bash
# Sync with upstream
git fetch upstream
git rebase upstream/main

# Resolve conflicts if any
# Then push (may need force push)
git push origin feature/your-feature-name --force-with-lease
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Provide type definitions for all functions
- Avoid `any` type when possible
- Use interfaces for object shapes

**Example**:

```typescript
// Good
interface UserConfig {
  name: string;
  maxAgents: number;
  topology?: 'mesh' | 'hierarchical';
}

function createSwarm(config: UserConfig): Swarm {
  // Implementation
}

// Avoid
function createSwarm(config: any) {
  // Implementation
}
```

### Code Style

- **Indentation**: 2 spaces
- **Line Length**: Max 100 characters
- **Semicolons**: Required
- **Quotes**: Single quotes for strings
- **Trailing Commas**: Always

See [Code Style Guide](CODE_STYLE.md) for complete rules.

### Naming Conventions

- **Variables/Functions**: `camelCase`
- **Classes/Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `kebab-case.ts`

**Examples**:

```typescript
const maxAgentCount = 10; // variable
function spawnAgent() {} // function
class SwarmCoordinator {} // class
interface AgentConfig {} // interface
const API_VERSION = 'v1'; // constant
```

### File Organization

```typescript
// 1. Imports (external, then internal)
import { EventEmitter } from 'events';
import { Agent } from './agent';

// 2. Types/Interfaces
interface SwarmConfig {
  // ...
}

// 3. Constants
const DEFAULT_MAX_AGENTS = 10;

// 4. Class/Function definitions
export class Swarm {
  // ...
}

// 5. Exports (if not inline)
export { Swarm };
```

## Testing Requirements

### Test Coverage

- **Minimum**: 80% coverage for new code
- **Target**: 90% coverage
- **Critical paths**: 100% coverage

### Writing Tests

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { Swarm } from './swarm';

describe('Swarm', () => {
  let swarm: Swarm;

  beforeEach(() => {
    swarm = new Swarm({ topology: 'mesh' });
  });

  describe('initialize', () => {
    it('should initialize with correct topology', () => {
      expect(swarm.topology).toBe('mesh');
    });

    it('should spawn agents up to max limit', async () => {
      await swarm.initialize({ maxAgents: 5 });
      expect(swarm.agents.length).toBeLessThanOrEqual(5);
    });
  });

  describe('spawn', () => {
    it('should throw error if swarm is full', async () => {
      swarm.maxAgents = 1;
      await swarm.spawn({ type: 'coder' });
      await expect(swarm.spawn({ type: 'tester' })).rejects.toThrow(
        'Swarm is full'
      );
    });
  });
});
```

### Test Types

**Unit Tests**: Test individual functions/classes

```bash
npm test -- packages/core/src/swarm.test.ts
```

**Integration Tests**: Test multiple components together

```bash
npm run test:integration
```

**E2E Tests**: Test full workflows

```bash
npm run test:e2e
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npm test -- src/swarm.test.ts
```

## Documentation

### Code Documentation

**Functions**:

````typescript
/**
 * Initializes a new swarm with the specified configuration.
 *
 * @param config - Swarm configuration options
 * @param config.topology - The coordination topology to use
 * @param config.maxAgents - Maximum number of agents allowed
 * @returns Promise resolving to initialized swarm
 * @throws {SwarmError} If initialization fails
 *
 * @example
 * ```typescript
 * const swarm = await initializeSwarm({
 *   topology: 'mesh',
 *   maxAgents: 10
 * });
 * ```
 */
export async function initializeSwarm(config: SwarmConfig): Promise<Swarm> {
  // Implementation
}
````

**Classes**:

````typescript
/**
 * Coordinates multiple AI agents in a swarm topology.
 *
 * The Swarm class manages agent lifecycle, communication,
 * and coordination based on the configured topology.
 *
 * @example
 * ```typescript
 * const swarm = new Swarm({ topology: 'hierarchical' });
 * await swarm.spawn({ type: 'coder' });
 * ```
 */
export class Swarm {
  // Implementation
}
````

### User Documentation

When adding new features, update:

- **User Guide**: `docs/user/USER_GUIDE.md`
- **Features**: `docs/user/FEATURES.md`
- **API Docs**: Generate with `npm run docs`
- **Changelog**: `CHANGELOG.md`

### Documentation Style

- Use clear, concise language
- Include code examples
- Add diagrams where helpful
- Cross-reference related docs

## Community

### Getting Help

- **Discord**: [Join our server](#)
- **Discussions**:
  [GitHub Discussions](https://github.com/your-org/noa-server/discussions)
- **Issues**: [Report bugs](https://github.com/your-org/noa-server/issues)

### Reporting Bugs

Use the bug report template:

```markdown
**Describe the bug** A clear and concise description of what the bug is.

**To Reproduce** Steps to reproduce the behavior:

1. Initialize swarm with '...'
2. Spawn agent '...'
3. See error

**Expected behavior** What you expected to happen.

**Actual behavior** What actually happened.

**Environment**

- OS: [e.g., Ubuntu 22.04]
- Node.js: [e.g., 18.16.0]
- Noa Server: [e.g., 1.0.0]

**Additional context** Add any other context about the problem here.
```

### Suggesting Features

Use the feature request template:

```markdown
**Is your feature request related to a problem?** A clear description of the
problem.

**Describe the solution you'd like** A clear description of what you want to
happen.

**Describe alternatives you've considered** Alternative solutions or features
you've considered.

**Additional context** Any other context or screenshots.
```

### Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead:

- Email security@noa-server.com
- Include detailed description
- We'll respond within 48 hours

## Recognition

Contributors are recognized in:

- `CONTRIBUTORS.md`
- Release notes
- Project README

Thank you for contributing to Noa Server!

---

**Questions?** Ask in
[Discussions](https://github.com/your-org/noa-server/discussions) or Discord.
