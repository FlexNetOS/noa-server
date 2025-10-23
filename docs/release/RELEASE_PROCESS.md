# Release Process Guide

Complete guide for creating and managing releases in the Noa Server project.

## Table of Contents

1. [Overview](#overview)
2. [Release Types](#release-types)
3. [Automated Release Pipeline](#automated-release-pipeline)
4. [Manual Release](#manual-release)
5. [Pre-release and Release Candidates](#pre-release-and-release-candidates)
6. [Hotfix Releases](#hotfix-releases)
7. [Rollback Procedures](#rollback-procedures)

## Overview

The Noa Server uses semantic versioning (SemVer) with automated release pipelines that handle building, testing, packaging, and deploying releases.

### Semantic Versioning

- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features, backward compatible
- **Patch** (0.0.X): Bug fixes, backward compatible
- **Prerelease** (0.0.0-alpha.X): Pre-release versions

## Release Types

### Standard Release

Triggered automatically when changes are pushed to the main branch with changesets.

```bash
# Create a changeset
pnpm changeset

# Commit and push
git add .
git commit -m "feat: add new feature"
git push origin main
```

### Manual Release

Use the release script for manual control:

```bash
# Patch release (1.0.0 -> 1.0.1)
./scripts/release/create-release.sh patch

# Minor release (1.0.0 -> 1.1.0)
./scripts/release/create-release.sh minor

# Major release (1.0.0 -> 2.0.0)
./scripts/release/create-release.sh major

# Prerelease
./scripts/release/create-release.sh prerelease alpha
```

### GitHub Actions Workflow

Trigger manually via GitHub Actions:

```yaml
# Go to Actions -> Release Pipeline -> Run workflow
# Select release type and options
```

## Automated Release Pipeline

The release pipeline performs these steps:

### 1. Version Analysis

```yaml
jobs:
  version-check:
    - Analyze changesets
    - Calculate new version
    - Generate changelog
```

### 2. Build and Test

```yaml
jobs:
  build-test:
    - Lint code
    - Type checking
    - Run tests
    - Coverage reports
```

### 3. Build Artifacts

```yaml
jobs:
  build-images:
    - Multi-platform Docker images (linux/amd64, linux/arm64)
    - NPM packages
    - Generate checksums
```

### 4. Security Scanning

```yaml
jobs:
  security-scan:
    - Trivy vulnerability scanning
    - Upload to GitHub Security
```

### 5. Create Release

```yaml
jobs:
  create-release:
    - Create GitHub release
    - Attach artifacts
    - Generate release notes
```

### 6. Publish Packages

```yaml
jobs:
  publish-npm:
    - Publish to npm registry
    - Update package versions
```

## Pre-release and Release Candidates

### Alpha Release

Early testing version:

```bash
./scripts/release/create-release.sh prerelease alpha
# Produces: 1.0.0-alpha.0
```

### Beta Release

Feature-complete testing version:

```bash
./scripts/release/create-release.sh prerelease beta
# Produces: 1.0.0-beta.0
```

### Release Candidate

Final testing before production:

```bash
./scripts/release/create-release.sh prerelease rc
# Produces: 1.0.0-rc.0
```

## Hotfix Releases

For urgent production fixes:

### 1. Create Hotfix Branch

```bash
git checkout -b hotfix/critical-bug main
```

### 2. Apply Fix

```bash
# Make changes
git add .
git commit -m "fix: critical security issue"
```

### 3. Create Hotfix Release

```bash
./scripts/release/create-release.sh patch
```

### 4. Deploy

```bash
# Push tag to trigger release
git push origin v1.0.1
git push origin hotfix/critical-bug

# Merge back to main
git checkout main
git merge hotfix/critical-bug
git push origin main
```

## Release Checklist

### Pre-release

- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Changelog reviewed
- [ ] Breaking changes documented
- [ ] Migration guide prepared (if needed)

### During Release

- [ ] Version bumped correctly
- [ ] Changelog generated
- [ ] Artifacts built successfully
- [ ] Security scans passed
- [ ] Docker images published
- [ ] NPM packages published

### Post-release

- [ ] GitHub release created
- [ ] Release notes published
- [ ] Team notified
- [ ] Deployment initiated
- [ ] Monitoring active
- [ ] Documentation published

## Build Artifacts

Each release produces:

### Docker Images

```bash
# Pull images
docker pull ghcr.io/noa-server/api-gateway:v1.0.0
docker pull ghcr.io/noa-server/auth-service:v1.0.0
docker pull ghcr.io/noa-server/user-service:v1.0.0
docker pull ghcr.io/noa-server/feature-flags:v1.0.0
```

### NPM Packages

```bash
# Install packages
npm install @noa/api-gateway@1.0.0
npm install @noa/auth-service@1.0.0
npm install @noa/feature-flags@1.0.0
```

### Build Manifest

Located in `dist/artifacts/[version]/manifest.json`:

```json
{
  "version": "1.0.0",
  "build_date": "2025-10-22T16:00:00Z",
  "git_commit": "abc123...",
  "docker_images": [...],
  "npm_packages": [...]
}
```

## Environment Variables

Required for release pipeline:

```env
# GitHub
GITHUB_TOKEN=ghp_xxx

# NPM
NPM_TOKEN=npm_xxx

# Container Registry
REGISTRY_USERNAME=username
REGISTRY_PASSWORD=password

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/xxx
```

## Troubleshooting

### Build Fails

1. Check GitHub Actions logs
2. Verify all tests pass locally
3. Check for linting errors
4. Verify dependencies are up to date

### Version Conflict

```bash
# Reset version
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

# Recreate release
./scripts/release/create-release.sh patch
```

### Failed Docker Build

```bash
# Build locally to debug
docker buildx build --platform linux/amd64 -f docker/Dockerfile.api-gateway .
```

### NPM Publish Failed

```bash
# Verify authentication
npm whoami

# Publish manually
cd packages/api-gateway
npm publish --access public
```

## Monitoring Releases

### GitHub Actions

Monitor release progress:
- https://github.com/[org]/noa-server/actions

### Slack Notifications

Automatic notifications sent to:
- #releases channel
- #deployments channel

### Release Metrics

Track:
- Build time
- Test coverage
- Package sizes
- Security vulnerabilities

## Best Practices

1. **Always use semantic versioning**
2. **Write clear changelog entries**
3. **Test before releasing**
4. **Monitor post-release metrics**
5. **Have rollback plan ready**
6. **Communicate with team**
7. **Document breaking changes**
8. **Keep dependencies updated**

## Support

- Documentation: `/docs/release/`
- Issues: GitHub Issues
- Slack: #releases channel
- Email: devops@example.com
