# Code Quality & Security Setup - Phase 2 Complete

## Overview

This document provides a comprehensive guide to the code quality tools and
security scanning configuration for the Noa Server monorepo.

## Setup Status: COMPLETE

All configuration files have been created and npm scripts are ready to use.

## Configuration Files Created

### 1. ESLint Configuration

**File**: `/home/deflex/noa-server/.eslintrc.json`

**Features**:

- TypeScript support with type-aware linting
- React 18+ with automatic JSX runtime detection
- React Hooks rules enforcement
- JSX Accessibility (a11y) rules for inclusive UIs
- Import ordering and validation
- Security plugin for vulnerability detection
- Prettier integration for consistent formatting

**Key Rules**:

- Zero warnings policy (`--max-warnings 0`)
- Async/await safety (no floating promises)
- Type safety warnings for `any` usage
- Security rules for common vulnerabilities
- Import organization with automatic sorting

### 2. Prettier Configuration

**File**: `/home/deflex/noa-server/.prettierrc`

**Settings**:

- 2 spaces indentation
- Single quotes for strings
- Trailing commas (ES5 compatible)
- 100 character line width
- Unix line endings (LF)
- Automatic semicolon insertion

**Special Overrides**:

- JSON files: 80 character width
- Markdown files: Always wrap prose at 80 chars
- YAML files: 2 space indentation

### 3. EditorConfig

**File**: `/home/deflex/noa-server/.editorconfig`

**Purpose**: Ensures consistent coding styles across different editors and IDEs

**Configured For**:

- JavaScript/TypeScript: 2 spaces
- Python: 4 spaces
- Go: Tabs
- Rust: 4 spaces
- C/C++: 4 spaces
- Shell scripts: 2 spaces
- YAML/JSON: 2 spaces

### 4. Security Documentation

**File**: `/home/deflex/noa-server/docs/SECURITY.md`

**Contains**:

- Vulnerability reporting procedures
- Security measures and best practices
- Dependency security scanning procedures
- Authentication and API security guidelines
- Environment variable management
- Incident response plan
- Compliance standards

### 5. Ignore Files

**Files**: `.eslintignore`, `.prettierignore`

**Purpose**: Exclude generated files, dependencies, and build artifacts from
linting/formatting

## NPM Scripts Reference

### Linting Scripts

```bash
# Run ESLint on all files (fails on warnings)
npm run lint

# Automatically fix ESLint issues
npm run lint:fix

# Generate HTML report of linting issues
npm run lint:report
```

### Formatting Scripts

```bash
# Format all supported files
npm run format

# Check if files are formatted (CI/CD use)
npm run format:check

# Format only staged files (git hooks)
npm run format:staged
```

### Security Scripts

```bash
# Run npm audit (moderate and above)
npm run security:audit

# Generate JSON audit report
npm run security:check

# Automatically fix vulnerabilities
npm run security:fix

# Force fix (may introduce breaking changes)
npm run security:fix:force

# Generate timestamped security report
npm run security:report
```

### Combined Quality Scripts

```bash
# Run all quality checks and fixes
npm run quality:all

# Run all quality checks (read-only, for CI/CD)
npm run quality:check

# Pre-commit hook (format + lint staged files)
npm run precommit

# Pre-push hook (full quality check)
npm run prepush
```

## Git Hooks Integration (Recommended)

### Option 1: Using Husky (Recommended)

```bash
# Install Husky
npm install --save-dev husky

# Initialize Husky
npx husky init

# Add pre-commit hook
echo "npm run precommit" > .husky/pre-commit

# Add pre-push hook
echo "npm run prepush" > .husky/pre-push
```

### Option 2: Using lint-staged

```bash
# Install dependencies
npm install --save-dev husky lint-staged

# Add to package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "prettier --write",
      "eslint --fix"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

## IDE Integration

### VS Code

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "eslint.workingDirectories": [{ "mode": "auto" }],
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

**Required Extensions**:

- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- EditorConfig (`editorconfig.editorconfig`)

### JetBrains IDEs (WebStorm, IntelliJ)

1. Enable ESLint: Settings → Languages & Frameworks → JavaScript → Code Quality
   Tools → ESLint
2. Enable Prettier: Settings → Languages & Frameworks → JavaScript → Prettier
3. Enable EditorConfig: Settings → Editor → Code Style → Enable EditorConfig
   support

## Current Security Status

### Vulnerabilities Detected

```
5 moderate severity vulnerabilities found:
- next: 3 vulnerabilities (cache key confusion, content injection, SSRF)
- pkg: Local privilege escalation
- validator: URL validation bypass
```

### Recommended Actions

1. **Immediate**: Review the `next` vulnerabilities - upgrade to 15.5.6+
2. **Monitor**: `pkg` has no fix available - assess risk for your use case
3. **Update**: Run `npm audit fix` for non-breaking changes
4. **Review**: Manually update `flow-nexus` to address validator issue

### Running Security Checks

```bash
# Check current vulnerabilities
npm run security:audit

# Generate detailed report
npm run security:report

# Attempt automatic fixes
npm run security:fix
```

## Workflow Integration

### Daily Development

```bash
# Before committing
npm run format
npm run lint:fix

# Run security check weekly
npm run security:audit
```

### CI/CD Pipeline

```yaml
# Example GitHub Actions workflow
- name: Quality Checks
  run: npm run quality:check

- name: Security Audit
  run: npm run security:check
```

## Monorepo Configuration

The ESLint configuration is set up to work with the monorepo structure:

```json
"parserOptions": {
  "project": [
    "./tsconfig.json",
    "./packages/*/tsconfig.json",
    "./apps/*/tsconfig.json"
  ]
}
```

This ensures:

- Type-aware linting across all packages
- Proper import resolution
- Consistent rules across the monorepo

## Next Steps (Phase 3)

1. **Install Required Dependencies**:

   ```bash
   npm install --save-dev \
     eslint \
     @typescript-eslint/parser \
     @typescript-eslint/eslint-plugin \
     eslint-plugin-react \
     eslint-plugin-react-hooks \
     eslint-plugin-jsx-a11y \
     eslint-plugin-import \
     eslint-plugin-security \
     eslint-config-prettier \
     eslint-plugin-prettier \
     prettier
   ```

2. **Setup Git Hooks**: Install and configure Husky + lint-staged

3. **IDE Configuration**: Configure your team's editors

4. **CI/CD Integration**: Add quality checks to your pipeline

5. **Team Training**: Ensure all developers understand the tools

## Troubleshooting

### ESLint Issues

```bash
# Clear ESLint cache
rm -rf node_modules/.cache/eslint

# Reinstall dependencies
npm install
```

### Prettier Conflicts

If Prettier and ESLint conflict:

1. Ensure `eslint-config-prettier` is installed
2. It's already configured as the last item in `extends`
3. Run `npm run lint:fix` after formatting

### Performance Issues

For large monorepos:

```bash
# Use ESLint cache
eslint . --cache --cache-location node_modules/.cache/eslint

# Parallel linting
npm install --save-dev eslint-parallel
```

## Additional Resources

- [ESLint Rules](https://eslint.org/docs/rules/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [React Accessibility](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [EditorConfig](https://editorconfig.org/)
- [npm Audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)

## Support

For issues or questions:

- Review the SECURITY.md file for security-related concerns
- Check existing documentation in `/home/deflex/noa-server/docs/`
- Consult the project's main README

---

**Phase 2 Completion Date**: 2025-10-22 **Configuration Version**: 1.0.0
**Target**: Zero critical vulnerabilities, consistent code style across monorepo
