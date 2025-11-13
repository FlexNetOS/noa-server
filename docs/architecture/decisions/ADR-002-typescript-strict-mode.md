# ADR-002: TypeScript Strict Mode

## Status

**Accepted** - December 2024

## Context

TypeScript offers varying levels of type checking strictness. We need to decide
on the TypeScript configuration that balances type safety, developer
productivity, and code quality for the NOA Server codebase.

### Current State

- Project uses TypeScript 5.7
- Multiple packages with varying strictness levels
- Some packages have `strict: false` leading to runtime errors

### Options Considered

**Option 1: Strict Mode Enabled**

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

**Option 2: Partial Strictness**

```json
{
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": false,
  "strictPropertyInitialization": false
}
```

**Option 3: Non-Strict (Current)**

```json
{
  "strict": false
}
```

## Decision

We will use **Option 1: Full Strict Mode** across all packages.

### Rationale

1. **Runtime Safety**: Catches null/undefined errors at compile time
2. **Refactoring Confidence**: Type errors caught before deployment
3. **IDE Support**: Better autocomplete and inline documentation
4. **Code Quality**: Forces explicit type annotations
5. **Industry Standard**: Most TypeScript projects use strict mode

### Specific Flags

```typescript
{
  "compilerOptions": {
    // Core strict checks
    "strict": true,                           // Enable all strict checks
    "noUnusedLocals": true,                   // Error on unused variables
    "noUnusedParameters": true,               // Error on unused parameters
    "noImplicitReturns": true,                // Error on missing return
    "noFallthroughCasesInSwitch": true,       // Error on switch fallthrough
    "noUncheckedIndexedAccess": true,         // Index access returns T | undefined
    "noImplicitOverride": true,               // Require override keyword
    "allowUnusedLabels": false,               // Error on unused labels
    "allowUnreachableCode": false             // Error on unreachable code
  }
}
```

## Consequences

### Positive

- **Fewer Runtime Errors**: Null/undefined checks at compile time
- **Better Documentation**: Types serve as inline documentation
- **Safer Refactoring**: Compiler catches breaking changes
- **Consistent Codebase**: All packages follow same rules

### Negative

- **Initial Migration Effort**: Existing code needs type fixes
- **Verbosity**: More type annotations required
- **Learning Curve**: Developers must understand strict type system
- **Slower Initial Development**: More time spent on type definitions

### Migration Strategy

1. **Phase 1** (Week 1-2): Enable strict mode in new packages
   - All new code must pass strict checks
   - Establish patterns and utilities

2. **Phase 2** (Week 3-4): Migrate core packages
   - `@noa/shared-utils`
   - `@noa/ai-provider`
   - `@noa/monitoring`

3. **Phase 3** (Week 5-6): Migrate remaining packages
   - `@noa/ai-inference-api`
   - `@noa/message-queue`
   - `@noa/auth-service`

4. **Phase 4** (Week 7): Enforce in CI/CD
   - Add `pnpm run typecheck` to CI pipeline
   - Fail builds on type errors

### Common Patterns

**Handling Unknown Types**

```typescript
// ❌ BAD
function processData(data: any) {
  return data.value; // No type checking
}

// ✅ GOOD
function processData(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String((data as { value: unknown }).value);
  }
  throw new Error('Invalid data structure');
}
```

**Optional Chaining & Nullish Coalescing**

```typescript
// ❌ BAD
const value = user.profile.name; // Error if user.profile is undefined

// ✅ GOOD
const value = user?.profile?.name ?? 'Unknown';
```

**Type Guards**

```typescript
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' && obj !== null && 'id' in obj && 'email' in obj
  );
}

function processUser(data: unknown) {
  if (isUser(data)) {
    console.log(data.email); // Type safe!
  }
}
```

## Implementation Checklist

- [x] Update `tsconfig.base.json` with strict settings
- [x] Create type utility functions for common patterns
- [ ] Migrate `@noa/shared-utils` (Week 3)
- [ ] Migrate `@noa/ai-provider` (Week 3)
- [ ] Migrate `@noa/monitoring` (Week 4)
- [ ] Migrate `@noa/ai-inference-api` (Week 5)
- [ ] Migrate `@noa/message-queue` (Week 5)
- [ ] Migrate `@noa/auth-service` (Week 6)
- [ ] Add typecheck to CI pipeline (Week 7)
- [ ] Update developer documentation (Week 7)

## References

- [TypeScript Handbook - Strict Mode](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#strictness)
- [TypeScript Deep Dive - Strict Mode](https://basarat.gitbook.io/typescript/intro-1/strict)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)

## Success Metrics

- Zero type errors in production (Week 8)
- <5% increase in build time
- 50% reduction in null/undefined runtime errors (measured over 3 months)
- Developer satisfaction score >4/5 (survey after 3 months)
