# MCP Client Libraries - Quick Start Guide

## Installation

### TypeScript SDK

```bash
cd /home/deflex/noa-server/packages/mcp-client
npm install
npm run build
```

### Python SDK

```bash
cd /home/deflex/noa-server/mcp/client
pip install -e .
```

## Basic Usage

### TypeScript

```typescript
import { createMCPClient } from '@noa-server/mcp-client';

// Create client
const client = createMCPClient({
  name: 'my-app',
  version: '1.0.0',
  transport: {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
  },
});

// Connect
await client.connect();

// List tools
const tools = await client.tools.listTools();
console.log(
  'Tools:',
  tools.map((t) => t.name)
);

// Call a tool
const result = await client.tools.callTool({
  name: 'read_file',
  arguments: { path: '/tmp/test.txt' },
});

// Disconnect
await client.disconnect();
```

### Python

```python
from mcp.client import create_mcp_client, MCPClientConfig, MCPTransportConfig, MCPTransportType

# Create client
config = MCPClientConfig(
    name="my-app",
    version="1.0.0",
    transport=MCPTransportConfig(
        type=MCPTransportType.STDIO,
        command="npx",
        args=["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    )
)
client = create_mcp_client(config)

# Connect
await client.connect()

# List tools
tools = await client.tools.list_tools()
print(f"Tools: {[t.name for t in tools]}")

# Call a tool
from mcp.client import MCPToolCall
result = await client.tools.call_tool(
    MCPToolCall(
        name="read_file",
        arguments={"path": "/tmp/test.txt"}
    )
)

# Disconnect
await client.disconnect()
```

## Transport Types

### 1. Stdio (Local Process)

**Best for:** Local MCP servers running as separate processes

```typescript
transport: {
  type: 'stdio',
  command: 'node',
  args: ['./mcp-server.js']
}
```

### 2. HTTP (Request/Response)

**Best for:** Stateless remote servers

```typescript
transport: {
  type: 'http',
  endpoint: 'https://api.example.com/mcp',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
}
```

### 3. WebSocket (Real-time)

**Best for:** Bidirectional streaming, notifications

```typescript
transport: {
  type: 'websocket',
  endpoint: 'wss://api.example.com/mcp',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
}
```

## Common Patterns

### Event Handling

```typescript
// Connection events
client.on('connected', () => console.log('Connected'));
client.on('disconnected', () => console.log('Disconnected'));
client.on('error', (error) => console.error('Error:', error));

// Server notifications
client.on('notification', (notification) => {
  console.log('Notification:', notification);
});

// Dynamic updates
client.on('toolsChanged', async () => {
  const tools = await client.tools.refresh();
  console.log('Updated tools:', tools);
});
```

### Parallel Tool Execution

```typescript
const calls = [
  { name: 'tool1', arguments: { param: 'value1' } },
  { name: 'tool2', arguments: { param: 'value2' } },
  { name: 'tool3', arguments: { param: 'value3' } },
];

const results = await client.tools.callToolsParallel(calls);
```

### Error Handling

```typescript
import {
  MCPConnectionError,
  MCPTimeoutError,
  MCPToolError,
} from '@noa-server/mcp-client';

try {
  await client.connect();
} catch (error) {
  if (error instanceof MCPConnectionError) {
    console.error('Connection failed');
  } else if (error instanceof MCPTimeoutError) {
    console.error('Connection timeout');
  }
}
```

## Testing

### TypeScript

```bash
npm test                # Run tests
npm run test:coverage   # Coverage report
npm run lint           # Linting
npm run typecheck      # Type checking
```

### Python

```bash
pytest                              # Run tests
pytest --cov=mcp.client            # Coverage
pytest --cov-report=html           # HTML coverage
mypy mcp/client                    # Type checking
pylint mcp/client                  # Linting
```

## Examples

Full working examples are available:

### TypeScript

- `/home/deflex/noa-server/packages/mcp-client/examples/stdio-example.ts`
- `/home/deflex/noa-server/packages/mcp-client/examples/http-example.ts`
- `/home/deflex/noa-server/packages/mcp-client/examples/websocket-example.ts`

### Python

- `/home/deflex/noa-server/mcp/client/examples/stdio_example.py`
- `/home/deflex/noa-server/mcp/client/examples/http_example.py`
- `/home/deflex/noa-server/mcp/client/examples/websocket_example.py`

## Key File Locations

### TypeScript SDK

- **Source**: `/home/deflex/noa-server/packages/mcp-client/src/`
- **Tests**: `/home/deflex/noa-server/packages/mcp-client/tests/`
- **Documentation**: `/home/deflex/noa-server/packages/mcp-client/README.md`

### Python SDK

- **Source**: `/home/deflex/noa-server/mcp/client/`
- **Tests**: `/home/deflex/noa-server/mcp/client/tests/`
- **Documentation**: `/home/deflex/noa-server/mcp/client/README.md`

## Statistics

- **TypeScript SDK**: ~1,540 lines of code
- **Python SDK**: ~1,593 lines of code
- **Total Files**: 40+ files across both SDKs
- **Test Coverage**: Unit tests for all major components
- **Examples**: 6 working examples (3 per language)

## Next Steps

1. Install dependencies and build the SDK
2. Run the examples to verify functionality
3. Run tests to ensure everything works
4. Read the full README for detailed API documentation
5. Integrate into your application

## Support

For detailed documentation, see:

- `/home/deflex/noa-server/packages/mcp-client/README.md` (TypeScript)
- `/home/deflex/noa-server/mcp/client/README.md` (Python)
- `/home/deflex/noa-server/docs/MCP_CLIENT_LIBRARIES.md` (Implementation
  details)
