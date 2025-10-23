/**
 * @noa-server/mcp-client
 * TypeScript SDK for Model Context Protocol (MCP)
 *
 * Provides a comprehensive client library for connecting to and interacting
 * with MCP servers using multiple transport protocols.
 */

import { MCPClient } from './MCPClient';

export { MCPClient } from './MCPClient';
export { MCPToolManager, MCPToolUtils } from './tools';

// Transport classes
export { HTTPTransport, StdioTransport, WebSocketTransport } from './transports';

// Transport types
export type { BaseTransport, MCPTransport } from './transports';

export type {
  // Request/Response types
  CallToolRequest,
  CallToolResponse,
  // Connection
  ConnectionState,
  GetPromptRequest,
  GetPromptResponse,
  JSONRPCError,
  JSONRPCNotification,
  // JSON-RPC types
  JSONRPCRequest,
  JSONRPCResponse,
  ListPromptsResponse,
  ListResourcesResponse,
  ListToolsResponse,
  // Logging types
  LoggingMessageNotification,
  MCPCapabilities,
  // Core types
  MCPClientConfig,
  // Event types
  MCPClientEvents,
  MCPClientInfo,
  MCPConnectionError,
  // Content types
  MCPContent,
  // Error types
  MCPError,
  MCPImageContent,
  MCPImplementation,
  // Prompt types
  MCPPrompt,
  MCPPromptArgument,
  MCPPromptMessage,
  // Resource types
  MCPResource,
  MCPResourceContent,
  MCPResourceTemplate,
  MCPServerInfo,
  MCPTextContent,
  MCPTimeoutError,
  // Tool types
  MCPTool,
  MCPToolCall,
  MCPToolError,
  MCPToolResult,
  MCPTransportConfig,
  // Transport configuration
  MCPTransportType,
  ReadResourceRequest,
  ReadResourceResponse,
} from './types';

// Version
export const VERSION = '1.0.0';

/**
 * Create a new MCP client instance
 *
 * @example
 * ```typescript
 * import { createMCPClient } from '@noa-server/mcp-client';
 *
 * const client = createMCPClient({
 *   name: 'my-app',
 *   version: '1.0.0',
 *   transport: {
 *     type: 'stdio',
 *     command: 'npx',
 *     args: ['my-mcp-server']
 *   }
 * });
 *
 * await client.connect();
 * const tools = await client.tools.listTools();
 * ```
 */
export function createMCPClient(config: import('./types').MCPClientConfig): MCPClient {
  return new MCPClient(config);
}
