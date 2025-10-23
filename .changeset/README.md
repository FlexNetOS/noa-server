# Changesets

This folder contains changeset files that describe changes to be included in the next release.

## Creating a Changeset

When you make changes, create a changeset:

```bash
pnpm changeset
```

Follow the prompts to:
1. Select packages that have changed
2. Choose version bump type (major, minor, patch)
3. Write a summary of changes

## Example Changeset

```markdown
---
"@noa/api-gateway": minor
"@noa/auth-service": patch
---

Add new authentication endpoint and fix token validation bug
```

## Release Process

Changesets are automatically processed by CI/CD:

1. Changes merged to main
2. CI analyzes changesets
3. Versions bumped automatically
4. Release created
5. Packages published

## Manual Release

```bash
# Version packages
pnpm changeset version

# Build and publish
pnpm build
pnpm changeset publish
```
