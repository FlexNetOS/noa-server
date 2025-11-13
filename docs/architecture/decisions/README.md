# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records documenting significant
architectural decisions for the NOA Server project.

## What is an ADR?

An Architecture Decision Record (ADR) captures an important architectural
decision along with its context and consequences. ADRs help teams:

- Understand why decisions were made
- Onboard new team members
- Revisit decisions when context changes
- Maintain institutional knowledge

## ADR Format

Each ADR follows this structure:

1. **Status**: Proposed, Accepted, Deprecated, Superseded
2. **Context**: Problem statement and constraints
3. **Decision**: What was decided
4. **Consequences**: Positive and negative outcomes
5. **Alternatives**: Other options considered

## Active ADRs

### Infrastructure & Architecture

- [ADR-001: Monorepo Structure with pnpm Workspaces](./ADR-001-monorepo-structure.md)
  - **Status**: Accepted
  - **Summary**: Use pnpm workspaces monorepo for all packages
  - **Impact**: Code sharing, atomic changes, efficient CI/CD

- [ADR-002: TypeScript Strict Mode](./ADR-002-typescript-strict-mode.md)
  - **Status**: Accepted
  - **Summary**: Enable full TypeScript strict mode across all packages
  - **Impact**: Type safety, fewer runtime errors, better refactoring

### Resilience & Performance

- [ADR-003: Circuit Breaker Pattern for Provider Fallback](./ADR-003-circuit-breaker-pattern.md)
  - **Status**: Accepted
  - **Summary**: Implement circuit breaker with automatic provider fallback
  - **Impact**: Fast failure, automatic recovery, resource protection

- [ADR-004: Multi-Tier Caching Strategy](./ADR-004-caching-strategy.md)
  - **Status**: Accepted
  - **Summary**: Three-tier cache (Memory, Redis, Database)
  - **Impact**: 60-75% cost reduction, <50ms cached latency

- [ADR-005: Token Bucket Rate Limiting Algorithm](./ADR-005-rate-limiting-algorithm.md)
  - **Status**: Accepted
  - **Summary**: Token bucket algorithm with Redis backing
  - **Impact**: Burst support, smooth traffic shaping, distributed state

## Creating a New ADR

1. Copy the template:

   ```bash
   cp ADR-TEMPLATE.md ADR-XXX-short-title.md
   ```

2. Fill in the sections:
   - Use next sequential number (XXX)
   - Write clear, concise content
   - Include diagrams where helpful
   - List concrete consequences

3. Propose the ADR:
   - Create PR with ADR
   - Set status to "Proposed"
   - Request review from team

4. Accept the ADR:
   - After approval, change status to "Accepted"
   - Merge PR
   - Update this index

## ADR Lifecycle

```
Proposed → Accepted → [Deprecated/Superseded]
              ↓
         Implemented
```

- **Proposed**: Initial draft, under review
- **Accepted**: Approved by team, being implemented
- **Implemented**: Decision fully implemented
- **Deprecated**: Decision no longer recommended
- **Superseded**: Replaced by newer ADR

## Index by Category

### Code Quality

- ADR-002: TypeScript Strict Mode

### Infrastructure

- ADR-001: Monorepo Structure

### Performance

- ADR-004: Multi-Tier Caching Strategy

### Reliability

- ADR-003: Circuit Breaker Pattern
- ADR-005: Token Bucket Rate Limiting

## Related Documentation

- [Architecture Overview](../ARCHITECTURE_OVERVIEW.md)
- [Component Architecture](../COMPONENTS.md)
- [Technology Stack](../TECHNOLOGY_STACK.md)
