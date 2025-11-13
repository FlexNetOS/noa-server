---
title: CLI Commands Quick Reference
category: Reference
last_updated: 2025-10-23
---

# CLI Commands Quick Reference

> Essential command-line operations for NOA Server

## Package Management

```bash
# Install all dependencies
pnpm install

# Install specific package
pnpm add <package-name>

# Update dependencies
pnpm update

# Clean node_modules
pnpm clean

# Build all packages
pnpm build

# Build specific package
pnpm --filter @noa/<package-name> build
```

## Development

```bash
# Start development server
pnpm dev

# Start with hot reload
pnpm dev:watch

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run E2E tests
pnpm test:e2e

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format
```

## Docker

```bash
# Build Docker image
docker build -t noa-server .

# Run container
docker run -p 3000:3000 noa-server

# Docker Compose up
docker-compose up -d

# Docker Compose down
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and restart
docker-compose up -d --build
```

## Database

```bash
# Run migrations
pnpm migrate

# Rollback migration
pnpm migrate:rollback

# Seed database
pnpm db:seed

# Reset database
pnpm db:reset

# Generate Prisma client
pnpm prisma generate

# Open Prisma Studio
pnpm prisma studio
```

## Monitoring

```bash
# View system logs
pnpm logs

# View metrics
pnpm metrics

# Health check
curl http://localhost:3000/health

# Prometheus metrics
curl http://localhost:3000/metrics

# Grafana dashboard
open http://localhost:3001
```

## Deployment

```bash
# Deploy to staging
pnpm deploy:staging

# Deploy to production
pnpm deploy:production

# Rollback deployment
pnpm deploy:rollback

# Check deployment status
pnpm deploy:status
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Stage changes
git add .

# Commit with conventional commits
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/my-feature

# Create PR
gh pr create

# Merge PR
gh pr merge <pr-number>
```

## Utilities

```bash
# Generate API documentation
pnpm docs:generate

# Validate OpenAPI spec
pnpm openapi:validate

# Run security audit
pnpm audit

# Check outdated dependencies
pnpm outdated

# Clean build artifacts
pnpm clean:build
```

**[← Back to Documentation Index](../INDEX.md)**
