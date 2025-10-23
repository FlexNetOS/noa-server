# Contributing Guide

<!-- POL-0167: Contribution guidelines -->

Thank you for your interest in contributing to NOA Server Platform! This guide will help you get started.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [How to Contribute](#how-to-contribute)
4. [Development Workflow](#development-workflow)
5. [Pull Request Process](#pull-request-process)
6. [Coding Standards](#coding-standards)
7. [Testing Requirements](#testing-requirements)
8. [Documentation](#documentation)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Expected Behavior

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Accept constructive criticism gracefully
- Focus on what is best for the community

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling or insulting/derogatory comments
- Public or private harassment
- Publishing others' private information

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- [ ] Read the [README](../../README.md)
- [ ] Completed [Development Setup](DEVELOPMENT.md)
- [ ] Reviewed existing [issues](https://github.com/noa-server/noa-server/issues)
- [ ] Joined our [Discord server](https://discord.gg/noa-server)

### First Time Contributors

Look for issues labeled:
- `good first issue` - Simple tasks for newcomers
- `help wanted` - Tasks that need contributors
- `documentation` - Documentation improvements

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Search existing issues to avoid duplicates
2. Verify the bug exists in the latest version
3. Collect relevant information (OS, versions, logs)

**Bug Report Template:**
```markdown
**Description**
A clear description of the bug.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g., Ubuntu 22.04]
- Node.js: [e.g., 20.5.0]
- Python: [e.g., 3.11.4]
- Version: [e.g., 1.2.3]

**Logs**
```
Paste relevant logs here
```

**Screenshots**
If applicable, add screenshots.
```

### Suggesting Enhancements

**Enhancement Template:**
```markdown
**Problem Statement**
Describe the problem this enhancement would solve.

**Proposed Solution**
Describe your proposed solution.

**Alternatives Considered**
Other approaches you've considered.

**Additional Context**
Any other context or screenshots.
```

### Contributing Code

1. **Fork the repository**
   ```bash
   # Click 'Fork' on GitHub
   git clone https://github.com/YOUR_USERNAME/noa-server.git
   cd noa-server
   git remote add upstream https://github.com/noa-server/noa-server.git
   ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make your changes**
   - Follow our [coding standards](#coding-standards)
   - Write or update tests
   - Update documentation

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test improvements
- `chore/` - Maintenance tasks

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `perf` - Performance improvement
- `test` - Adding tests
- `chore` - Maintenance

**Examples:**
```bash
feat(api): add user authentication endpoint
fix(neural): resolve memory leak in llama.cpp wrapper
docs(readme): update installation instructions
test(microservices): add integration tests for service discovery
refactor(agents): simplify coordination logic
perf(db): optimize query performance with indexes
```

### Code Quality Checks

Before committing, run:

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck

# Run tests
npm test

# Run all checks
npm run precommit
```

## Pull Request Process

### Before Submitting

- [ ] All tests pass locally
- [ ] Code is properly formatted
- [ ] No linter errors
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main

### Submitting PR

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Go to repository on GitHub
   - Click "New Pull Request"
   - Fill out the PR template

**PR Template:**
```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Testing
Describe testing performed:
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added and passing
- [ ] Dependent changes merged

## Related Issues
Closes #123
```

### Review Process

1. **Automated Checks**
   - CI/CD pipeline runs (POL-0101)
   - Tests must pass (POL-0100)
   - Code coverage maintained (POL-0100)
   - Security audit clean (POL-0198)

2. **Code Review**
   - At least one approval required
   - Address reviewer feedback
   - Re-request review after changes

3. **Merge**
   - Squash and merge (default)
   - Rebase and merge (for feature branches)
   - Create release notes if needed

## Coding Standards

### JavaScript/TypeScript

```javascript
// POL-0111: Avoid 'any' types
// ❌ Bad
function processData(data: any) {
  return data.value;
}

// ✅ Good
interface Data {
  value: string;
}

function processData(data: Data): string {
  return data.value;
}

// POL-0112-0116: Error handling
// ❌ Bad
function parseJSON(input) {
  return JSON.parse(input);
}

// ✅ Good
function parseJSON(input: string): Result<object, Error> {
  try {
    const data = JSON.parse(input);
    return { success: true, data };
  } catch (error) {
    // POL-0115: Add context to errors
    return {
      success: false,
      error: new Error(`Failed to parse JSON: ${error.message}`)
    };
  }
}
```

### Python

```python
# POL-0110: Avoid bare except blocks
# ❌ Bad
try:
    data = json.loads(input_str)
except:
    data = {}

# ✅ Good
try:
    data = json.loads(input_str)
except json.JSONDecodeError as e:
    logger.error(f"Failed to parse JSON: {e}")
    raise ValueError("Invalid JSON input") from e
```

### Rust

```rust
// POL-0109, POL-0112-0114: Proper error handling
// ❌ Bad
fn read_config() -> Config {
    let content = fs::read_to_string("config.toml").unwrap();
    toml::from_str(&content).unwrap()
}

// ✅ Good
fn read_config() -> Result<Config, ConfigError> {
    let content = fs::read_to_string("config.toml")
        .context("Failed to read config file")?;  // POL-0115

    let config = toml::from_str(&content)
        .context("Failed to parse config TOML")?;

    Ok(config)
}
```

### Code Style

- **Indentation**: 2 spaces for JS/TS, 4 for Python
- **Line length**: Maximum 100 characters
- **Naming**: camelCase for JS/TS, snake_case for Python
- **Comments**: POL-0175-0177
  - Explain complex algorithms
  - Link to issues for TODOs: `// TODO(#123): Implement caching`
  - No commented-out code (use git history)

## Testing Requirements

### Test Coverage (POL-0100)

All new code must have:
- Minimum 80% code coverage
- Unit tests for all functions
- Integration tests for APIs
- Edge case tests (POL-0117-0122)

### Example Test

```javascript
// POL-0117-0122: Edge case testing
describe('validateEmail', () => {
  it('handles empty input', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('handles null', () => {
    expect(validateEmail(null)).toBe(false);
  });

  it('handles invalid UTF-8', () => {
    expect(validateEmail('\uD800@test.com')).toBe(false);
  });

  it('validates correct email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });
});
```

## Documentation

### Required Documentation (POL-0142-0159)

1. **Code Comments**
   ```javascript
   /**
    * Creates a new user account
    *
    * @param {UserData} userData - User information
    * @returns {Promise<User>} Created user
    * @throws {ValidationError} If data is invalid
    *
    * @example
    * const user = await createUser({
    *   email: 'user@example.com',
    *   password: 'SecurePass123!'
    * });
    */
   ```

2. **API Documentation** (POL-0129)
   - Update OpenAPI/Swagger specs
   - Include examples
   - Document errors

3. **README Updates** (POL-0123-0141)
   - Update feature list if adding features
   - Add usage examples
   - Update version numbers

4. **Changelog**
   - Add entry to CHANGELOG.md
   - Follow Keep a Changelog format

## Getting Help

- **Documentation**: Check [docs/](../../docs)
- **Discord**: [Join our server](https://discord.gg/noa-server)
- **GitHub Discussions**: [Ask questions](https://github.com/noa-server/noa-server/discussions)
- **Issues**: [Browse existing issues](https://github.com/noa-server/noa-server/issues)

## Recognition

Contributors are recognized in:
- [CONTRIBUTORS.md](../../CONTRIBUTORS.md)
- Release notes
- Annual contributor reports

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to NOA Server Platform! 🚀

Questions? Reach out on [Discord](https://discord.gg/noa-server) or open a [Discussion](https://github.com/noa-server/noa-server/discussions).
