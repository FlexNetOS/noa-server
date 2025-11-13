# ADR-001: Monorepo Structure with pnpm Workspaces

## Status

**Accepted** - December 2024

## Context

The NOA Server consists of multiple related packages (AI Provider, API Layer,
Message Queue, Monitoring, etc.) that share common dependencies and need
coordinated versioning. We need to decide on a repository structure that:

1. Facilitates code sharing between packages
2. Simplifies dependency management
3. Enables efficient CI/CD workflows
4. Supports independent package deployment

### Options Considered

**Option 1: Monorepo with pnpm Workspaces**

- All packages in single repository
- Shared dependencies hoisted to root
- pnpm workspaces for efficient linking

**Option 2: Polyrepo (Multiple Repositories)**

- Each package in separate repository
- Independent versioning and releases
- Requires npm registry for sharing

**Option 3: Monorepo with Lerna**

- Monorepo with Lerna orchestration
- Support for multiple package managers
- Additional tooling complexity

## Decision

We will use **Option 1: Monorepo with pnpm Workspaces**.

### Rationale

1. **Code Sharing**: TypeScript interfaces and utilities easily shared between
   packages without publishing
2. **Dependency Management**: pnpm's hard link structure saves disk space (up to
   50% vs npm)
3. **Atomic Changes**: Related changes across multiple packages in single
   commit/PR
4. **Simplified CI/CD**: Single pipeline for testing all packages
5. **Developer Experience**: Single git clone, unified tooling configuration
6. **Performance**: pnpm is 2-3x faster than npm/yarn for install operations

### Structure

```
noa-server/
├── packages/
│   ├── ai-provider/          # AI provider abstraction
│   ├── ai-inference-api/     # REST API layer
│   ├── message-queue/        # Job queue system
│   ├── monitoring/           # Observability
│   ├── auth-service/         # Authentication
│   └── shared-utils/         # Shared utilities
├── package.json              # Root package
├── pnpm-workspace.yaml       # Workspace configuration
├── tsconfig.base.json        # Shared TypeScript config
└── .github/workflows/        # CI/CD workflows
```

## Consequences

### Positive

- **Fast installs**: pnpm's hard links reduce install time and disk usage
- **Type safety**: Shared TypeScript types across packages
- **Simplified refactoring**: Changes across packages in atomic commits
- **Consistent tooling**: Unified ESLint, Prettier, TypeScript configs
- **Easier onboarding**: Single repository to clone

### Negative

- **Build complexity**: Need to manage build order with dependencies
- **CI/CD optimization**: Must implement smart caching for changed packages
- **Large repository**: Single repo grows larger over time
- **Learning curve**: Team must learn pnpm workspaces

### Mitigation Strategies

1. **Build orchestration**: Use `pnpm -r run build` with topological ordering
2. **Selective CI**: Only test/build changed packages (GitHub Actions path
   filters)
3. **Clear package boundaries**: Strict inter-package dependency rules
4. **Documentation**: Comprehensive README for workspace commands

## Implementation

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'servers/*'
  - 'apps/*'
```

```json
// Root package.json
{
  "name": "noa-server",
  "private": true,
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "lint": "pnpm -r run lint"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

```json
// packages/ai-provider/package.json
{
  "name": "@noa/ai-provider",
  "dependencies": {
    "@noa/shared-utils": "workspace:*" // Workspace dependency
  }
}
```

## References

- [pnpm Workspaces Documentation](https://pnpm.io/workspaces)
- [Monorepo Best Practices](https://monorepo.tools/)
- [pnpm Benchmark](https://pnpm.io/benchmarks)

## Alternatives Considered

We may revisit this decision if:

- Repository size becomes unmanageable (>5GB)
- Build times exceed 10 minutes
- Team grows beyond 20 developers with conflicting workflows
