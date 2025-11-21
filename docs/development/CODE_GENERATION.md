# Code Generation Tools

Noa Server includes automated code generation tools to accelerate development
and ensure consistency across the codebase.

## Available Generators

### 1. Package Generator

Generate a new package in the monorepo with complete TypeScript setup.

```bash
pnpm generate:package <package-name>
```

**Example:**

```bash
pnpm generate:package user-service
```

**Creates:**

```
packages/user-service/
├── src/
│   ├── index.ts
│   ├── types.ts
│   └── user-service.ts
├── tests/
│   └── user-service.test.ts
├── dist/
├── package.json
├── tsconfig.json
└── README.md
```

**Features:**

- ✅ TypeScript configuration
- ✅ Package.json with standard scripts
- ✅ Test setup with Vitest
- ✅ Type definitions
- ✅ README template
- ✅ ESLint and formatting ready

### 2. MCP Server Generator

Generate a new Model Context Protocol (MCP) server with Python implementation.

```bash
pnpm generate:mcp-server <server-name>
```

**Example:**

```bash
pnpm generate:mcp-server weather
```

**Creates:**

```
mcp/servers/weather/
├── __init__.py
├── server.py
├── tools.py
├── tests/
│   └── test_weather.py
└── README.md
```

**Features:**

- ✅ Async MCP server setup
- ✅ Tool implementation template
- ✅ Pytest test suite
- ✅ Logging configuration
- ✅ Error handling
- ✅ Type hints

### 3. API Route Generator

Generate a complete REST API route with controller, service, and validation.

```bash
pnpm generate:api-route <route-path>
```

**Example:**

```bash
pnpm generate:api-route /users
```

**Creates:**

```
packages/noa-server/src/routes/users/
├── index.ts         # Router configuration
├── controller.ts    # Request handlers
├── service.ts       # Business logic
├── types.ts         # Type definitions
└── validation.ts    # Request validation
```

**Features:**

- ✅ Full CRUD operations
- ✅ Express router setup
- ✅ Controller with error handling
- ✅ Service layer separation
- ✅ Joi validation
- ✅ TypeScript types
- ✅ RESTful conventions

### 4. React Component Generator

Generate a React component with tests and styles.

```bash
pnpm generate:component <component-name>
```

**Example:**

```bash
pnpm generate:component UserCard
```

**Creates:**

```
packages/ui-dashboard/src/components/UserCard/
├── index.tsx
├── UserCard.tsx
├── UserCard.css
└── UserCard.test.tsx
```

**Features:**

- ✅ TypeScript React component
- ✅ Props interface
- ✅ CSS module
- ✅ React Testing Library setup
- ✅ Barrel export

## Usage Patterns

### Creating a New Feature

Complete workflow for adding a new feature to Noa Server:

```bash
# 1. Generate the backend package
pnpm generate:package notifications

# 2. Generate API routes
pnpm generate:api-route /notifications

# 3. Generate MCP server for integrations
pnpm generate:mcp-server notifications

# 4. Generate UI components
pnpm generate:component NotificationBell
pnpm generate:component NotificationList
```

### Naming Conventions

The generators automatically handle naming conventions:

| Input          | Package Name               | Class Name    | File Name         |
| -------------- | -------------------------- | ------------- | ----------------- |
| `user-service` | `@noa-server/user-service` | `UserService` | `user-service.ts` |
| `auth_helper`  | `@noa-server/auth-helper`  | `AuthHelper`  | `auth-helper.ts`  |
| `APIClient`    | `@noa-server/api-client`   | `ApiClient`   | `api-client.ts`   |

**Conventions:**

- **Packages**: kebab-case (`user-service`)
- **Classes**: PascalCase (`UserService`)
- **Files**: kebab-case (`user-service.ts`)
- **Variables**: camelCase (`userService`)

## Code Templates

### Custom Templates

Templates are located in `scripts/generators/templates/`. You can customize them
for your needs.

**Template Variables:**

- `{{name}}` - Original input name
- `{{pascalName}}` - PascalCase version
- `{{camelName}}` - camelCase version
- `{{kebabName}}` - kebab-case version

### Adding a New Generator

Create a new generator function in `scripts/generators/generate.js`:

```javascript
generators['my-generator'] = function (name) {
  info(`Generating: ${name}`);

  const pascalName = toPascalCase(name);
  const outputPath = path.join(process.cwd(), 'output', name);

  ensureDir(outputPath);

  writeFile(
    path.join(outputPath, 'index.ts'),
    `export class ${pascalName} { }`
  );

  success(`Generated ${name}`);
};
```

Then use it:

```bash
pnpm generate:my-generator example
```

## Best Practices

### 1. Review Generated Code

Always review generated code before committing:

```bash
# Check what was created
git status

# Review the diff
git diff packages/new-package/

# Test the generated code
cd packages/new-package
pnpm test
```

### 2. Customize After Generation

Generators create boilerplate - you need to:

- Implement business logic
- Add proper validation rules
- Write comprehensive tests
- Update documentation

### 3. Maintain Consistency

Use generators for:

- ✅ All new packages
- ✅ All new API routes
- ✅ All new MCP servers
- ✅ All new React components

Avoid manual creation to maintain consistency.

### 4. Keep Templates Updated

When you find a common pattern, update the generator templates:

1. Update `scripts/generators/generate.js`
2. Test with a sample generation
3. Document the change
4. Commit the improvement

## Examples

### Example 1: Building a User Management System

```bash
# Step 1: Generate the backend service
pnpm generate:package user-management

# Step 2: Generate API routes
pnpm generate:api-route /users
pnpm generate:api-route /users/roles

# Step 3: Generate UI components
pnpm generate:component UserTable
pnpm generate:component UserForm
pnpm generate:component RoleSelector

# Step 4: Implement business logic
# Edit packages/user-management/src/user-management.ts
# Edit packages/noa-server/src/routes/users/service.ts

# Step 5: Add tests
# Edit tests files generated in each component
```

### Example 2: Creating an Integration

```bash
# Generate MCP server for external service
pnpm generate:mcp-server slack

# Implement Slack API integration
# Edit mcp/servers/slack/tools.py

# Create wrapper package
pnpm generate:package slack-client

# Add tests
cd mcp/servers/slack
pytest tests/
```

### Example 3: Building a Dashboard Feature

```bash
# Generate components
pnpm generate:component DashboardLayout
pnpm generate:component MetricsCard
pnpm generate:component ActivityFeed

# Generate API route for data
pnpm generate:api-route /dashboard/metrics

# Implement and connect
# 1. Implement API service
# 2. Connect components to API
# 3. Add to router
```

## Troubleshooting

### Generator Not Found

```bash
Error: Unknown generator: xyz
```

**Solution:** Check available generators:

```bash
node scripts/generators/generate.js
```

### Permission Denied

```bash
Error: EACCES: permission denied
```

**Solution:** Make script executable:

```bash
chmod +x scripts/generators/generate.js
```

### Import Path Issues

If imports don't work after generation:

1. Run `pnpm install` to update workspace links
2. Check `tsconfig.json` paths configuration
3. Verify package name in `package.json`

### Generated Code Doesn't Compile

1. Run `pnpm install` in the generated package
2. Check for TypeScript errors: `pnpm typecheck`
3. Review template syntax in generator

## Advanced Usage

### Batch Generation

Generate multiple items at once:

```bash
for route in users products orders; do
  pnpm generate:api-route /$route
done
```

### With Custom Configuration

Modify generated files programmatically:

```bash
# Generate
pnpm generate:package my-service

# Customize
cd packages/my-service
jq '.scripts.custom = "echo custom"' package.json > tmp.json
mv tmp.json package.json
```

### Integration with CI/CD

Add generation verification to CI:

```yaml
# .github/workflows/verify-structure.yml
- name: Verify Package Structure
  run: |
    pnpm generate:package test-pkg
    test -f packages/test-pkg/package.json
    test -f packages/test-pkg/src/index.ts
    rm -rf packages/test-pkg
```

## Contributing

To improve the generators:

1. Fork the repository
2. Modify `scripts/generators/generate.js`
3. Test thoroughly
4. Submit a pull request

## Support

For issues with code generation:

- GitHub Issues: https://github.com/noa-server/noa-server/issues
- Tag: `code-generation`
- Include: Generator name, input, error message
