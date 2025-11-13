# Development Workflow

This guide explains our Git workflow, code review process, and how to contribute
code to NOA Server.

## Git Workflow

We use a **feature branch workflow** with the following branching strategy:

### Branch Types

**Main Branches:**

- `main` - Production-ready code
- `develop` - Integration branch for features (if applicable)

**Feature Branches:**

- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Urgent production fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation changes
- `test/description` - Test additions/improvements

### Branch Naming Convention

```bash
# Format: type/short-description-in-kebab-case
feature/add-claude-provider
bugfix/fix-rate-limit-calculation
hotfix/critical-memory-leak
refactor/simplify-cache-manager
docs/update-api-documentation
test/add-integration-tests
```

## Development Cycle

### 1. Pick a Task

```bash
# Find a task on GitHub Issues labeled "good first issue" or from sprint board
# Assign the issue to yourself
# Comment that you're working on it
```

### 2. Create Feature Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/add-new-endpoint

# Push branch to remote (optional, for backup)
git push -u origin feature/add-new-endpoint
```

### 3. Implement with Tests

**Write tests first (TDD approach):**

```bash
# 1. Write failing test
# packages/ai-inference-api/src/__tests__/new-endpoint.test.ts

# 2. Run tests (should fail)
pnpm test

# 3. Implement feature until tests pass
# packages/ai-inference-api/src/routes/new-endpoint.ts

# 4. Run tests again (should pass)
pnpm test

# 5. Refactor if needed
```

**Development checklist:**

- [ ] Write tests first
- [ ] Implement feature
- [ ] All tests pass
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Format code (`pnpm format`)
- [ ] Update documentation

### 4. Commit Changes

We use **Conventional Commits** format:

```bash
# Format: <type>(<scope>): <subject>
#
# Types: feat, fix, docs, style, refactor, test, chore
# Scope: package name or component (optional)
# Subject: short description (imperative mood)

# Examples:
git commit -m "feat(api): add new inference endpoint"
git commit -m "fix(cache): resolve Redis connection leak"
git commit -m "docs(onboarding): add setup guide"
git commit -m "test(queue): add integration tests for RabbitMQ"
git commit -m "refactor(provider): simplify fallback logic"
```

**Good commit messages:**

```
feat(api): add streaming support for chat completions
fix(rate-limit): prevent race condition in token bucket algorithm
docs(readme): update installation instructions
test(monitoring): add health check integration tests
refactor(cache): extract Redis logic to separate class
chore(deps): upgrade openai SDK to v4.28.0
```

**Bad commit messages:**

```
update files
fix bug
WIP
asdf
```

**Commit frequently:**

```bash
# Make small, logical commits
git add packages/ai-provider/src/providers/claude.ts
git commit -m "feat(provider): add Claude provider implementation"

git add packages/ai-provider/src/__tests__/claude.test.ts
git commit -m "test(provider): add Claude provider tests"
```

### 5. Keep Branch Updated

```bash
# Regularly update your branch with main
git checkout main
git pull origin main
git checkout feature/add-new-endpoint
git rebase main

# If conflicts, resolve them:
# 1. Edit conflicting files
# 2. git add <resolved-files>
# 3. git rebase --continue
```

### 6. Push Changes

```bash
# Push to remote
git push origin feature/add-new-endpoint

# If you rebased, force push (be careful!)
git push -f origin feature/add-new-endpoint
```

### 7. Submit Pull Request

**Before submitting PR:**

```bash
# Ensure all checks pass
pnpm lint           # Linting
pnpm typecheck      # Type checking
pnpm test          # All tests
pnpm build:all     # Build succeeds
```

**Create PR on GitHub:**

1. Go to repository on GitHub
2. Click "New Pull Request"
3. Select your branch
4. Fill out PR template

**PR Title Format:**

```
feat(api): Add streaming support for chat completions
fix(cache): Resolve Redis connection leak
docs(onboarding): Add comprehensive setup guide
```

**PR Description Template:**

```markdown
## Description

Brief description of what this PR does.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to
      not work as expected)
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

- [ ] Code follows project style guidelines
- [ ] Self-review of code performed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added that prove fix/feature works
- [ ] Dependent changes merged and published
```

### 8. Address Review Feedback

**When reviewers request changes:**

```bash
# Make requested changes
# Commit changes
git add .
git commit -m "refactor: address review feedback"

# Push changes
git push origin feature/add-new-endpoint

# PR automatically updates
```

**Respond to comments:**

- Reply to each comment
- Mark as resolved when addressed
- Ask for clarification if unclear

### 9. Merge PR

**After approval:**

1. Ensure all CI checks pass
2. Squash and merge (recommended) or merge commit
3. Delete feature branch

```bash
# After merge, update local main
git checkout main
git pull origin main

# Delete local feature branch
git branch -d feature/add-new-endpoint
```

## Code Review Process

### As a PR Author

**Before requesting review:**

- [ ] Self-review your code
- [ ] Test thoroughly
- [ ] Update documentation
- [ ] Ensure CI passes
- [ ] Provide context in PR description

**During review:**

- Be receptive to feedback
- Ask questions if unclear
- Make requested changes promptly
- Re-request review after changes

### As a Reviewer

See [Code Review Guidelines](CODE_REVIEW.md) for detailed review process.

**Quick checklist:**

- [ ] Code correctness
- [ ] Tests coverage
- [ ] Performance implications
- [ ] Security considerations
- [ ] Documentation updated
- [ ] Follows code style

## Common Workflows

### Working on Multiple Features

```bash
# Switch between branches
git checkout feature/feature-a
# ... work on feature A ...
git commit -am "feat: progress on feature A"

git checkout feature/feature-b
# ... work on feature B ...
git commit -am "feat: progress on feature B"

git checkout main
```

### Fixing Bugs

```bash
# Create bugfix branch from main
git checkout main
git pull origin main
git checkout -b bugfix/fix-rate-limit-issue

# Fix bug, add test
# Commit and push
git commit -am "fix(rate-limit): prevent race condition"
git push origin bugfix/fix-rate-limit-issue

# Create PR
```

### Hotfixes (Production Issues)

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-memory-leak

# Fix immediately, add test
git commit -am "hotfix: fix memory leak in cache manager"
git push origin hotfix/critical-memory-leak

# Create PR with "urgent" label
# After merge, deploy to production immediately
```

### Updating Dependencies

```bash
# Create dependency update branch
git checkout -b chore/update-dependencies

# Update dependencies
pnpm update

# Test thoroughly
pnpm test
pnpm build:all

# Commit
git commit -am "chore(deps): update all dependencies to latest"

# Create PR
```

## Best Practices

### Commit Often

```bash
# Small, logical commits are better than large monolithic ones
git commit -m "feat(api): add endpoint handler"
git commit -m "feat(api): add validation middleware"
git commit -m "test(api): add endpoint tests"
```

### Write Meaningful Commit Messages

**Good:**

```
feat(cache): implement LRU eviction strategy

Implements least-recently-used eviction when cache reaches capacity.
Includes performance optimization for O(1) access and eviction.

Closes #456
```

**Bad:**

```
update cache
```

### Keep PRs Small

- Aim for 200-400 lines of code
- One feature/fix per PR
- Easier to review and merge
- Reduces merge conflicts

### Rebase, Don't Merge

```bash
# Keep linear history
git rebase main

# Instead of
git merge main  # Creates merge commits
```

### Use Draft PRs

```bash
# For work in progress
# Create PR as "Draft" on GitHub
# Convert to "Ready for review" when complete
```

## Troubleshooting

### Merge Conflicts

```bash
# Update main
git checkout main
git pull origin main

# Rebase feature branch
git checkout feature/my-feature
git rebase main

# Conflicts appear
# Edit conflicting files
git add <resolved-files>
git rebase --continue

# Force push
git push -f origin feature/my-feature
```

### Accidental Commit to Main

```bash
# Undo last commit (keep changes)
git reset HEAD~1

# Create feature branch
git checkout -b feature/accidental-work

# Commit properly
git commit -am "feat: proper commit message"
```

### Lost Work

```bash
# Find lost commits
git reflog

# Recover commit
git checkout <commit-hash>
git checkout -b feature/recovered-work
```

## Git Tips

**Useful aliases:**

```bash
# Add to ~/.gitconfig
[alias]
  st = status
  co = checkout
  br = branch
  ci = commit
  lg = log --oneline --graph --decorate --all
  unstage = reset HEAD --
  last = log -1 HEAD
```

**Useful commands:**

```bash
# Stash changes temporarily
git stash
git checkout other-branch
# do work
git checkout original-branch
git stash pop

# View diff before committing
git diff

# View staged diff
git diff --staged

# Amend last commit (if not pushed)
git commit --amend

# Interactive rebase (clean up commits)
git rebase -i HEAD~3
```

## Next Steps

- **[Code Review Guidelines](CODE_REVIEW.md)** - Learn how to review code
- **[Testing Guide](TESTING.md)** - Write comprehensive tests
- **[Debugging Guide](DEBUGGING.md)** - Debug effectively

---

**Next**: [Code Review Guidelines →](CODE_REVIEW.md)
