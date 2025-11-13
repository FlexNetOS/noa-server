# @noa-server/mcp-client

TypeScript SDK for Model Context Protocol (MCP) - A comprehensive client library
for connecting to and interacting with MCP servers.

## Features

- **Multiple Transport Protocols**: stdio, HTTP, WebSocket
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Connection Management**: Auto-reconnect, retry logic, timeout handling
- **Tool Discovery & Invocation**: Easy-to-use API for MCP tools
- **Streaming Support**: Real-time bidirectional communication via WebSocket
- **Resource & Prompt Management**: Full support for MCP resources and prompts
- **Error Handling**: Comprehensive error types and handling
- **Event-Driven**: EventEmitter-based architecture for flexibility
- **Test Coverage**: Comprehensive test suite included

## Installation

```bash
npm install @noa-server/mcp-client
```

## Quick Start

### Stdio Transport (Local Process)

```typescript
import { createMCPClient } from '@noa-server/mcp-client';

const client = createMCPClient({
  name: 'my-application',
  version: '1.0.0',
  transport: {
    type: 'stdio',
    command: 'npx',
    args: ['my-mcp-server'],
  },
});

// Connect to server
const serverInfo = await client.connect();
console.log('Connected to:', serverInfo.name);

// List available tools
const tools = await client.tools.listTools();
console.log(
  'Available tools:',
  tools.map((t) => t.name)
);

// Call a tool
const result = await client.tools.callTool({
  name: 'get_weather',
  arguments: { city: 'San Francisco' },
});
console.log('Result:', result);

// Disconnect
await client.disconnect();
```

### HTTP Transport

```typescript
import { createMCPClient } from '@noa-server/mcp-client';

const client = createMCPClient({
  name: 'my-application',
  version: '1.0.0',
  transport: {
    type: 'http',
    endpoint: 'http://localhost:3000/mcp',
    headers: {
      Authorization: 'Bearer your-token-here',
    },
  },
  timeout: 30000,
});

await client.connect();
```

### WebSocket Transport

```typescript
import { createMCPClient } from '@noa-server/mcp-client';

const client = createMCPClient({
  name: 'my-application',
  version: '1.0.0',
  transport: {
    type: 'websocket',
    endpoint: 'ws://localhost:3000/mcp',
    headers: {
      Authorization: 'Bearer your-token-here',
    },
  },
});

// Listen for notifications
client.on('notification', (notification) => {
  console.log('Received notification:', notification);
});

await client.connect();
```

## Core Concepts

### Client Configuration

```typescript
interface MCPClientConfig {
  name: string; // Client application name
  version: string; // Client version
  transport: MCPTransportConfig;
  capabilities?: MCPCapabilities;
  timeout?: number; // Request timeout (default: 30000ms)
  retryAttempts?: number; // Connection retry attempts (default: 3)
  retryDelay?: number; // Delay between retries (default: 1000ms)
  debug?: boolean; // Enable debug logging
}
```

### Transport Types

#### Stdio Transport

Best for local MCP servers running as separate processes:

```typescript
{
  type: 'stdio',
  command: 'node',
  args: ['./mcp-server.js'],
  timeout: 30000
}
```

#### HTTP Transport

Best for stateless request/response patterns:

```typescript
{
  type: 'http',
  endpoint: 'https://api.example.com/mcp',
  headers: { 'Authorization': 'Bearer token' },
  timeout: 30000
}
```

#### WebSocket Transport

Best for real-time, bidirectional communication:

```typescript
{
  type: 'websocket',
  endpoint: 'wss://api.example.com/mcp',
  headers: { 'Authorization': 'Bearer token' },
  timeout: 30000
}
```

## Working with Tools

### List Tools

```typescript
const tools = await client.tools.listTools();

tools.forEach((tool) => {
  console.log(`${tool.name}: ${tool.description}`);
  console.log('Schema:', tool.inputSchema);
});
```

### Call a Tool

```typescript
const result = await client.tools.callTool({
  name: 'calculate',
  arguments: {
    operation: 'add',
    numbers: [10, 20, 30],
  },
});

// Extract text content
import { MCPToolUtils } from '@noa-server/mcp-client';
const texts = MCPToolUtils.extractTextContent(result);
console.log(texts.join('\n'));
```

### Call Multiple Tools

```typescript
// Sequential execution (stops on error)
const results = await client.tools.callToolsSequence([
  { name: 'tool1', arguments: { param: 'value1' } },
  { name: 'tool2', arguments: { param: 'value2' } },
  { name: 'tool3', arguments: { param: 'value3' } },
]);

// Parallel execution
const results = await client.tools.callToolsParallel([
  { name: 'tool1', arguments: { param: 'value1' } },
  { name: 'tool2', arguments: { param: 'value2' } },
  { name: 'tool3', arguments: { param: 'value3' } },
]);
```

## Working with Resources

```typescript
// List available resources
const resources = await client.listResources();

// Read a resource
const contents = await client.readResource('file:///path/to/file.txt');

contents.forEach((content) => {
  if (content.type === 'text') {
    console.log(content.text);
  }
});
```

## Working with Prompts

```typescript
// List available prompts
const prompts = await client.listPrompts();

// Get a prompt
const prompt = await client.getPrompt('code_review', {
  language: 'typescript',
  file: 'app.ts',
});

console.log('Prompt:', prompt.description);
prompt.messages.forEach((msg) => {
  console.log(`${msg.role}:`, msg.content);
});
```

## Event Handling

```typescript
import { ConnectionState } from '@noa-server/mcp-client';

// Connection state changes
client.on('stateChange', (state: ConnectionState) => {
  console.log('State changed to:', state);
});

// Connection events
client.on('connected', () => {
  console.log('Connected to MCP server');
});

client.on('disconnected', () => {
  console.log('Disconnected from MCP server');
});

// Error handling
client.on('error', (error) => {
  console.error('MCP Error:', error);
});

// Server notifications
client.on('notification', (notification) => {
  console.log('Notification:', notification.method, notification.params);
});

// Dynamic tool/resource changes
client.on('toolsChanged', () => {
  console.log('Tools list changed, refreshing...');
  client.tools.refresh();
});

client.on('resourcesChanged', () => {
  console.log('Resources list changed');
});

client.on('promptsChanged', () => {
  console.log('Prompts list changed');
});
```

## Error Handling

```typescript
import {
  MCPError,
  MCPConnectionError,
  MCPTimeoutError,
  MCPToolError,
} from '@noa-server/mcp-client';

try {
  await client.connect();
} catch (error) {
  if (error instanceof MCPConnectionError) {
    console.error('Connection failed:', error.message);
  } else if (error instanceof MCPTimeoutError) {
    console.error('Connection timeout:', error.message);
  } else if (error instanceof MCPError) {
    console.error('MCP Error:', error.code, error.message);
  }
}

try {
  const result = await client.tools.callTool({
    name: 'unknown_tool',
    arguments: {},
  });
} catch (error) {
  if (error instanceof MCPToolError) {
    console.error('Tool error:', error.message);
  }
}
```

## Advanced Usage

### Custom Transport Implementation

```typescript
import { MCPTransport, BaseTransport } from '@noa-server/mcp-client';

class CustomTransport extends BaseTransport {
  async connect(): Promise<void> {
    // Your custom connection logic
  }

  async disconnect(): Promise<void> {
    // Your custom disconnection logic
  }

  async send(message: JSONRPCRequest): Promise<void> {
    // Your custom send logic
  }
}
```

### Reconnection Strategy

```typescript
client.on('disconnected', async () => {
  console.log('Connection lost, attempting to reconnect...');

  try {
    await client.reconnect();
    console.log('Reconnected successfully');
  } catch (error) {
    console.error('Reconnection failed:', error);
  }
});
```

### Tool Result Processing

```typescript
import { MCPToolUtils } from '@noa-server/mcp-client';

const result = await client.tools.callTool({
  name: 'analyze_image',
  arguments: { url: 'https://example.com/image.jpg' },
});

// Extract different content types
const texts = MCPToolUtils.extractTextContent(result);
const images = MCPToolUtils.extractImageContent(result);
const resources = MCPToolUtils.extractResourceContent(result);

// Format as string
const formatted = MCPToolUtils.formatResult(result);
console.log(formatted);

// Check for errors
if (MCPToolUtils.hasError(result)) {
  console.error('Tool execution failed');
}
```

## Type Definitions

The SDK includes comprehensive TypeScript definitions for all MCP protocol
types:

```typescript
import {
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPContent,
  MCPCapabilities,
  ConnectionState,
  // ... and many more
} from '@noa-server/mcp-client';
```

## Testing

```bash
npm test                # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## Examples

See the `examples/` directory for complete working examples:

- `stdio-example.ts` - Local process communication
- `http-example.ts` - HTTP-based client
- `websocket-example.ts` - Real-time WebSocket client
- `advanced-example.ts` - Advanced patterns and error handling

## API Reference

### MCPClient

Main client class for MCP communication.

#### Methods

- `connect(): Promise<MCPServerInfo>` - Connect to MCP server
- `disconnect(): Promise<void>` - Disconnect from server
- `reconnect(): Promise<MCPServerInfo>` - Reconnect to server
- `isConnected(): boolean` - Check connection status
- `getState(): ConnectionState` - Get current connection state
- `getServerInfo(): MCPServerInfo | undefined` - Get server information
- `listResources(): Promise<MCPResource[]>` - List available resources
- `readResource(uri: string): Promise<MCPContent[]>` - Read a resource
- `listPrompts(): Promise<MCPPrompt[]>` - List available prompts
- `getPrompt(name: string, args?: Record<string, string>): Promise<GetPromptResponse>` -
  Get a prompt

#### Properties

- `tools: MCPToolManager` - Tool management interface

### MCPToolManager

Tool discovery and invocation manager.

#### Methods

- `listTools(): Promise<MCPTool[]>` - List all available tools
- `getTool(name: string): MCPTool | undefined` - Get specific tool
- `getAllTools(): MCPTool[]` - Get all cached tools
- `hasTool(name: string): boolean` - Check if tool exists
- `callTool(call: MCPToolCall): Promise<MCPToolResult>` - Call a tool
- `callToolsSequence(calls: MCPToolCall[]): Promise<MCPToolResult[]>` - Call
  tools sequentially
- `callToolsParallel(calls: MCPToolCall[]): Promise<MCPToolResult[]>` - Call
  tools in parallel
- `refresh(): Promise<MCPTool[]>` - Refresh tool list from server

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before
submitting PRs.

## Support

For issues and questions:

- GitHub Issues: https://github.com/noa-server/noa-server/issues
- Documentation: https://docs.noa-server.io/mcp-client
