import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface ToolConfig {
  id?: string;
  name: string;
  description: string;
  version: string;
  type: 'mcp' | 'native' | 'external' | 'custom';
  capabilities: string[];
  parameters: ToolParameter[];
  returnType: string;
  timeout?: number;
  cost?: number;
  metadata?: Record<string, any>;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface ToolExecution {
  id: string;
  toolId: string;
  agentId: string;
  parameters: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  executionTime?: number;
  cost?: number;
}

export interface ToolMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  averageCost: number;
  lastUsed: Date;
  errorRate: number;
  popularity: number;
}

/**
 * Tool Manager - Manages MCP and other tool integrations
 */
export class ToolManager extends EventEmitter {
  private config: any;
  private initialized: boolean = false;
  private tools: Map<string, ToolConfig & { metrics: ToolMetrics }> = new Map();
  private executions: Map<string, ToolExecution> = new Map();
  private activeExecutions: Map<string, ToolExecution> = new Map();
  private mcpClients: Map<string, any> = new Map(); // MCP client instances
  private executionTimeout?: NodeJS.Timeout;

  constructor(config: any) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    this.initialized = true;

    // Initialize MCP clients
    await this.initializeMCPClients();

    // Start execution monitoring
    this.startExecutionMonitoring();

    console.log('ToolManager started');
    this.emit('started');
  }

  async stop(): Promise<void> {
    // Cancel all active executions
    for (const execution of this.activeExecutions.values()) {
      await this.cancelExecution(execution.id);
    }

    // Close MCP clients
    await this.closeMCPClients();

    this.initialized = false;
    console.log('ToolManager stopped');
    this.emit('stopped');
  }

  getStatus(): any {
    const activeTools = Array.from(this.tools.values()).filter(
      tool => tool.metrics.totalExecutions > 0
    );

    return {
      initialized: this.initialized,
      totalTools: this.tools.size,
      activeTools: activeTools.length,
      activeExecutions: this.activeExecutions.size,
      mcpClients: this.mcpClients.size,
      metrics: this.calculateOverallMetrics(),
      tools: activeTools.map(tool => ({
        id: tool.id,
        name: tool.name,
        type: tool.type,
        metrics: tool.metrics,
        activeExecutions: Array.from(this.activeExecutions.values())
          .filter(exec => exec.toolId === tool.id).length,
      })),
    };
  }

  async registerTool(config: ToolConfig): Promise<string> {
    if (!this.initialized) {
      throw new Error('ToolManager not initialized');
    }

    const toolId = config.id || uuidv4();
    const tool = {
      ...config,
      id: toolId,
      metrics: this.initializeToolMetrics(),
    };

    this.tools.set(toolId, tool);

    // Initialize MCP client if needed
    if (config.type === 'mcp') {
      await this.initializeMCPTool(tool);
    }

    this.emit('tool-registered', { toolId, tool });
    console.log(`Tool registered: ${toolId} (${config.name})`);

    return toolId;
  }

  async unregisterTool(toolId: string): Promise<void> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    // Cancel all active executions for this tool
    const toolExecutions = Array.from(this.activeExecutions.values())
      .filter(exec => exec.toolId === toolId);
    for (const execution of toolExecutions) {
      await this.cancelExecution(execution.id);
    }

    // Close MCP client if exists
    if (tool.type === 'mcp') {
      await this.closeMCPTool(toolId);
    }

    this.tools.delete(toolId);

    this.emit('tool-unregistered', { toolId });
    console.log(`Tool unregistered: ${toolId}`);
  }

  async executeTool(toolId: string, agentId: string, parameters: Record<string, any>): Promise<string> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    // Validate parameters
    this.validateParameters(tool, parameters);

    const executionId = uuidv4();
    const execution: ToolExecution = {
      id: executionId,
      toolId,
      agentId,
      parameters,
      status: 'pending',
    };

    this.executions.set(executionId, execution);

    // Start execution asynchronously
    setImmediate(() => this.runToolExecution(execution));

    this.emit('execution-started', { executionId, toolId, agentId });
    console.log(`Tool execution started: ${executionId} (${tool.name})`);

    return executionId;
  }

  async getExecutionResult(executionId: string): Promise<ToolExecution> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    return execution;
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Active execution not found: ${executionId}`);
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();

    this.activeExecutions.delete(executionId);

    this.emit('execution-cancelled', { executionId, toolId: execution.toolId });
    console.log(`Tool execution cancelled: ${executionId}`);
  }

  getTool(toolId: string): (ToolConfig & { metrics: ToolMetrics }) | undefined {
    return this.tools.get(toolId);
  }

  getAllTools(): (ToolConfig & { metrics: ToolMetrics })[] {
    return Array.from(this.tools.values());
  }

  getToolsByType(type: string): (ToolConfig & { metrics: ToolMetrics })[] {
    return Array.from(this.tools.values()).filter(tool => tool.type === type);
  }

  getToolsByCapability(capability: string): (ToolConfig & { metrics: ToolMetrics })[] {
    return Array.from(this.tools.values()).filter(tool =>
      tool.capabilities.includes(capability)
    );
  }

  getToolMetrics(toolId: string): ToolMetrics | undefined {
    const tool = this.tools.get(toolId);
    return tool ? tool.metrics : undefined;
  }

  private async initializeMCPClients(): Promise<void> {
    // Initialize MCP client connections
    // This would connect to MCP servers based on configuration
    console.log('Initializing MCP clients...');
  }

  private async closeMCPClients(): Promise<void> {
    for (const [clientId, client] of this.mcpClients) {
      try {
        // Close MCP client connection
        await client.close();
      } catch (error) {
        console.error(`Error closing MCP client ${clientId}:`, error);
      }
    }
    this.mcpClients.clear();
  }

  private async initializeMCPTool(tool: ToolConfig & { metrics: ToolMetrics }): Promise<void> {
    // Initialize MCP tool connection
    // This would connect to the specific MCP tool
    console.log(`Initializing MCP tool: ${tool.name}`);
  }

  private async closeMCPTool(toolId: string): Promise<void> {
    const client = this.mcpClients.get(toolId);
    if (client) {
      try {
        await client.close();
        this.mcpClients.delete(toolId);
      } catch (error) {
        console.error(`Error closing MCP tool ${toolId}:`, error);
      }
    }
  }

  private validateParameters(tool: ToolConfig, parameters: Record<string, any>): void {
    for (const param of tool.parameters) {
      const value = parameters[param.name];

      // Check required parameters
      if (param.required && (value === undefined || value === null)) {
        throw new Error(`Required parameter missing: ${param.name}`);
      }

      // Type validation
      if (value !== undefined) {
        this.validateParameterType(param, value);
      }

      // Custom validation
      if (param.validation) {
        this.validateParameterConstraints(param, value);
      }
    }
  }

  private validateParameterType(param: ToolParameter, value: any): void {
    switch (param.type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`Parameter ${param.name} must be a string`);
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          throw new Error(`Parameter ${param.name} must be a number`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Parameter ${param.name} must be a boolean`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error(`Parameter ${param.name} must be an object`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`Parameter ${param.name} must be an array`);
        }
        break;
    }
  }

  private validateParameterConstraints(param: ToolParameter, value: any): void {
    const validation = param.validation!;
    const paramName = param.name;

    if (validation.min !== undefined && value < validation.min) {
      throw new Error(`Parameter ${paramName} must be >= ${validation.min}`);
    }

    if (validation.max !== undefined && value > validation.max) {
      throw new Error(`Parameter ${paramName} must be <= ${validation.max}`);
    }

    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        throw new Error(`Parameter ${paramName} does not match pattern: ${validation.pattern}`);
      }
    }

    if (validation.enum && !validation.enum.includes(value)) {
      throw new Error(`Parameter ${paramName} must be one of: ${validation.enum.join(', ')}`);
    }
  }

  private async runToolExecution(execution: ToolExecution): Promise<void> {
    const tool = this.tools.get(execution.toolId);
    if (!tool) {
      execution.status = 'failed';
      execution.error = 'Tool not found';
      this.emit('execution-failed', { executionId: execution.id, error: execution.error });
      return;
    }

    execution.status = 'running';
    execution.startedAt = new Date();
    this.activeExecutions.set(execution.id, execution);

    try {
      let result: any;

      // Execute based on tool type
      switch (tool.type) {
        case 'mcp':
          result = await this.executeMCPTool(tool, execution.parameters);
          break;
        case 'native':
          result = await this.executeNativeTool(tool, execution.parameters);
          break;
        case 'external':
          result = await this.executeExternalTool(tool, execution.parameters);
          break;
        case 'custom':
          result = await this.executeCustomTool(tool, execution.parameters);
          break;
        default:
          throw new Error(`Unknown tool type: ${tool.type}`);
      }

      execution.status = 'completed';
      execution.result = result;
      execution.completedAt = new Date();

      if (execution.startedAt && execution.completedAt) {
        execution.executionTime = execution.completedAt.getTime() - execution.startedAt.getTime();
      }

      // Update tool metrics
      this.updateToolMetrics(tool, execution);

      this.emit('execution-completed', {
        executionId: execution.id,
        toolId: execution.toolId,
        result,
        executionTime: execution.executionTime
      });

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();

      // Update tool metrics
      this.updateToolMetrics(tool, execution);

      this.emit('execution-failed', {
        executionId: execution.id,
        toolId: execution.toolId,
        error: execution.error
      });

    } finally {
      this.activeExecutions.delete(execution.id);
    }
  }

  private async executeMCPTool(tool: ToolConfig, parameters: Record<string, any>): Promise<any> {
    // Execute MCP tool via MCP client
    const client = this.mcpClients.get(tool.id);
    if (!client) {
      throw new Error(`MCP client not available for tool: ${tool.id}`);
    }

    // Call MCP tool with parameters
    return await client.call(tool.name, parameters);
  }

  private async executeNativeTool(tool: ToolConfig, parameters: Record<string, any>): Promise<any> {
    // Execute native tool (built-in functionality)
    // This would implement native tool logic
    throw new Error('Native tool execution not implemented');
  }

  private async executeExternalTool(tool: ToolConfig, parameters: Record<string, any>): Promise<any> {
    // Execute external tool (API calls, system commands, etc.)
    // This would implement external tool logic
    throw new Error('External tool execution not implemented');
  }

  private async executeCustomTool(tool: ToolConfig, parameters: Record<string, any>): Promise<any> {
    // Execute custom tool (user-defined logic)
    // This would implement custom tool logic
    throw new Error('Custom tool execution not implemented');
  }

  private initializeToolMetrics(): ToolMetrics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      averageCost: 0,
      lastUsed: new Date(),
      errorRate: 0,
      popularity: 0,
    };
  }

  private updateToolMetrics(tool: ToolConfig & { metrics: ToolMetrics }, execution: ToolExecution): void {
    const metrics = tool.metrics;

    metrics.totalExecutions++;
    metrics.lastUsed = new Date();

    if (execution.status === 'completed') {
      metrics.successfulExecutions++;
    } else if (execution.status === 'failed') {
      metrics.failedExecutions++;
    }

    // Update average execution time
    if (execution.executionTime !== undefined) {
      metrics.averageExecutionTime =
        (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + execution.executionTime) / metrics.totalExecutions;
    }

    // Update average cost
    if (execution.cost !== undefined) {
      metrics.averageCost =
        (metrics.averageCost * (metrics.totalExecutions - 1) + execution.cost) / metrics.totalExecutions;
    }

    // Update error rate
    metrics.errorRate = metrics.failedExecutions / metrics.totalExecutions;

    // Update popularity (simple recency-based scoring)
    const hoursSinceLastUse = (Date.now() - metrics.lastUsed.getTime()) / (1000 * 60 * 60);
    metrics.popularity = Math.max(0, 1 - (hoursSinceLastUse / 24)); // Decay over 24 hours
  }

  private calculateOverallMetrics(): any {
    const tools = Array.from(this.tools.values());
    if (tools.length === 0) return {};

    const totalExecutions = tools.reduce((sum, tool) => sum + tool.metrics.totalExecutions, 0);
    const totalSuccessful = tools.reduce((sum, tool) => sum + tool.metrics.successfulExecutions, 0);
    const totalFailed = tools.reduce((sum, tool) => sum + tool.metrics.failedExecutions, 0);
    const avgExecutionTime = tools.reduce((sum, tool) => sum + tool.metrics.averageExecutionTime, 0) / tools.length;
    const avgCost = tools.reduce((sum, tool) => sum + tool.metrics.averageCost, 0) / tools.length;

    return {
      totalExecutions,
      totalSuccessful,
      totalFailed,
      successRate: totalExecutions > 0 ? totalSuccessful / totalExecutions : 1.0,
      averageExecutionTime: avgExecutionTime,
      averageCost: avgCost,
      activeTools: tools.filter(t => t.metrics.totalExecutions > 0).length,
    };
  }

  private startExecutionMonitoring(): void {
    this.executionTimeout = setInterval(() => {
      this.checkExecutionTimeouts();
    }, 5000); // Check every 5 seconds
  }

  private checkExecutionTimeouts(): void {
    const now = Date.now();

    for (const execution of this.activeExecutions.values()) {
      const tool = this.tools.get(execution.toolId);
      if (tool && tool.timeout && execution.startedAt) {
        const elapsed = now - execution.startedAt.getTime();
        if (elapsed > tool.timeout) {
          console.warn(`Tool execution timeout: ${execution.id} (${tool.name})`);
          this.cancelExecution(execution.id).catch(error =>
            console.error(`Error cancelling timed out execution ${execution.id}:`, error)
          );
        }
      }
    }
  }
}
