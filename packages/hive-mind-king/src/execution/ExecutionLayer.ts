import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface ExecutionProvider {
  id: string;
  name: string;
  type: 'claude' | 'llama-cpp' | 'openai' | 'custom';
  capabilities: string[];
  maxConcurrency: number;
  costPerToken?: number;
  timeout: number;
  config: Record<string, any>;
}

export interface ExecutionTask {
  id: string;
  type: 'prompt' | 'chat' | 'completion' | 'embedding' | 'custom';
  prompt: string;
  parameters: Record<string, any>;
  provider: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  costLimit?: number;
  metadata?: Record<string, any>;
}

export interface ExecutionResult {
  id: string;
  taskId: string;
  provider: string;
  status: 'success' | 'error' | 'timeout' | 'cancelled';
  output?: any;
  error?: string;
  tokensUsed?: number;
  cost?: number;
  executionTime: number;
  startedAt: Date;
  completedAt: Date;
}

export interface ExecutionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  averageCost: number;
  totalTokens: number;
  errorRate: number;
  throughput: number; // executions per minute
}

/**
 * Execution Layer - Manages AI provider integrations and task execution
 */
export class ExecutionLayer extends EventEmitter {
  private config: any;
  private initialized: boolean = false;
  private providers: Map<string, ExecutionProvider & { metrics: ExecutionMetrics; activeTasks: number }> = new Map();
  private activeTasks: Map<string, ExecutionTask & { startedAt: Date }> = new Map();
  private taskQueue: (ExecutionTask & { queuedAt: Date })[] = [];
  private results: Map<string, ExecutionResult> = new Map();
  private processingInterval?: NodeJS.Timeout;

  constructor(config: any) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    this.initialized = true;

    // Initialize providers
    await this.initializeProviders();

    // Start task processing
    this.startTaskProcessing();

    console.log('ExecutionLayer started');
    this.emit('started');
  }

  async stop(): Promise<void> {
    // Cancel all active tasks
    for (const task of this.activeTasks.values()) {
      await this.cancelTask(task.id);
    }

    // Close provider connections
    await this.closeProviders();

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.initialized = false;
    console.log('ExecutionLayer stopped');
    this.emit('stopped');
  }

  getStatus(): any {
    const activeProviders = Array.from(this.providers.values()).filter(
      provider => provider.metrics.totalExecutions > 0
    );

    return {
      initialized: this.initialized,
      totalProviders: this.providers.size,
      activeProviders: activeProviders.length,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      metrics: this.calculateOverallMetrics(),
      providers: activeProviders.map(provider => ({
        id: provider.id,
        name: provider.name,
        type: provider.type,
        activeTasks: provider.activeTasks,
        metrics: provider.metrics,
      })),
    };
  }

  async registerProvider(config: ExecutionProvider): Promise<string> {
    if (!this.initialized) {
      throw new Error('ExecutionLayer not initialized');
    }

    const providerId = config.id || uuidv4();
    const provider = {
      ...config,
      id: providerId,
      metrics: this.initializeProviderMetrics(),
      activeTasks: 0,
    };

    this.providers.set(providerId, provider);

    // Initialize provider connection
    await this.initializeProviderConnection(provider);

    this.emit('provider-registered', { providerId, provider });
    console.log(`Provider registered: ${providerId} (${config.name})`);

    return providerId;
  }

  async unregisterProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    // Cancel all tasks for this provider
    const providerTasks = Array.from(this.activeTasks.values())
      .filter(task => task.provider === providerId);
    for (const task of providerTasks) {
      await this.cancelTask(task.id);
    }

    // Close provider connection
    await this.closeProviderConnection(providerId);

    this.providers.delete(providerId);

    this.emit('provider-unregistered', { providerId });
    console.log(`Provider unregistered: ${providerId}`);
  }

  async executeTask(task: ExecutionTask): Promise<string> {
    if (!this.initialized) {
      throw new Error('ExecutionLayer not initialized');
    }

    const provider = this.providers.get(task.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${task.provider}`);
    }

    // Validate task parameters
    this.validateTask(task, provider);

    const taskId = task.id || uuidv4();
    const fullTask = {
      ...task,
      id: taskId,
      queuedAt: new Date(),
    };

    // Try to execute immediately if provider has capacity
    if (provider.activeTasks < provider.maxConcurrency) {
      try {
        await this.executeTaskNow(fullTask, provider);
        this.emit('task-queued', { taskId, provider: task.provider });
        console.log(`Task executed immediately: ${taskId} (${task.type})`);
        return taskId;
      } catch (error) {
        console.error(`Failed to execute task ${taskId}:`, error);
        // Fall back to queuing
      }
    }

    // Queue the task for later processing
    this.taskQueue.push(fullTask);
    this.emit('task-queued', { taskId, provider: task.provider });
    console.log(`Task queued: ${taskId} (${task.type})`);

    return taskId;
  }

  async getTaskResult(taskId: string): Promise<ExecutionResult | undefined> {
    return this.results.get(taskId);
  }

  async cancelTask(taskId: string): Promise<void> {
    // Remove from queue if queued
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
      this.emit('task-cancelled', { taskId });
      return;
    }

    // Cancel active task
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) {
      throw new Error(`Active task not found: ${taskId}`);
    }

    const provider = this.providers.get(activeTask.provider);
    if (provider) {
      provider.activeTasks--;
    }

    this.activeTasks.delete(taskId);

    // Create cancelled result
    const result: ExecutionResult = {
      id: uuidv4(),
      taskId,
      provider: activeTask.provider,
      status: 'cancelled',
      executionTime: Date.now() - activeTask.startedAt.getTime(),
      startedAt: activeTask.startedAt,
      completedAt: new Date(),
    };

    this.results.set(taskId, result);

    this.emit('task-cancelled', { taskId, result });
    console.log(`Task cancelled: ${taskId}`);
  }

  getProvider(providerId: string): (ExecutionProvider & { metrics: ExecutionMetrics; activeTasks: number }) | undefined {
    return this.providers.get(providerId);
  }

  getAllProviders(): (ExecutionProvider & { metrics: ExecutionMetrics; activeTasks: number })[] {
    return Array.from(this.providers.values());
  }

  getProvidersByType(type: string): (ExecutionProvider & { metrics: ExecutionMetrics; activeTasks: number })[] {
    return Array.from(this.providers.values()).filter(provider => provider.type === type);
  }

  getProviderMetrics(providerId: string): ExecutionMetrics | undefined {
    const provider = this.providers.get(providerId);
    return provider ? provider.metrics : undefined;
  }

  private async initializeProviders(): Promise<void> {
    // Initialize configured providers
    const providerConfigs = this.config.providers || {};

    // Handle both array and object formats
    const configs = Array.isArray(providerConfigs)
      ? providerConfigs
      : Object.entries(providerConfigs).map(([type, config]) => ({
          ...(config as any),
          type,
          name: type,
          id: `${type}-provider`,
        capabilities: ['chat', 'completion', 'prompt'],
          maxConcurrency: 5,
          timeout: 30000,
        }));

    for (const config of configs) {
      try {
        await this.registerProvider(config);
      } catch (error) {
        console.error(`Failed to initialize provider ${config.name}:`, error);
      }
    }
  }

  private async closeProviders(): Promise<void> {
    for (const provider of this.providers.values()) {
      try {
        await this.closeProviderConnection(provider.id);
      } catch (error) {
        console.error(`Error closing provider ${provider.id}:`, error);
      }
    }
  }

  private async initializeProviderConnection(provider: ExecutionProvider): Promise<void> {
    // Initialize connection based on provider type
    switch (provider.type) {
      case 'claude':
        await this.initializeClaudeProvider(provider);
        break;
      case 'llama-cpp':
        await this.initializeLlamaCppProvider(provider);
        break;
      case 'openai':
        await this.initializeOpenAIProvider(provider);
        break;
      case 'custom':
        await this.initializeCustomProvider(provider);
        break;
      default:
        throw new Error(`Unknown provider type: ${provider.type}`);
    }
  }

  private async closeProviderConnection(providerId: string): Promise<void> {
    // Close provider connection
    // Implementation depends on provider type
    console.log(`Closing provider connection: ${providerId}`);
  }

  private async initializeClaudeProvider(provider: ExecutionProvider): Promise<void> {
    // Initialize Claude API client
    console.log(`Initializing Claude provider: ${provider.name}`);
    // Validate API key, etc.
  }

  private async initializeLlamaCppProvider(provider: ExecutionProvider): Promise<void> {
    // Initialize llama.cpp server connection
    console.log(`Initializing llama.cpp provider: ${provider.name}`);
    // Validate server endpoint, etc.
  }

  private async initializeOpenAIProvider(provider: ExecutionProvider): Promise<void> {
    // Initialize OpenAI API client
    console.log(`Initializing OpenAI provider: ${provider.name}`);
    // Validate API key, etc.
  }

  private async initializeCustomProvider(provider: ExecutionProvider): Promise<void> {
    // Initialize custom provider
    console.log(`Initializing custom provider: ${provider.name}`);
    // Custom initialization logic
  }

  private validateTask(task: ExecutionTask, provider: ExecutionProvider): void {
    // Check if provider supports task type
    if (!provider.capabilities.includes(task.type)) {
      throw new Error(`Provider ${provider.name} does not support task type: ${task.type}`);
    }

    // Validate parameters based on task type
    switch (task.type) {
      case 'prompt':
      case 'chat':
      case 'completion':
        if (!task.prompt || typeof task.prompt !== 'string') {
          throw new Error('Task prompt must be a non-empty string');
        }
        break;
      case 'embedding':
        if (!task.parameters.text || typeof task.parameters.text !== 'string') {
          throw new Error('Embedding task requires text parameter');
        }
        break;
    }

    // Check cost limit
    if (task.costLimit && provider.costPerToken) {
      const estimatedTokens = this.estimateTokens(task);
      const estimatedCost = estimatedTokens * provider.costPerToken;
      if (estimatedCost > task.costLimit) {
        throw new Error(`Estimated cost ${estimatedCost} exceeds limit ${task.costLimit}`);
      }
    }
  }

  private estimateTokens(task: ExecutionTask): number {
    // Simple token estimation
    const text = task.prompt || task.parameters.text || '';
    return Math.ceil(text.length / 4); // Rough estimate: 4 chars per token
  }

  private startTaskProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processTaskQueue();
    }, 1000); // Process every second
  }

  private async processTaskQueue(): Promise<void> {
    if (this.taskQueue.length === 0) return;

    // Sort by priority
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Try to execute highest priority task
    for (const queuedTask of this.taskQueue) {
      const provider = this.providers.get(queuedTask.provider);
      if (!provider) continue;

      // Check provider capacity
      if (provider.activeTasks >= provider.maxConcurrency) continue;

      // Remove from queue and execute
      this.taskQueue = this.taskQueue.filter(t => t.id !== queuedTask.id);

      try {
        await this.executeTaskNow(queuedTask, provider);
      } catch (error) {
        console.error(`Failed to execute task ${queuedTask.id}:`, error);
        // Re-queue task for retry
        this.taskQueue.push(queuedTask);
      }

      break; // Only process one task per cycle
    }
  }

  private async executeTaskNow(task: ExecutionTask & { queuedAt: Date }, provider: ExecutionProvider & { metrics: ExecutionMetrics; activeTasks: number }): Promise<void> {
    const startedAt = new Date();
    provider.activeTasks++;

    const activeTask = { ...task, startedAt };
    this.activeTasks.set(task.id, activeTask);

    this.emit('task-started', { taskId: task.id, provider: task.provider });

    try {
      let result: any;
      let tokensUsed = 0;
      let cost = 0;

      // Execute based on provider type
      switch (provider.type) {
        case 'claude':
          ({ result, tokensUsed, cost } = await this.executeClaudeTask(task, provider));
          break;
        case 'llama-cpp':
          ({ result, tokensUsed, cost } = await this.executeLlamaCppTask(task, provider));
          break;
        case 'openai':
          ({ result, tokensUsed, cost } = await this.executeOpenAITask(task, provider));
          break;
        case 'custom':
          ({ result, tokensUsed, cost } = await this.executeCustomTask(task, provider));
          break;
        default:
          throw new Error(`Unknown provider type: ${provider.type}`);
      }

      const completedAt = new Date();
      const executionTime = completedAt.getTime() - startedAt.getTime();

      const executionResult: ExecutionResult = {
        id: uuidv4(),
        taskId: task.id,
        provider: task.provider,
        status: 'success',
        output: result,
        tokensUsed,
        cost,
        executionTime,
        startedAt,
        completedAt,
      };

      this.results.set(task.id, executionResult);

      // Update provider metrics
      this.updateProviderMetrics(provider, executionResult);

      this.emit('task-completed', { taskId: task.id, result: executionResult });

    } catch (error) {
      const completedAt = new Date();
      const executionTime = completedAt.getTime() - startedAt.getTime();

      const executionResult: ExecutionResult = {
        id: uuidv4(),
        taskId: task.id,
        provider: task.provider,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        startedAt,
        completedAt,
      };

      this.results.set(task.id, executionResult);

      // Update provider metrics
      this.updateProviderMetrics(provider, executionResult);

      this.emit('task-failed', { taskId: task.id, error: executionResult.error });

    } finally {
      provider.activeTasks--;
      this.activeTasks.delete(task.id);
    }
  }

  private async executeClaudeTask(task: ExecutionTask, provider: ExecutionProvider): Promise<{ result: any; tokensUsed: number; cost: number }> {
    // Execute task using Claude API
    // This would make actual API calls
    console.log(`Executing Claude task: ${task.id}`);

    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

    return {
      result: { response: 'Mock Claude response' },
      tokensUsed: 100,
      cost: provider.costPerToken ? 100 * provider.costPerToken : 0,
    };
  }

  private async executeLlamaCppTask(task: ExecutionTask, provider: ExecutionProvider): Promise<{ result: any; tokensUsed: number; cost: number }> {
    // Execute task using llama.cpp server
    console.log(`Executing llama.cpp task: ${task.id}`);

    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

    return {
      result: { response: 'Mock llama.cpp response' },
      tokensUsed: 150,
      cost: 0, // Local execution, no cost
    };
  }

  private async executeOpenAITask(task: ExecutionTask, provider: ExecutionProvider): Promise<{ result: any; tokensUsed: number; cost: number }> {
    // Execute task using OpenAI API
    console.log(`Executing OpenAI task: ${task.id}`);

    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call

    return {
      result: { response: 'Mock OpenAI response' },
      tokensUsed: 120,
      cost: provider.costPerToken ? 120 * provider.costPerToken : 0,
    };
  }

  private async executeCustomTask(task: ExecutionTask, provider: ExecutionProvider): Promise<{ result: any; tokensUsed: number; cost: number }> {
    // Execute custom provider task
    console.log(`Executing custom task: ${task.id}`);

    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate execution

    return {
      result: { response: 'Mock custom response' },
      tokensUsed: 80,
      cost: 0,
    };
  }

  private initializeProviderMetrics(): ExecutionMetrics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      averageCost: 0,
      totalTokens: 0,
      errorRate: 0,
      throughput: 0,
    };
  }

  private updateProviderMetrics(provider: ExecutionProvider & { metrics: ExecutionMetrics }, result: ExecutionResult): void {
    const metrics = provider.metrics;

    metrics.totalExecutions++;

    if (result.status === 'success') {
      metrics.successfulExecutions++;
    } else {
      metrics.failedExecutions++;
    }

    // Update averages
    metrics.averageExecutionTime =
      (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + result.executionTime) / metrics.totalExecutions;

    if (result.cost !== undefined) {
      metrics.averageCost =
        (metrics.averageCost * (metrics.totalExecutions - 1) + result.cost) / metrics.totalExecutions;
    }

    if (result.tokensUsed !== undefined) {
      metrics.totalTokens += result.tokensUsed;
    }

    // Update error rate
    metrics.errorRate = metrics.failedExecutions / metrics.totalExecutions;

    // Update throughput (executions per minute, rolling average)
    const now = Date.now();
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    // Simplified throughput calculation
    metrics.throughput = metrics.totalExecutions / ((now - Date.now() + timeWindow) / (60 * 1000));
  }

  private resolveProviderId(providerName: string): string {
    // If it's already a valid provider id, return it
    if (this.providers.has(providerName)) {
      return providerName;
    }

    // Try to find provider by type
    for (const [id, provider] of this.providers) {
      if (provider.type === providerName) {
        return id;
      }
    }

    // If auto, use the first available provider
    if (providerName === 'auto') {
      const firstProvider = this.providers.keys().next().value;
      return firstProvider || 'claude-provider'; // fallback
    }

    // Default fallback
    return `${providerName}-provider`;
  }

  private calculateOverallMetrics(): any {
    const providers = Array.from(this.providers.values());
    if (providers.length === 0) return {};

    const totalExecutions = providers.reduce((sum, p) => sum + p.metrics.totalExecutions, 0);
    const totalSuccessful = providers.reduce((sum, p) => sum + p.metrics.successfulExecutions, 0);
    const totalFailed = providers.reduce((sum, p) => sum + p.metrics.failedExecutions, 0);
    const avgExecutionTime = providers.reduce((sum, p) => sum + p.metrics.averageExecutionTime, 0) / providers.length;
    const avgCost = providers.reduce((sum, p) => sum + p.metrics.averageCost, 0) / providers.length;
    const totalTokens = providers.reduce((sum, p) => sum + p.metrics.totalTokens, 0);

    return {
      totalExecutions,
      totalSuccessful,
      totalFailed,
      successRate: totalExecutions > 0 ? totalSuccessful / totalExecutions : 1.0,
      averageExecutionTime: avgExecutionTime,
      averageCost: avgCost,
      totalTokens,
      activeProviders: providers.filter(p => p.metrics.totalExecutions > 0).length,
    };
  }

  // Legacy method for backward compatibility
  async execute(request: any): Promise<any> {
    // Convert legacy request to new task format
    const providerName = request.provider || request.flags?.provider || this.config.defaultProvider || 'auto';
    const providerId = this.resolveProviderId(providerName);

    const task: ExecutionTask = {
      id: uuidv4(),
      type: request.type || 'prompt',
      prompt: request.prompt || request.description || '',
      parameters: request.parameters || {},
      provider: providerId,
      priority: request.priority || 'normal',
      timeout: request.timeout || request.flags?.timeout,
      costLimit: request.costLimit || request.flags?.costLimit,
      metadata: request.metadata,
    };

    const taskId = await this.executeTask(task);
    const result = await this.waitForResult(taskId);

    // Get provider name from provider ID
    const provider = this.providers.get(result.provider);
    const providerNameResult = provider ? provider.type : result.provider;

    return {
      success: result.status === 'success',
      output: result.output,
      provider: providerNameResult,  // Return provider name/type instead of ID
      taskId: result.taskId,
      error: result.error,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      executionTime: result.executionTime,
    };
  }

  private async waitForResult(taskId: string, timeout: number = 30000): Promise<ExecutionResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = this.results.get(taskId);
      if (result) {
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
    }

    throw new Error(`Timeout waiting for task result: ${taskId}`);
  }
}
