# Contributing to MCP Platform

Thank you for your interest in contributing to MCP Platform! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, constructive, and professional in all interactions.

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/mcp-platform.git
   cd mcp-platform
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start local environment:
   ```bash
   cd deployments/local
   docker-compose up -d
   cd ../..
   make dev
   ```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

### 2. Make Changes

- Follow existing code style
- Add tests for new features
- Update documentation as needed
- Keep commits focused and atomic

### 3. Test Your Changes

```bash
# Run linting
make lint

# Run type checking
make type-check

# Run tests
make test

# Run all checks
make ci
```

### 4. Commit

Use conventional commit messages:

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

Examples:
```
feat(gateway): add cost tracking per tenant

- Implement tenant budget enforcement
- Add cost calculation for all models
- Track spending in real-time

Closes #123
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Pull Request Guidelines

### PR Title

Use conventional commit format:
```
feat(ui): add dark mode support
```

### PR Description

Include:
- **What**: Description of changes
- **Why**: Motivation and context
- **How**: Technical implementation details
- **Testing**: How you tested the changes
- **Screenshots**: For UI changes
- **Breaking Changes**: If any

Template:
```markdown
## What
Brief description of what this PR does

## Why
Why is this change needed?

## How
Technical details of implementation

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Documentation updated

## Screenshots
(if applicable)

## Breaking Changes
(if any)
```

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Commits are well-formed
- [ ] No merge conflicts
- [ ] CI passes
- [ ] Reviewed own changes

## Code Style

### TypeScript/JavaScript

- Use TypeScript for new code
- Follow ESLint rules
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Prefer const over let
- Use async/await over promises

### React

- Use functional components
- Use hooks (useState, useEffect, custom hooks)
- Extract reusable components
- Use TypeScript for props
- Follow component structure:
  ```tsx
  import statements

  interface Props { }

  export default function Component({ }: Props) {
    // hooks
    // handlers
    // render
  }
  ```

### CSS

- Use Tailwind CSS utilities
- Follow mobile-first responsive design
- Use semantic class names
- Avoid inline styles

## Testing

### Unit Tests

```typescript
// src/gateway/router.test.ts
import { describe, it, expect } from 'vitest'
import { routeChat } from './router'

describe('routeChat', () => {
  it('should route to correct upstream', async () => {
    const result = await routeChat({
      model: 'gpt-4',
      messages: []
    })
    expect(result).toBeDefined()
  })
})
```

### Integration Tests

```typescript
// tests/integration/api/gateway.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '@/gateway'

describe('Gateway API', () => {
  it('POST /v1/chat/completions', async () => {
    const res = await request(app)
      .post('/v1/chat/completions')
      .send({ model: 'gpt-4', messages: [] })

    expect(res.status).toBe(200)
  })
})
```

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Include examples in comments
- Document complex logic
- Keep comments up to date

### User Documentation

- Update README.md for new features
- Add guides in docs/guides/
- Update API docs for endpoint changes
- Include examples and screenshots

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create git tag
4. Push tag to trigger release

## Questions?

- Open an issue for bugs
- Start a discussion for questions
- Check existing issues/discussions first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
