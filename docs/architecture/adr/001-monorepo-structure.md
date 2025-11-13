# ADR 001: Monorepo Structure

## Status

Accepted

## Context

Noa Server consists of multiple related packages (core, API, llama.cpp
integration, web interface, MCP servers) that need to be developed and deployed
together. We need to decide on the repository structure and package management
strategy.

### Options Considered

1. **Polyrepo**: Separate repositories for each package
2. **Monorepo**: Single repository with multiple packages
3. **Hybrid**: Core in one repo, optional packages in separate repos

### Key Requirements

- Easy cross-package development
- Shared tooling and configuration
- Consistent versioning
- Simplified CI/CD
- Clear dependencies between packages
- Support for independent package releases

## Decision

We will use a **monorepo structure** with npm/pnpm workspaces.

### Rationale

**Advantages**:

- Single source of truth for all code
- Easier refactoring across packages
- Shared tooling (linting, testing, building)
- Atomic commits across packages
- Simplified dependency management
- Better code reuse

**Structure**:

```
noa-server/
├── packages/
│   ├── core/           # Core functionality
│   ├── api/            # REST/GraphQL API
│   ├── llama.cpp/      # Neural processing
│   ├── web/            # Web interface
│   ├── cli/            # CLI tools
│   └── mcp-server/     # MCP server
├── scripts/            # Build and deployment scripts
├── config/             # Shared configuration
├── docs/               # Documentation
├── tests/              # Integration tests
├── package.json        # Root package.json
└── tsconfig.json       # Shared TypeScript config
```

**Workspace Configuration**:

```json
{
  "workspaces": ["packages/*"]
}
```

**Benefits**:

1. **Developer Experience**: Single `npm install` for all packages
2. **Code Sharing**: Easy to share code between packages
3. **Testing**: Run tests across all packages with one command
4. **Consistency**: Shared ESLint, Prettier, TypeScript configs
5. **CI/CD**: Single pipeline for all packages

## Consequences

### Positive

- **Simplified Development**: One repository to clone and setup
- **Atomic Changes**: Changes across packages in single commit
- **Shared Tooling**: Consistent linting, testing, building
- **Better Visibility**: All code in one place
- **Easier Refactoring**: Rename/move code across packages easily

### Negative

- **Larger Repository**: More code to clone and checkout
- **Build Times**: Need to build multiple packages
- **Git History**: More noise in commit history
- **Permissions**: Harder to restrict access to specific packages

### Mitigation Strategies

- **Selective Builds**: Use `turborepo` or `nx` for incremental builds
- **Clear Package Boundaries**: Well-defined interfaces between packages
- **Documentation**: Clear README in each package
- **CI Optimization**: Cache dependencies and build artifacts
- **Branch Strategies**: Use feature branches for large changes

## Implementation

### Package Structure

Each package follows consistent structure:

```
packages/example/
├── src/
├── tests/
├── dist/
├── package.json
├── tsconfig.json
├── README.md
└── .npmignore
```

### Dependency Management

- **Internal Dependencies**: Use workspace protocol

  ```json
  {
    "dependencies": {
      "@noa-server/core": "workspace:*"
    }
  }
  ```

- **External Dependencies**: Manage at root when possible
- **Dev Dependencies**: Shared at root level

### Build System

- **Root Scripts**:

  ```json
  {
    "scripts": {
      "build": "npm run build --workspaces",
      "test": "npm test --workspaces",
      "lint": "eslint packages/*/src"
    }
  }
  ```

- **Package Scripts**: Each package has own build/test scripts

### Versioning

- **Independent Versioning**: Each package has own version
- **Semantic Versioning**: Follow semver strictly
- **Changesets**: Use changesets for version management

## Alternatives Considered

### Polyrepo

**Pros**:

- Clear boundaries
- Independent versioning
- Smaller repositories

**Cons**:

- Harder to coordinate changes
- Duplicate tooling
- Complex dependency management
- More repositories to manage

**Rejected Because**: Too much overhead for coordinated development

### Hybrid Approach

**Pros**:

- Core packages together
- Optional packages separate
- Flexibility

**Cons**:

- Mixed strategy confusion
- Still need coordination
- Partial benefits only

**Rejected Because**: Added complexity without clear benefits

## References

- [Monorepo Tools](https://monorepo.tools/)
- [npm Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Google's Monorepo](https://research.google/pubs/pub45424/)
- [Facebook's Monorepo](https://engineering.fb.com/2014/01/07/core-data/scaling-mercurial-at-facebook/)

## Review

- **Last Reviewed**: 2025-10-22
- **Next Review**: 2026-04-22
- **Reviewers**: Architecture Team

---

**Related ADRs**:

- [ADR 002: TypeScript Adoption](002-typescript-adoption.md)
- [ADR 003: Microservices Architecture](003-microservices-architecture.md)
