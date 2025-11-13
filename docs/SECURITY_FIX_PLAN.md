# Security Vulnerability Fix Plan

## Issue
GitHub reports 94 vulnerabilities on the default branch of FlexNetOS/noa-server

## Analysis

Based on the repository structure, vulnerabilities are likely in:

1. **Root package.json dependencies**
2. **Workspace packages** (packages/*, servers/*, apps/*)
3. **Subprojects** (claude-squad, opcode, test-saml-idp, octelium)
4. **GitHub Actions dependencies**

## Automated Fix Strategy

### Phase 1: Update Dependencies in package.json

Update all devDependencies to latest secure versions:

```json
{
  "devDependencies": {
    "@jest/globals": "^29.7.0",
    "@playwright/test": "^1.48.2",
    "@types/node": "^22.9.0",
    "@typescript-eslint/eslint-plugin": "^8.13.0",
    "@typescript-eslint/parser": "^8.13.0",
    "@vitest/coverage-v8": "^3.2.4",
    "@vitest/ui": "^3.2.4",
    "eslint": "^9.14.0",
    "eslint-config-prettier": "^10.0.1",
    "eslint-plugin-import": "^2.31.0",
    "eslint-plugin-security": "^3.0.1",
    "typescript": "^5.7.3",
    "vitest": "^3.2.4"
  }
}
```

### Phase 2: Add Dependency Overrides

Add pnpm overrides for transitive dependencies:

```json
{
  "pnpm": {
    "overrides": {
      "@types/react": "^18.3.26",
      "@types/react-dom": "^18.3.5",
      "axios": "^1.7.7",
      "semver": "^7.6.3",
      "tough-cookie": "^5.0.0",
      "ws": "^8.18.0",
      "braces": "^3.0.3",
      "micromatch": "^4.0.8",
      "postcss": "^8.4.47",
      "path-to-regexp": "^8.2.0",
      "cookie": "^0.7.0",
      "body-parser": "^1.20.3",
      "express": "^4.21.1",
      "send": "^0.19.0",
      "serve-static": "^1.16.2"
    }
  }
}
```

### Phase 3: Fix Known Vulnerabilities

Common npm vulnerabilities to address:

1. **semver < 7.5.2** - Regular Expression Denial of Service
2. **ws < 8.17.1** - Crash vulnerability
3. **axios < 1.6.0** - SSRF vulnerability
4. **braces < 3.0.3** - Regular Expression Denial of Service
5. **path-to-regexp < 8.0.0** - Regular Expression Denial of Service
6. **postcss < 8.4.31** - Line Feed parsing flaw
7. **tough-cookie < 4.1.3** - Prototype pollution
8. **express < 4.19.2** - Open redirect vulnerability
9. **body-parser < 1.20.3** - Denial of Service
10. **cookie < 0.7.0** - Prototype pollution

### Phase 4: Update GitHub Actions

Update all GitHub Actions to use commit SHAs (already done) and latest versions.

### Phase 5: Workspace Packages

For each workspace package, run:
```bash
pnpm --filter <package-name> update --latest
```

## Manual Execution Steps

```bash
# 1. Install pnpm if not available
npm install -g pnpm@9.11.0

# 2. Update root dependencies
cd /workspaces/noa-server
pnpm update --latest

# 3. Run audit
pnpm audit

# 4. Apply automated fixes
pnpm audit fix

# 5. Update all workspace packages
pnpm -r update --latest

# 6. Re-run audit
pnpm audit

# 7. Fix remaining issues manually
# Review pnpm audit output and update specific packages

# 8. Commit changes
git add package.json pnpm-lock.yaml packages/*/package.json
git commit -m "security: fix 94 vulnerabilities - update dependencies to secure versions"

# 9. Push changes
git push origin main
```

## Verification

After fixes:
```bash
pnpm audit --audit-level moderate
pnpm audit --json > security-report.json
```

Expected: 0 high/critical vulnerabilities

## Alternative: Enable Dependabot Auto-Fix

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    groups:
      security-updates:
        patterns:
          - "*"
        update-types:
          - "patch"
          - "minor"
```

This will auto-create PRs for security updates.
