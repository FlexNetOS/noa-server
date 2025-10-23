import {
  MCPTool,
  MCPToolCall,
  MCPToolResult,
  CallToolRequest,
  CallToolResponse,
  ListToolsResponse,
  MCPToolError,
} from './types';

/**
 * Tool management and invocation for MCP clients
 */
export class MCPToolManager {
  private tools: Map<string, MCPTool> = new Map();
  private sendRequest: (method: string, params?: unknown) => Promise<unknown>;

  constructor(sendRequest: (method: string, params?: unknown) => Promise<unknown>) {
    this.sendRequest = sendRequest;
  }

  /**
   * List all available tools from the server
   */
  async listTools(): Promise<MCPTool[]> {
    try {
      const response = (await this.sendRequest('tools/list')) as ListToolsResponse;

      // Update local cache
      this.tools.clear();
      for (const tool of response.tools) {
        this.tools.set(tool.name, tool);
      }

      return response.tools;
    } catch (error) {
      throw new MCPToolError(`Failed to list tools: ${error}`);
    }
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all cached tools
   */
  getAllTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Call a tool with the given arguments
   */
  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      throw new MCPToolError(`Tool not found: ${call.name}`);
    }

    // Validate arguments against schema
    if (call.arguments) {
      this.validateArguments(tool, call.arguments);
    }

    try {
      const request: CallToolRequest = {
        name: call.name,
        arguments: call.arguments,
      };

      const response = (await this.sendRequest('tools/call', request)) as CallToolResponse;

      return {
        content: response.content,
        isError: response.isError,
      };
    } catch (error) {
      throw new MCPToolError(`Tool execution failed: ${error}`);
    }
  }

  /**
   * Call multiple tools in sequence
   */
  async callToolsSequence(calls: MCPToolCall[]): Promise<MCPToolResult[]> {
    const results: MCPToolResult[] = [];

    for (const call of calls) {
      const result = await this.callTool(call);
      results.push(result);

      // Stop if we encounter an error
      if (result.isError) {
        break;
      }
    }

    return results;
  }

  /**
   * Call multiple tools in parallel
   */
  async callToolsParallel(calls: MCPToolCall[]): Promise<MCPToolResult[]> {
    const promises = calls.map((call) => this.callTool(call));
    return Promise.all(promises);
  }

  /**
   * Validate tool arguments against schema
   */
  private validateArguments(tool: MCPTool, args: Record<string, unknown>): void {
    const schema = tool.inputSchema;

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in args)) {
          throw new MCPToolError(`Missing required argument '${field}' for tool '${tool.name}'`);
        }
      }
    }

    // Check for unexpected fields if additionalProperties is false
    if (schema.additionalProperties === false && schema.properties) {
      const allowedKeys = Object.keys(schema.properties);
      const providedKeys = Object.keys(args);

      for (const key of providedKeys) {
        if (!allowedKeys.includes(key)) {
          throw new MCPToolError(`Unexpected argument '${key}' for tool '${tool.name}'`);
        }
      }
    }

    // Basic type validation
    if (schema.properties) {
      for (const [key, value] of Object.entries(args)) {
        const propSchema = schema.properties[key] as any;
        if (propSchema && propSchema.type) {
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          if (propSchema.type !== actualType) {
            throw new MCPToolError(
              `Invalid type for argument '${key}' in tool '${tool.name}': expected ${propSchema.type}, got ${actualType}`
            );
          }
        }
      }
    }
  }

  /**
   * Clear the tool cache
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Refresh the tool list from the server
   */
  async refresh(): Promise<MCPTool[]> {
    return this.listTools();
  }
}

/**
 * Utility functions for working with tools
 */
export class MCPToolUtils {
  /**
   * Create a tool call object
   */
  static createToolCall(name: string, args?: Record<string, unknown>): MCPToolCall {
    return {
      name,
      arguments: args,
    };
  }

  /**
   * Extract text content from tool results
   */
  static extractTextContent(result: MCPToolResult): string[] {
    return result.content.filter((item) => item.type === 'text').map((item) => (item as any).text);
  }

  /**
   * Extract image content from tool results
   */
  static extractImageContent(result: MCPToolResult): Array<{ data: string; mimeType: string }> {
    return result.content
      .filter((item) => item.type === 'image')
      .map((item) => {
        const img = item as any;
        return {
          data: img.data,
          mimeType: img.mimeType,
        };
      });
  }

  /**
   * Extract resource content from tool results
   */
  static extractResourceContent(result: MCPToolResult): Array<{ uri: string; text?: string }> {
    return result.content
      .filter((item) => item.type === 'resource')
      .map((item) => {
        const res = item as any;
        return {
          uri: res.resource.uri,
          text: res.resource.text,
        };
      });
  }

  /**
   * Check if a tool result contains errors
   */
  static hasError(result: MCPToolResult): boolean {
    return result.isError === true;
  }

  /**
   * Format tool result as string
   */
  static formatResult(result: MCPToolResult): string {
    const parts: string[] = [];

    for (const content of result.content) {
      if (content.type === 'text') {
        parts.push((content as any).text);
      } else if (content.type === 'image') {
        parts.push(`[Image: ${(content as any).mimeType}]`);
      } else if (content.type === 'resource') {
        parts.push(`[Resource: ${(content as any).resource.uri}]`);
      }
    }

    return parts.join('\n');
  }
}
