# Contributing Guide

Thank you for contributing to NOA Server! This guide explains how to contribute
code, report issues, and improve documentation.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Be
respectful, inclusive, and professional in all interactions.

## How to Contribute

### Reporting Bugs

**Before reporting:**

1. Search existing issues to avoid duplicates
2. Verify the bug exists in the latest version
3. Collect relevant information (OS, Node version, logs)

**Creating a bug report:**

Use the bug report template on GitHub:

```markdown
**Bug Description** Clear description of the bug.

**Steps to Reproduce**

1. Step one
2. Step two
3. Step three

**Expected Behavior** What should happen.

**Actual Behavior** What actually happens.

**Environment**

- OS: macOS 13.0
- Node: v20.0.0
- Package version: 1.0.0

**Logs/Screenshots** Relevant logs or screenshots.

**Additional Context** Any other relevant information.
```

### Suggesting Features

**Before suggesting:**

1. Check if feature already exists
2. Search existing feature requests
3. Consider if it fits project scope

**Creating a feature request:**

```markdown
**Feature Description** Clear description of the proposed feature.

**Use Case** Why is this feature needed? Who benefits?

**Proposed Implementation** How might this be implemented?

**Alternatives Considered** What other approaches did you consider?

**Additional Context** Mockups, examples, or references.
```

### Contributing Code

#### 1. Find or Create an Issue

- Check "good first issue" label for beginner-friendly tasks
- Comment on issue to claim it
- Discuss approach before starting major work

#### 2. Fork and Clone

```bash
# Fork repository on GitHub

# Clone your fork
git clone git@github.com:your-username/noa-server.git
cd noa-server

# Add upstream remote
git remote add upstream git@github.com:noa-server/noa-server.git
```

#### 3. Create Branch

```bash
# Update main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

#### 4. Make Changes

Follow our development guidelines:

**Code Style:**

- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Write self-documenting code
- Add comments for complex logic

**Testing:**

- Write tests for all new code
- Maintain >90% coverage
- Include unit, integration, and E2E tests
- Test edge cases

**Documentation:**

- Update README if needed
- Add JSDoc comments
- Update API documentation
- Add examples

#### 5. Commit Changes

Use Conventional Commits:

```bash
git commit -m "feat(api): add streaming support"
git commit -m "fix(cache): resolve memory leak"
git commit -m "docs(readme): update setup instructions"
git commit -m "test(queue): add integration tests"
```

**Commit types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

#### 6. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create PR on GitHub
# Fill out PR template
# Link related issues
```

#### 7. Address Review Feedback

- Respond to all comments
- Make requested changes
- Push updates to same branch
- Re-request review when ready

#### 8. Merge

After approval:

- Ensure CI passes
- Squash and merge
- Delete branch

## Development Guidelines

### Code Quality Standards

**Required:**

- [ ] All tests pass
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Code formatted (`pnpm format`)
- [ ] No console.log statements (use logger)
- [ ] No commented-out code
- [ ] No TypeScript `any` types (use proper types)

**Best Practices:**

- Write pure functions when possible
- Avoid side effects
- Use dependency injection
- Follow SOLID principles
- Keep functions small and focused
- Use meaningful names

### Testing Requirements

**Coverage:**

- Minimum 90% code coverage
- 100% coverage for critical paths

**Test Types:**

```typescript
// Unit tests
describe('ModelRegistry', () => {
  it('should register model', () => {
    // Test one function/method
  });
});

// Integration tests
describe('AI Provider Integration', () => {
  it('should complete chat request', async () => {
    // Test multiple components together
  });
});

// E2E tests
describe('API E2E', () => {
  it('should process inference request end-to-end', async () => {
    // Test complete user flow
  });
});
```

### Documentation Standards

**Code Documentation:**

```typescript
/**
 * Selects the best AI model based on requirements.
 *
 * @param requirements - Model selection criteria
 * @returns Selected model or null if none available
 * @throws {Error} If requirements are invalid
 *
 * @example
 * const model = registry.selectModel({
 *   task: 'chat',
 *   minQuality: 0.9
 * });
 */
function selectModel(requirements: ModelRequirements): Model | null {
  // Implementation
}
```

**API Documentation:**

- OpenAPI/Swagger for all endpoints
- Include examples and error codes
- Document authentication requirements

**README Updates:**

- Update when adding features
- Keep installation steps current
- Add usage examples

## Pull Request Guidelines

### PR Title

Use conventional commit format:

```
feat(api): add streaming support for chat completions
fix(cache): resolve Redis connection leak
docs(onboarding): add comprehensive setup guide
```

### PR Description

Use the template:

```markdown
## Description

Brief description of changes.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue

Closes #123

## Changes Made

- Added X feature
- Fixed Y bug
- Updated Z documentation

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] All tests pass

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review performed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests prove fix/feature works
```

### PR Size

- Aim for 200-400 lines
- One feature/fix per PR
- Split large changes into multiple PRs

### Review Process

**What reviewers check:**

- Code correctness
- Test coverage
- Performance implications
- Security considerations
- Documentation
- Code style

**Response time:**

- Reviews within 24 hours
- Address feedback promptly
- Be responsive to questions

## Community Guidelines

### Communication

**Slack Channels:**

- `#general` - General discussions
- `#engineering` - Engineering topics
- `#help` - Ask for help
- `#code-review` - Code review requests

**GitHub Discussions:**

- Technical RFCs
- Architecture decisions
- Feature proposals

### Be a Good Community Member

**Do:**

- Be respectful and kind
- Help others learn
- Share knowledge
- Give constructive feedback
- Celebrate successes

**Don't:**

- Be dismissive or condescending
- Engage in flame wars
- Make personal attacks
- Spam or self-promote
- Share confidential information

## Recognition

### Contributors

All contributors are recognized in:

- GitHub contributors page
- Release notes
- Annual team report

### Maintainer Path

Active contributors may be invited to become maintainers:

**Criteria:**

- Consistent quality contributions
- Helpful to community
- Good communication
- Understanding of codebase
- Follows guidelines

**Responsibilities:**

- Review PRs
- Triage issues
- Mentor new contributors
- Maintain code quality

## Legal

### License

By contributing, you agree that your contributions will be licensed under the
project's MIT License.

### Contributor License Agreement (CLA)

First-time contributors must sign our CLA. You'll be prompted automatically when
creating your first PR.

### Code Ownership

- You retain copyright of your contributions
- You grant NOA Server perpetual license to use
- Contributions must be your original work
- Cannot include copyrighted code without permission

## Getting Help

### Resources

- **Documentation**: `/docs` directory
- **Examples**: `/examples` directory
- **Tests**: Good examples of usage

### Ask Questions

- `#help` on Slack
- GitHub Discussions
- Office hours (Tuesday & Thursday)
- Mentor (if internal team member)

### Stuck?

Don't struggle alone! Ask for help:

- Describe what you're trying to do
- What you've already tried
- Error messages or logs
- Link to your branch

## Thank You!

Your contributions make NOA Server better for everyone. We appreciate your time
and effort!

---

**Questions?** Open an issue or ask in `#help` on Slack.
