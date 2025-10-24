# Development Guide

<!-- POL-0165: Developer onboarding -->

Welcome to the NOA Server Platform development guide! This document will help
you get started with development, understand the codebase structure, and
contribute effectively.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Codebase Structure](#codebase-structure)
3. [Development Workflow](#development-workflow)
4. [Debugging](#debugging)
5. [Performance Profiling](#performance-profiling)
6. [Best Practices](#best-practices)

## Development Environment Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js**: v18+ (v20 recommended)
- **Python**: 3.9-3.12
- **Rust**: 1.70+
- **Docker**: Latest stable version
- **Git**: 2.30+
- **VS Code** or preferred IDE

### Initial Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/noa-server/noa-server.git
   cd noa-server
   ```

2. **Run development setup script**

   ```bash
   chmod +x setup-development-mode.sh
   ./setup-development-mode.sh
   ```

3. **Install development tools**

   ```bash
   # Node.js development tools
   npm install -g typescript ts-node nodemon eslint prettier

   # Python development tools
   pip install pytest black flake8 mypy

   # Rust development tools
   cargo install cargo-watch cargo-edit cargo-audit
   ```

4. **Configure IDE**

   **VS Code Extensions:**
   - ESLint
   - Prettier
   - Python
   - Rust Analyzer
   - Docker
   - GitLens

   **VS Code Settings** (`.vscode/settings.json`):

   ```json
   {
     "editor.formatOnSave": true,
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": true
     },
     "typescript.tsdk": "node_modules/typescript/lib",
     "python.linting.enabled": true,
     "python.linting.flake8Enabled": true,
     "rust-analyzer.checkOnSave.command": "clippy"
   }
   ```

## Codebase Structure

```
noa-server/
├── packages/                    # Shared packages
│   ├── rate-limiter/           # Rate limiting service
│   ├── data-retention/         # Data retention policies
│   ├── ui-dashboard/           # Web UI dashboard
│   ├── llama.cpp/              # Neural processing
│   └── microservices/          # Microservice utilities
│       ├── api-gateway/        # API gateway
│       ├── service-registry/   # Service discovery
│       └── communication/      # Inter-service messaging
│
├── agentic-homelab/            # Agent orchestration
│   ├── coordinator-plane/      # Agent coordination
│   │   └── agents/
│   │       ├── queens/         # Queen agents (coordinators)
│   │       └── swarms/         # Swarm implementations
│   ├── data-plane/             # Data persistence
│   ├── deployed-plane/         # Production deployments
│   ├── execution-plane/        # Task execution
│   └── shared/                 # Shared utilities
│
├── claude-flow/                # Claude integration
│   └── src/
│       ├── audit/              # Audit systems
│       ├── agents/             # Agent definitions
│       └── coordination/       # Coordination logic
│
├── docs/                       # Documentation
│   ├── api/                    # API documentation
│   ├── guides/                 # How-to guides
│   └── architecture/           # Architecture docs
│
├── tests/                      # Test suites
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── e2e/                    # End-to-end tests
│
├── config/                     # Configuration files
├── scripts/                    # Utility scripts
└── data/                       # Data storage (gitignored)
```

### Key Directories

- **packages/**: Reusable npm packages that can be published independently
- **agentic-homelab/**: Multi-plane architecture for agent coordination
- **claude-flow/**: Claude AI integration and agent orchestration
- **docs/**: All documentation (keep it updated!)
- **tests/**: Comprehensive test coverage

## Development Workflow

### Daily Development

1. **Update your branch**

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Start development servers**

   ```bash
   # Terminal 1: Main services
   npm run dev

   # Terminal 2: Watch mode for specific package
   cd packages/microservices
   npm run dev

   # Terminal 3: Run tests in watch mode
   npm run test:watch
   ```

3. **Make changes**
   - Write code following our [style guide](#code-style)
   - Add tests for new functionality
   - Update documentation as needed

4. **Run quality checks**

   ```bash
   # Lint code
   npm run lint

   # Format code
   npm run format

   # Type check
   npm run typecheck

   # Run tests
   npm test
   ```

5. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```bash
feat(api-gateway): add rate limiting middleware
fix(neural): resolve CUDA memory leak
docs(readme): update installation instructions
test(microservices): add integration tests for service discovery
```

## Debugging

### Node.js Debugging

**VS Code Launch Configuration** (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/packages/microservices/api-gateway/src/server.js",
      "skipFiles": ["<node_internals>/**"],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "*"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal"
    }
  ]
}
```

**Command Line Debugging:**

```bash
# Start with inspector
node --inspect-brk packages/microservices/api-gateway/src/server.js

# Chrome DevTools
# Navigate to chrome://inspect
```

### Python Debugging

**PyCharm/VS Code:**

```python
# Add breakpoint
import pdb; pdb.set_trace()

# Or use debugpy
import debugpy
debugpy.listen(5678)
debugpy.wait_for_client()
```

### Rust Debugging

```bash
# Build with debug symbols
cargo build

# Use rust-gdb or rust-lldb
rust-gdb target/debug/your_binary
```

### Logging

Use structured logging:

```javascript
// Node.js
const logger = require('./utils/logger');

logger.info('Processing request', { userId, requestId });
logger.error('Failed to process', { error: err.message });
```

```python
# Python
import logging

logger = logging.getLogger(__name__)
logger.info('Processing request', extra={'user_id': user_id})
```

## Performance Profiling

### Node.js Profiling

```bash
# CPU profiling
node --prof packages/microservices/api-gateway/src/server.js
node --prof-process isolate-*.log > processed.txt

# Memory profiling
node --inspect packages/microservices/api-gateway/src/server.js
# Use Chrome DevTools Memory profiler

# Flamegraphs
npm install -g 0x
0x packages/microservices/api-gateway/src/server.js
```

### Python Profiling

```bash
# cProfile
python -m cProfile -o output.prof your_script.py

# View with snakeviz
pip install snakeviz
snakeviz output.prof

# Memory profiling
pip install memory_profiler
python -m memory_profiler your_script.py
```

### Benchmarking

```bash
# Run benchmarks
npm run bench

# Compare with baseline
npm run bench:compare
```

## Best Practices

### Code Quality

1. **POL-0109-0116: Error Handling**

   ```javascript
   // ❌ Bad
   const data = JSON.parse(input);

   // ✅ Good
   try {
     const data = JSON.parse(input);
     return { success: true, data };
   } catch (error) {
     logger.error('Failed to parse JSON', { error, input });
     return { success: false, error: 'Invalid JSON input' };
   }
   ```

2. **Use TypeScript**

   ```typescript
   // Define interfaces
   interface User {
     id: string;
     email: string;
     name: string;
   }

   // Type function parameters
   function createUser(data: User): Promise<User> {
     // Implementation
   }
   ```

3. **Write Tests First (TDD)**

   ```javascript
   // POL-0117-0122: Test edge cases
   describe('validateEmail', () => {
     it('handles null input', () => {
       expect(validateEmail(null)).toBe(false);
     });

     it('handles empty string', () => {
       expect(validateEmail('')).toBe(false);
     });

     it('handles invalid UTF-8', () => {
       expect(validateEmail('\uD800')).toBe(false);
     });
   });
   ```

### Performance

1. **Avoid Blocking Operations**

   ```javascript
   // ❌ Bad
   const data = fs.readFileSync('large-file.json');

   // ✅ Good
   const data = await fs.promises.readFile('large-file.json');
   ```

2. **Use Connection Pooling**

   ```javascript
   const pool = new Pool({
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   ```

3. **Implement Caching**

   ```javascript
   const cache = new Redis();

   async function getUser(id) {
     const cached = await cache.get(`user:${id}`);
     if (cached) return JSON.parse(cached);

     const user = await db.users.findById(id);
     await cache.setex(`user:${id}`, 3600, JSON.stringify(user));
     return user;
   }
   ```

### Security

1. **Validate All Input**

   ```javascript
   const { body } = await request.post('/api/users').send({ email, password });

   // Validate
   if (!isValidEmail(email)) {
     throw new ValidationError('Invalid email');
   }
   ```

2. **Use Parameterized Queries**

   ```javascript
   // ❌ Bad
   db.query(`SELECT * FROM users WHERE id = ${userId}`);

   // ✅ Good
   db.query('SELECT * FROM users WHERE id = $1', [userId]);
   ```

3. **Never Commit Secrets**

   ```bash
   # Use environment variables
   export DATABASE_URL=postgresql://...

   # Or use .env (gitignored)
   echo "DATABASE_URL=postgresql://..." >> .env
   ```

### Documentation

1. **POL-0142-0159: Document All Public APIs**

   ```javascript
   /**
    * Creates a new user account
    *
    * @param {Object} userData - User information
    * @param {string} userData.email - User email address
    * @param {string} userData.password - User password (will be hashed)
    * @returns {Promise<User>} Created user object
    * @throws {ValidationError} If email is invalid
    * @throws {ConflictError} If email already exists
    *
    * @example
    * const user = await createUser({
    *   email: 'user@example.com',
    *   password: 'securePassword123'
    * });
    */
   async function createUser(userData) {
     // Implementation
   }
   ```

2. **Keep README Updated**
   - Update version numbers
   - Add new features to feature list
   - Update examples with new APIs

## Getting Help

- Check [Troubleshooting Guide](TROUBLESHOOTING.md)
- Search [GitHub Issues](https://github.com/noa-server/noa-server/issues)
- Ask in [Discord](https://discord.gg/noa-server)
- Review [Architecture Documentation](../architecture/)

## Next Steps

- Read [Testing Guide](TESTING.md)
- Review [Contributing Guidelines](CONTRIBUTING.md)
- Explore [API Documentation](../api/)
- Join the community chat

Happy coding! 🚀
