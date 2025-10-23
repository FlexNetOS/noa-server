# TypeScript API Client

TypeScript client library for the Noa Server API, auto-generated from the OpenAPI specification.

## Installation

### From npm (when published)

```bash
npm install @noa-server/api-client
```

### From local generation

```bash
# Generate the client
./generate-client.sh

# Install in your project
cd generated
npm link

# In your project
npm link @noa-server/api-client
```

## Quick Start

```typescript
import { Configuration, AuthenticationApi, UsersApi } from '@noa-server/api-client';

// Configure API client
const config = new Configuration({
  basePath: 'https://api.noa-server.io/v1',
  accessToken: 'YOUR_ACCESS_TOKEN'
});

// Initialize APIs
const authApi = new AuthenticationApi(config);
const usersApi = new UsersApi(config);

// Login
async function login() {
  try {
    const response = await authApi.authLogin({
      email: 'user@example.com',
      password: 'SecurePass123!'
    });

    console.log('Access token:', response.data.data.accessToken);
    return response.data.data.accessToken;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// Get current user
async function getCurrentUser() {
  const response = await usersApi.usersMe();
  return response.data.data;
}
```

## Available APIs

### AuthenticationApi

```typescript
const authApi = new AuthenticationApi(config);

// Register
await authApi.authRegister({ email, password, username });

// Login
await authApi.authLogin({ email, password });

// Logout
await authApi.authLogout();

// Refresh token
await authApi.authRefresh({ refreshToken });

// Setup MFA
await authApi.authMfaSetup();

// Verify MFA
await authApi.authMfaVerify({ code, secret });
```

### UsersApi

```typescript
const usersApi = new UsersApi(config);

// List users
await usersApi.users({ page: 1, limit: 20 });

// Get user
await usersApi.usersUserId({ userId });

// Update user
await usersApi.usersUserIdUpdate({ userId }, { firstName, lastName });

// Get current user
await usersApi.usersMe();

// Get user permissions
await usersApi.usersUserIdPermissions({ userId });
```

### WorkflowsApi

```typescript
const workflowsApi = new WorkflowsApi(config);

// List workflows
await workflowsApi.workflows({ page: 1, limit: 20 });

// Create workflow
await workflowsApi.workflowsCreate({ name, definition });

// Execute workflow
await workflowsApi.workflowsWorkflowIdExecute({ workflowId }, { parameters });

// Get workflow status
await workflowsApi.workflowsWorkflowIdStatus({ workflowId });

// List executions
await workflowsApi.workflowsExecutions({ workflowId });
```

### AgentsApi

```typescript
const agentsApi = new AgentsApi(config);

// List agents
await agentsApi.agents({ status: 'idle' });

// Spawn agent
await agentsApi.agentsCreate({ type: 'coder', capabilities });

// Get agent
await agentsApi.agentsAgentId({ agentId });

// Assign task to agent
await agentsApi.agentsAgentIdTasks({ agentId }, { type, parameters });

// Create swarm
await agentsApi.agentsSwarms({ name, topology: 'hierarchical' });

// Coordinate swarm
await agentsApi.agentsSwarmIdCoordinate({ swarmId }, { task, strategy });
```

### MCPToolsApi

```typescript
const mcpApi = new MCPToolsApi(config);

// List tools
await mcpApi.mcpTools();

// Get tool details
await mcpApi.mcpToolsToolId({ toolId });

// Execute tool
await mcpApi.mcpToolsToolIdExecute({ toolId }, { parameters });

// Filesystem operations
await mcpApi.mcpFilesystem({ operation: 'read', path: '/data/file.txt' });

// SQLite operations
await mcpApi.mcpSqlite({ database: 'app.db', query: 'SELECT * FROM users' });

// GitHub operations
await mcpApi.mcpGithub({ operation: 'create_issue', repository: 'owner/repo' });
```

## Configuration

### Basic Configuration

```typescript
const config = new Configuration({
  basePath: 'https://api.noa-server.io/v1',
  accessToken: 'YOUR_ACCESS_TOKEN'
});
```

### With API Key

```typescript
const config = new Configuration({
  basePath: 'https://api.noa-server.io/v1',
  apiKey: 'noa_sk_live_abc123xyz789'
});
```

### Custom Headers

```typescript
import axios from 'axios';

const axiosInstance = axios.create({
  headers: {
    'X-Client-ID': 'my-app',
    'X-Client-Version': '1.0.0'
  }
});

const config = new Configuration({
  basePath: 'https://api.noa-server.io/v1',
  accessToken: 'YOUR_ACCESS_TOKEN',
  baseOptions: {
    httpsAgent: axiosInstance
  }
});
```

## Error Handling

```typescript
import { AxiosError } from 'axios';

try {
  await authApi.authLogin({ email, password });
} catch (error) {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data;

    console.error('API Error:', {
      status: error.response?.status,
      error: apiError?.error,
      message: apiError?.message,
      details: apiError?.details
    });

    // Handle specific errors
    switch (error.response?.status) {
      case 401:
        console.error('Unauthorized - check credentials');
        break;
      case 429:
        console.error('Rate limited - retry after:', apiError?.details?.retryAfter);
        break;
      default:
        console.error('Unexpected error');
    }
  }
}
```

## Token Management

```typescript
class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async login(email: string, password: string) {
    const authApi = new AuthenticationApi();
    const response = await authApi.authLogin({ email, password });

    this.accessToken = response.data.data.accessToken;
    this.refreshToken = response.data.data.refreshToken;

    return this.accessToken;
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const authApi = new AuthenticationApi();
    const response = await authApi.authRefresh({
      refreshToken: this.refreshToken
    });

    this.accessToken = response.data.data.accessToken;
    this.refreshToken = response.data.data.refreshToken;

    return this.accessToken;
  }

  getConfig(): Configuration {
    return new Configuration({
      basePath: 'https://api.noa-server.io/v1',
      accessToken: this.accessToken || undefined
    });
  }
}
```

## Interceptors

### Request Interceptor

```typescript
import axios from 'axios';

const axiosInstance = axios.create();

axiosInstance.interceptors.request.use(
  (config) => {
    // Add request ID
    config.headers['X-Request-ID'] = generateRequestId();

    // Add timestamp
    config.headers['X-Request-Time'] = new Date().toISOString();

    console.log(`→ ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

### Response Interceptor

```typescript
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`← ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;

      try {
        const newToken = await tokenManager.refreshAccessToken();
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(error.config);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

## TypeScript Types

All API types are fully typed:

```typescript
import type {
  User,
  Workflow,
  WorkflowExecution,
  Agent,
  AgentSwarm,
  MCPTool
} from '@noa-server/api-client';

// Type-safe user object
const user: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user@example.com',
  username: 'johndoe',
  roles: ['user'],
  createdAt: new Date().toISOString()
};

// Type-safe workflow
const workflow: Workflow = {
  id: 'wf_123',
  name: 'Data Processing',
  status: 'active',
  definition: {
    steps: [...]
  }
};
```

## Examples

See the [examples](./examples) directory for complete working examples:

- `basic-auth.ts` - Authentication and login
- `workflow-management.ts` - Create and execute workflows
- `agent-swarm.ts` - Spawn and coordinate agents
- `mcp-tools.ts` - Execute MCP tools
- `error-handling.ts` - Comprehensive error handling

## Development

### Generate Client

```bash
./generate-client.sh
```

### Run Tests

```bash
cd generated
npm test
```

### Build

```bash
cd generated
npm run build
```

## Support

- **Documentation**: https://docs.noa-server.io
- **GitHub**: https://github.com/deflex/noa-server
- **Issues**: https://github.com/deflex/noa-server/issues
