# ADR 002: TypeScript Adoption

## Status
Accepted

## Context

Noa Server is a complex system with multiple packages, agent coordination, and integration with various services. We need to decide on the programming language and type system for the backend.

### Current State

- Early prototypes in JavaScript
- Growing codebase complexity
- Multiple contributors
- Need for better tooling and safety

### Requirements

- Type safety to catch errors early
- Good IDE support and autocomplete
- Maintainability for large codebase
- Easy onboarding for new developers
- Strong ecosystem and community

## Decision

We will use **TypeScript** as the primary language for all backend code.

### Configuration

**TypeScript Version**: 5.0+

**tsconfig.json** (root):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Rationale

**Type Safety**:
- Catch errors at compile time, not runtime
- Prevent undefined/null errors
- Ensure correct function arguments
- Refactoring safety

**Developer Experience**:
- Excellent IDE autocomplete
- Inline documentation with JSDoc
- Jump to definition
- Find all references

**Maintainability**:
- Self-documenting code with types
- Easier to understand complex code
- Safer refactoring
- Better for large teams

**Ecosystem**:
- Large community and ecosystem
- Type definitions for most libraries (@types/*)
- Good tooling (ESLint, Prettier, etc.)
- Active development

## Consequences

### Positive

1. **Type Safety**: Catch bugs during development
2. **Better IDE Support**: Autocomplete and intellisense
3. **Self-Documenting**: Types serve as documentation
4. **Refactoring**: Safe and confident refactoring
5. **Team Productivity**: Easier for new developers
6. **Library Support**: Most libraries have TypeScript definitions

### Negative

1. **Learning Curve**: Team needs to learn TypeScript
2. **Build Step**: Requires compilation (TypeScript → JavaScript)
3. **Configuration**: Additional config files needed
4. **Type Definitions**: Sometimes missing or incorrect for libraries
5. **Development Time**: Writing types takes time initially

### Mitigation Strategies

**Learning Curve**:
- Provide TypeScript training
- Code review for TypeScript best practices
- Share resources and examples

**Build Step**:
- Use fast build tools (esbuild, swc)
- Watch mode for development
- Incremental compilation

**Type Definitions**:
- Contribute types to DefinitelyTyped
- Create custom type definitions when needed
- Use `any` sparingly as escape hatch

## Implementation Guidelines

### Type Usage

**Prefer Interfaces Over Type Aliases** (for objects):
```typescript
// Good
interface UserConfig {
  name: string;
  maxAgents: number;
}

// Avoid (for objects)
type UserConfig = {
  name: string;
  maxAgents: number;
};
```

**Use Type Aliases for Unions/Intersections**:
```typescript
type AgentStatus = 'idle' | 'active' | 'error';
type Result<T> = Success<T> | Error;
```

**Avoid `any`**:
```typescript
// Bad
function process(data: any) { }

// Good
function process<T>(data: T) { }
// or
function process(data: unknown) { }
```

**Use Strict Null Checks**:
```typescript
// Bad
function getUser(id: string): User {
  // might return null
}

// Good
function getUser(id: string): User | null {
  // clearly returns null when not found
}
```

**Generic Constraints**:
```typescript
interface HasId {
  id: string;
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}
```

### File Organization

```typescript
// 1. Imports
import { EventEmitter } from 'events';
import { Agent } from './agent';

// 2. Type definitions
interface SwarmConfig {
  topology: 'mesh' | 'hierarchical';
  maxAgents: number;
}

// 3. Constants
const DEFAULT_MAX_AGENTS = 10;

// 4. Implementation
export class Swarm {
  constructor(private config: SwarmConfig) {}

  async spawn(agentType: string): Promise<Agent> {
    // Implementation
  }
}

// 5. Exports (if not inline)
export { SwarmConfig };
```

### Documentation

```typescript
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
export async function initializeSwarm(
  config: SwarmConfig
): Promise<Swarm> {
  // Implementation
}
```

### Testing

```typescript
import { describe, it, expect } from '@jest/globals';
import { Swarm, SwarmConfig } from './swarm';

describe('Swarm', () => {
  const config: SwarmConfig = {
    topology: 'mesh',
    maxAgents: 5
  };

  it('should initialize with correct config', () => {
    const swarm = new Swarm(config);
    expect(swarm.topology).toBe('mesh');
  });
});
```

## Migration Strategy

### Phase 1: New Code (Complete)
- All new code written in TypeScript
- Type definitions for existing JavaScript

### Phase 2: Critical Paths (In Progress)
- Migrate core functionality
- Add types to API layer
- Type swarm coordination

### Phase 3: Complete Migration (Future)
- Migrate remaining JavaScript
- Strict mode for all packages
- Remove JavaScript files

## Alternatives Considered

### JavaScript with JSDoc

**Pros**:
- No build step
- Familiar to team
- Still get some type checking

**Cons**:
- Less powerful type system
- Worse IDE support
- Not enforced

**Rejected Because**: Insufficient type safety for complex system

### Flow

**Pros**:
- Similar to TypeScript
- Facebook backing

**Cons**:
- Smaller ecosystem
- Less community adoption
- Fewer type definitions

**Rejected Because**: TypeScript has better ecosystem and adoption

### Reason/OCaml

**Pros**:
- Even stronger type system
- Functional programming

**Cons**:
- Steep learning curve
- Smaller ecosystem
- Limited Node.js support

**Rejected Because**: Too different from JavaScript ecosystem

## References

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Microsoft TypeScript Guidelines](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines)

## Review

- **Last Reviewed**: 2025-10-22
- **Next Review**: 2026-10-22
- **Reviewers**: Architecture Team, Development Team

---

**Related ADRs**:
- [ADR 001: Monorepo Structure](001-monorepo-structure.md)
- [ADR 003: Microservices Architecture](003-microservices-architecture.md)
