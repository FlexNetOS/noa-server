/**
 * MCP Protocol Type Definitions
 * Based on Model Context Protocol Specification
 */

export type MCPVersion = '2024-11-05' | string;

// JSON-RPC Types
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JSONRPCError;
}

export interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

// MCP Protocol Types
export interface MCPCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: Record<string, unknown>;
  experimental?: Record<string, unknown>;
}

export interface MCPImplementation {
  name: string;
  version: string;
}

export interface MCPClientInfo {
  name: string;
  version: string;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion: MCPVersion;
  capabilities: MCPCapabilities;
}

// Tool Types
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface MCPToolCall {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface MCPToolResult {
  content: MCPContent[];
  isError?: boolean;
}

// Content Types
export type MCPContent = MCPTextContent | MCPImageContent | MCPResourceContent;

export interface MCPTextContent {
  type: 'text';
  text: string;
}

export interface MCPImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface MCPResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
}

// Resource Types
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// Prompt Types
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface MCPPromptMessage {
  role: 'user' | 'assistant';
  content: MCPContent;
}

// Transport Types
export type MCPTransportType = 'stdio' | 'http' | 'websocket';

export interface MCPTransportConfig {
  type: MCPTransportType;
  endpoint?: string;
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
  timeout?: number;
}

// Client Configuration
export interface MCPClientConfig {
  name: string;
  version: string;
  transport: MCPTransportConfig;
  capabilities?: MCPCapabilities;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  debug?: boolean;
}

// Connection States
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  ERROR = 'error',
}

// Events
export interface MCPClientEvents {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  stateChange: (state: ConnectionState) => void;
  toolsChanged: () => void;
  resourcesChanged: () => void;
  promptsChanged: () => void;
  notification: (notification: JSONRPCNotification) => void;
}

// Error Types
export class MCPError extends Error {
  constructor(
    message: string,
    public code: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class MCPConnectionError extends MCPError {
  constructor(message: string, data?: unknown) {
    super(message, -32000, data);
    this.name = 'MCPConnectionError';
  }
}

export class MCPTimeoutError extends MCPError {
  constructor(message: string, data?: unknown) {
    super(message, -32001, data);
    this.name = 'MCPTimeoutError';
  }
}

export class MCPToolError extends MCPError {
  constructor(message: string, data?: unknown) {
    super(message, -32002, data);
    this.name = 'MCPToolError';
  }
}

// List Response Types
export interface ListToolsResponse {
  tools: MCPTool[];
}

export interface ListResourcesResponse {
  resources: MCPResource[];
}

export interface ListPromptsResponse {
  prompts: MCPPrompt[];
}

export interface ReadResourceRequest {
  uri: string;
}

export interface ReadResourceResponse {
  contents: MCPContent[];
}

export interface GetPromptRequest {
  name: string;
  arguments?: Record<string, string>;
}

export interface GetPromptResponse {
  description?: string;
  messages: MCPPromptMessage[];
}

export interface CallToolRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface CallToolResponse {
  content: MCPContent[];
  isError?: boolean;
}

// Logging Types
export interface LoggingMessageNotification {
  level: 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';
  logger?: string;
  data?: unknown;
  message: string;
}
