# TypeScript Lint Action

A custom GitHub Action for running TypeScript ESLint on monorepo packages with
advanced configuration support.

## Features

- 🔍 TypeScript-specific ESLint execution
- 📁 Configurable working directory and file patterns
- ⚙️ Custom ESLint and TypeScript configuration support
- 📊 Warning threshold controls
- 🚀 Optimized for monorepo structures

## Usage

```yaml
- name: TypeScript Lint
  uses: ./.github/actions/typescript-lint-action
  with:
    working-directory: '.'
    eslint-config: '.eslintrc.json'
    tsconfig: 'tsconfig.json'
    files: 'packages/**/*.{ts,tsx} src/**/*.{ts,tsx}'
    max-warnings: '0'
```

## Inputs

| Input               | Description                           | Required | Default                                                          |
| ------------------- | ------------------------------------- | -------- | ---------------------------------------------------------------- |
| `working-directory` | Working directory for linting         | No       | `.`                                                              |
| `eslint-config`     | Path to ESLint configuration file     | No       | `.eslintrc.json`                                                 |
| `tsconfig`          | Path to TypeScript configuration file | No       | `tsconfig.json`                                                  |
| `files`             | File patterns to lint                 | No       | `packages/**/*.{ts,tsx} src/**/*.{ts,tsx} scripts/**/*.{ts,tsx}` |
| `max-warnings`      | Maximum number of warnings allowed    | No       | `0`                                                              |

## Development

```bash
# Install dependencies
npm install

# Build the action
npm run package

# Test locally (requires GitHub Actions environment)
npm test
```

## License

MIT
