# Codebase Tour

Welcome to the NOA Server codebase! This guide will help you navigate the
repository structure, understand where things are located, and find what you
need quickly.

## Table of Contents

- [Repository Structure](#repository-structure)
- [Core Packages](#core-packages)
- [Key Files and Directories](#key-files-and-directories)
- [Code Organization Patterns](#code-organization-patterns)
- [Finding Your Way Around](#finding-your-way-around)

## Repository Structure

NOA Server is organized as a **pnpm monorepo** with the following top-level
structure:

```
noa-server/
├── .github/              # GitHub Actions workflows and templates
│   └── workflows/        # CI/CD pipelines
├── .claude/              # Claude Code configuration
│   ├── commands/         # Custom slash commands
│   ├── hooks/            # Pre/post operation hooks
│   └── config.json       # Claude Flow configuration
├── packages/             # All application packages (monorepo)
│   ├── ai-provider/      # AI provider system (core)
│   ├── ai-inference-api/ # REST API
│   ├── message-queue/    # Job queue system
│   ├── monitoring/       # Monitoring and health checks
│   ├── llama.cpp/        # Local AI inference
│   └── [other packages]  # Additional packages
├── docs/                 # Documentation
│   ├── onboarding/       # This guide!
│   ├── architecture/     # Architecture documentation
│   ├── api/              # API documentation
│   └── [other docs]      # Various documentation
├── scripts/              # Build and automation scripts
│   ├── automation/       # Automation workflows
│   ├── performance/      # Performance testing
│   └── monitoring/       # Monitoring scripts
├── tests/                # Integration and E2E tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── package.json          # Root package configuration
├── pnpm-workspace.yaml   # pnpm workspace configuration
├── tsconfig.json         # TypeScript configuration
├── CLAUDE.md             # Claude Code instructions
└── README.md             # Project README
```

## Core Packages

### 1. AI Provider System (`packages/ai-provider/`)

The heart of NOA Server - provides unified access to multiple AI providers.

```
packages/ai-provider/
├── src/
│   ├── index.ts              # Main export and provider factory
│   ├── managers/             # Core management systems
│   │   ├── model-registry.ts # Model catalog and selection
│   │   ├── fallback-manager.ts # Failover logic
│   │   ├── cache-manager.ts  # Multi-tier caching
│   │   └── rate-limiter.ts   # Rate limiting
│   ├── providers/            # Provider adapters
│   │   ├── openai.ts         # OpenAI integration
│   │   ├── claude.ts         # Anthropic Claude
│   │   └── llamacpp.ts       # Local llama.cpp
│   ├── types/                # TypeScript type definitions
│   │   ├── provider.ts       # Provider interfaces
│   │   ├── models.ts         # Model types
│   │   └── config.ts         # Configuration types
│   └── utils/                # Utility functions
│       ├── logger.ts         # Logging utilities
│       └── validation.ts     # Input validation
├── __tests__/                # Unit tests
│   ├── model-registry.test.ts
│   ├── fallback-manager.test.ts
│   └── cache-manager.test.ts
├── package.json              # Package configuration
└── tsconfig.json             # TypeScript config
```

**Key Files to Understand:**

- `src/index.ts` - Entry point, provider factory
- `src/managers/model-registry.ts` - How models are registered and selected
- `src/managers/fallback-manager.ts` - Failover logic when providers fail
- `src/providers/openai.ts` - Example provider implementation

### 2. AI Inference API (`packages/ai-inference-api/`)

REST API for AI inference and model management.

```
packages/ai-inference-api/
├── src/
│   ├── index.ts              # Express server setup
│   ├── routes/               # API routes
│   │   ├── inference.ts      # /api/v1/inference endpoints
│   │   ├── models.ts         # /api/v1/models endpoints
│   │   └── health.ts         # /health endpoints
│   ├── middleware/           # Express middleware
│   │   ├── auth.ts           # Authentication
│   │   ├── validation.ts     # Request validation
│   │   ├── rate-limit.ts     # Rate limiting
│   │   └── error-handler.ts  # Error handling
│   ├── config/               # Configuration
│   │   └── swagger.ts        # OpenAPI spec
│   └── utils/                # Utilities
│       └── response.ts       # Response formatting
├── __tests__/                # API tests
│   ├── inference.test.ts
│   └── models.test.ts
└── package.json
```

**Key Files to Understand:**

- `src/index.ts` - Express app setup and middleware chain
- `src/routes/inference.ts` - Main inference endpoints
- `src/middleware/auth.ts` - How authentication works
- `src/config/swagger.ts` - API documentation

### 3. Message Queue (`packages/message-queue/`)

Asynchronous job processing and event-driven communication.

```
packages/message-queue/
├── src/
│   ├── queue-manager.ts      # Queue abstraction layer
│   ├── adapters/             # Queue backend adapters
│   │   ├── rabbitmq.ts       # RabbitMQ implementation
│   │   ├── kafka.ts          # Kafka implementation
│   │   ├── redis.ts          # Redis queue
│   │   └── sqs.ts            # AWS SQS
│   ├── jobs/                 # Job definitions
│   │   ├── ai-inference.ts   # AI inference jobs
│   │   ├── webhook.ts        # Webhook delivery
│   │   └── notification.ts   # Notification jobs
│   ├── server.ts             # Worker server
│   └── types/                # Type definitions
├── __tests__/
└── package.json
```

**Key Files to Understand:**

- `src/queue-manager.ts` - Queue abstraction and interface
- `src/adapters/rabbitmq.ts` - Example adapter implementation
- `src/jobs/ai-inference.ts` - How jobs are defined and processed

### 4. Monitoring (`packages/monitoring/`)

Health checks, metrics, and error tracking.

```
packages/monitoring/
├── src/
│   ├── health-check.ts       # Health check endpoints
│   ├── error-tracking.ts     # Sentry integration
│   ├── metrics-collector.ts  # Metrics aggregation
│   ├── dashboard/            # Dashboard UI
│   │   ├── components/       # React components
│   │   └── server.ts         # Dashboard server
│   └── types/
├── __tests__/
└── package.json
```

**Key Files to Understand:**

- `src/health-check.ts` - Kubernetes-compatible health checks
- `src/error-tracking.ts` - Error tracking setup
- `src/metrics-collector.ts` - How metrics are collected

### 5. llama.cpp Integration (`packages/llama.cpp/`)

Local AI model inference with CUDA acceleration.

```
packages/llama.cpp/
├── shims/
│   └── http_bridge.py        # Python HTTP bridge
├── models/                   # GGUF model files
├── examples/                 # Example code
├── tests/                    # Integration tests
└── README.md
```

**Key Files to Understand:**

- `shims/http_bridge.py` - HTTP server for llama.cpp
- Integration with AI Provider System

## Key Files and Directories

### Root-Level Files

#### `package.json`

Root package configuration for the monorepo.

**Important Scripts:**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run --coverage tests/unit",
    "test:integration": "vitest run --coverage tests/integration",
    "lint": "eslint packages scripts src tests --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint ... --fix",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md,yml,yaml}\"",
    "typecheck": "tsc --noEmit --project tsconfig.json",
    "build:all": "pnpm -r run build"
  }
}
```

#### `tsconfig.json`

TypeScript configuration for type checking across the entire monorepo.

**Key Settings:**

- Strict mode enabled
- Path aliases for imports
- Project references for monorepo packages

#### `CLAUDE.md`

Claude Code configuration and development workflow instructions.

**What's Inside:**

- SPARC methodology guidelines
- MCP tool usage
- Agent coordination protocols
- Code style and best practices

#### `.github/workflows/`

CI/CD pipeline definitions.

**Key Workflows:**

- `ci.yml` - Main CI pipeline (lint, test, build)
- `deploy.yml` - Deployment to staging/production
- `monitoring-ci.yml` - Monitoring checks

### Configuration Files

#### Environment Variables

```
.env                          # Root environment variables
packages/ai-provider/.env     # AI provider API keys
packages/ai-inference-api/.env # API configuration
packages/message-queue/.env   # Queue configuration
```

**Never commit `.env` files to version control!**

#### TypeScript Configuration

```
tsconfig.json                 # Root TypeScript config
tsconfig.base.json            # Base config extended by packages
packages/*/tsconfig.json      # Package-specific configs
```

## Code Organization Patterns

### Package Structure Pattern

All packages follow a consistent structure:

```
package-name/
├── src/                    # Source code
│   ├── index.ts            # Main export
│   ├── types/              # TypeScript types
│   ├── utils/              # Utility functions
│   └── __tests__/          # Unit tests
├── dist/                   # Compiled output (gitignored)
├── package.json            # Package configuration
├── tsconfig.json           # TypeScript config
└── README.md               # Package documentation
```

### Naming Conventions

**Files:**

- `kebab-case.ts` for file names
- `PascalCase.tsx` for React components
- `*.test.ts` for test files
- `*.spec.ts` for specification files

**Code:**

```typescript
// Classes: PascalCase
class ModelRegistry {}

// Interfaces: PascalCase with 'I' prefix (optional)
interface IProvider {}
interface Provider {} // Also acceptable

// Functions: camelCase
function selectModel() {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Variables: camelCase
const modelRegistry = new ModelRegistry();
```

### Import Organization

```typescript
// 1. Node.js built-in modules
import { readFile } from 'fs/promises';

// 2. External dependencies
import express from 'express';
import { z } from 'zod';

// 3. Internal workspace packages
import { AIProvider } from '@noa/ai-provider';

// 4. Relative imports
import { logger } from './utils/logger';
import type { Config } from './types';
```

### Type Definitions

Types are organized in `types/` directories:

```typescript
// types/provider.ts
export interface Provider {
  name: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  healthCheck(): Promise<HealthStatus>;
}

// types/models.ts
export interface Model {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
}
```

## Finding Your Way Around

### How to Find Code

#### 1. Using VS Code Search

**Find all occurrences of a function:**

```
Cmd+Shift+F (macOS) or Ctrl+Shift+F (Windows/Linux)
Search for: "function selectModel"
```

**Find files by name:**

```
Cmd+P (macOS) or Ctrl+P (Windows/Linux)
Type: "model-registry.ts"
```

**Find symbols (functions, classes):**

```
Cmd+T (macOS) or Ctrl+T (Windows/Linux)
Type: "ModelRegistry"
```

#### 2. Using grep

```bash
# Find all files containing "ModelRegistry"
grep -r "ModelRegistry" packages/

# Find all TypeScript files with "export class"
grep -r "export class" packages/ --include="*.ts"

# Find all test files
find packages/ -name "*.test.ts"
```

#### 3. Using Code Navigation

In VS Code:

- **Go to Definition**: `Cmd+Click` or `F12`
- **Find References**: `Shift+F12`
- **Go to Type Definition**: `Cmd+Shift+Click`

### Common Code Locations

**Where to find...**

**API Routes:** `packages/ai-inference-api/src/routes/`

**Provider Implementations:** `packages/ai-provider/src/providers/`

**Type Definitions:** `packages/*/src/types/`

**Tests:** `packages/*/src/__tests__/` (unit tests) `tests/integration/`
(integration tests) `tests/e2e/` (end-to-end tests)

**Configuration:** `packages/*/src/config/` `.env` files

**Utilities:** `packages/*/src/utils/`

**Documentation:** `docs/` (general documentation) `packages/*/README.md`
(package-specific docs)

### Package Dependencies

Understanding package dependencies:

```bash
# View dependency tree
pnpm list --depth=1

# Check which packages depend on @noa/ai-provider
pnpm why @noa/ai-provider

# View outdated dependencies
pnpm outdated
```

### Code Examples

**Example 1: Adding a new AI provider**

Location: `packages/ai-provider/src/providers/`

1. Create new file: `new-provider.ts`
2. Implement `Provider` interface
3. Register in `model-registry.ts`
4. Add tests in `__tests__/new-provider.test.ts`
5. Export from `index.ts`

**Example 2: Adding a new API endpoint**

Location: `packages/ai-inference-api/src/routes/`

1. Create route handler in appropriate file
2. Add OpenAPI documentation
3. Add validation middleware
4. Add tests in `__tests__/`
5. Register route in `index.ts`

**Example 3: Adding a new job type**

Location: `packages/message-queue/src/jobs/`

1. Create job definition file
2. Implement job processor
3. Add retry logic
4. Add tests
5. Register in `queue-manager.ts`

## Code Reading Tips

### Start with Tests

Tests are excellent documentation. Start reading here:

```typescript
// __tests__/model-registry.test.ts
describe('ModelRegistry', () => {
  it('should register a model', () => {
    const registry = new ModelRegistry();
    registry.registerModel({ id: 'gpt-4', ... });
    expect(registry.getModel('gpt-4')).toBeDefined();
  });
});
```

### Follow the Request Flow

For API code, trace a request from entry to exit:

1. `index.ts` - Server setup
2. Middleware chain (auth, validation, etc.)
3. Route handler
4. Business logic
5. Response formatting

### Use Type Definitions

TypeScript types are self-documenting:

```typescript
// Reading this interface tells you exactly what a Provider needs
interface Provider {
  chat(request: ChatRequest): Promise<ChatResponse>;
  embeddings(request: EmbeddingsRequest): Promise<EmbeddingsResponse>;
  healthCheck(): Promise<HealthStatus>;
}
```

### Read README Files

Every package has a README with:

- Purpose and overview
- Installation instructions
- Usage examples
- API documentation

## Quick Reference Commands

```bash
# Navigate to package
cd packages/ai-provider

# Install dependencies
pnpm install

# Run tests for specific package
pnpm test

# Build specific package
pnpm build

# Run specific package in dev mode
pnpm dev

# From root: run command in specific package
pnpm --filter @noa/ai-provider test

# Search codebase
grep -r "search term" packages/

# Find files
find packages/ -name "*.ts" -type f
```

## Next Steps

Now that you know your way around:

1. **[Development Workflow](WORKFLOW.md)** - Learn our Git workflow
2. **[Testing Guide](TESTING.md)** - Write effective tests
3. **[API Development Guide](API_DEVELOPMENT.md)** - Build your first endpoint

## Further Exploration

- Clone the repo and explore with your IDE
- Read through test files to understand functionality
- Review recent PRs to see how others contribute
- Experiment in a feature branch

---

**Next**: [Development Workflow →](WORKFLOW.md)
