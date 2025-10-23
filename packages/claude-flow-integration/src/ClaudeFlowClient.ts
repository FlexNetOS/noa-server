import axios, { AxiosInstance, AxiosError } from 'axios';
import EventEmitter from 'eventemitter3';

import {
  SwarmConfig,
  AgentConfig,
  TaskConfig,
  WorkflowConfig,
  ClaudeFlowClientConfig,
  SwarmInitResponse,
  AgentSpawnResponse,
  TaskOrchestrationResponse,
  TaskResult,
  SwarmStatus,
  AgentMetrics,
  SwarmMetrics,
  MemoryEntry,
  MemoryQuery,
  NeuralPattern,
  NeuralTrainingData,
  ApiResponse,
  ClaudeFlowError,
  TimeoutError,
  SwarmConfigSchema,
  AgentConfigSchema,
  TaskConfigSchema,
  WorkflowConfigSchema,
  TaskStatus,
  ClaudeFlowEvent,
} from './types';

/**
 * Claude Flow API Client
 *
 * Comprehensive client for interacting with Claude Flow orchestration system.
 * Provides methods for swarm initialization, agent spawning, task orchestration,
 * memory management, neural pattern training, and event monitoring.
 *
 * @example
 * ```typescript
 * const client = new ClaudeFlowClient({
 *   apiEndpoint: 'http://localhost:3000',
 *   enableHooks: true,
 *   enableMemory: true
 * });
 *
 * await client.initialize();
 * const swarm = await client.initSwarm({ topology: 'mesh', maxAgents: 10 });
 * const agent = await client.spawnAgent({ type: AgentType.CODER });
 * ```
 */
export class ClaudeFlowClient extends EventEmitter {
  private httpClient: AxiosInstance;
  private config: Required<ClaudeFlowClientConfig>;
  private initialized: boolean = false;
  private currentSessionId?: string;

  constructor(config: ClaudeFlowClientConfig = {}) {
    super();

    // Set default configuration
    this.config = {
      apiEndpoint: config.apiEndpoint || 'http://localhost:3000',
      apiKey: config.apiKey || process.env.CLAUDE_FLOW_API_KEY || '',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      enableHooks: config.enableHooks ?? true,
      enableMemory: config.enableMemory ?? true,
      enableNeural: config.enableNeural ?? false,
      debug: config.debug ?? false,
    };

    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL: this.config.apiEndpoint,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
      },
    });

    // Add request interceptor for logging
    if (this.config.debug) {
      this.httpClient.interceptors.request.use(
        (config) => {
          console.log(`[ClaudeFlowClient] ${config.method?.toUpperCase()} ${config.url}`);
          return config;
        },
        (error) => Promise.reject(error)
      );
    }

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.handleAxiosError(error)
    );
  }

  /**
   * Initialize the Claude Flow client
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check if Claude Flow is available
      const response = await this.httpClient.get<ApiResponse>('/health');

      if (!response.data.success) {
        throw new ClaudeFlowError('Claude Flow service is not available', 'SERVICE_UNAVAILABLE');
      }

      this.initialized = true;
      this.emit('client.initialized', { timestamp: Date.now() });
    } catch (error) {
      throw new ClaudeFlowError(
        'Failed to initialize Claude Flow client',
        'INITIALIZATION_ERROR',
        error
      );
    }
  }

  /**
   * Initialize a swarm with specified topology and configuration
   */
  async initSwarm(config: SwarmConfig): Promise<SwarmInitResponse> {
    await this.ensureInitialized();

    // Validate configuration
    const validatedConfig = SwarmConfigSchema.parse(config);

    try {
      const response = await this.httpClient.post<ApiResponse<SwarmInitResponse>>(
        '/swarm/init',
        validatedConfig
      );

      if (!response.data.success || !response.data.data) {
        throw new ClaudeFlowError('Swarm initialization failed', 'SWARM_INIT_ERROR');
      }

      this.currentSessionId = response.data.data.sessionId;
      this.emit('swarm.initialized', {
        type: 'swarm.initialized',
        timestamp: Date.now(),
        data: response.data.data,
      });

      return response.data.data;
    } catch (error) {
      throw this.wrapError(error, 'Failed to initialize swarm');
    }
  }

  /**
   * Spawn a new agent in the current swarm
   */
  async spawnAgent(config: AgentConfig): Promise<AgentSpawnResponse> {
    await this.ensureInitialized();

    // Validate configuration
    const validatedConfig = AgentConfigSchema.parse(config);

    try {
      const response = await this.httpClient.post<ApiResponse<AgentSpawnResponse>>('/agent/spawn', {
        ...validatedConfig,
        sessionId: this.currentSessionId,
      });

      if (!response.data.success || !response.data.data) {
        throw new ClaudeFlowError('Agent spawn failed', 'AGENT_SPAWN_ERROR');
      }

      this.emit('agent.spawned', {
        type: 'agent.spawned',
        timestamp: Date.now(),
        data: response.data.data,
      });

      return response.data.data;
    } catch (error) {
      throw this.wrapError(error, 'Failed to spawn agent');
    }
  }

  /**
   * Orchestrate multiple tasks across agents
   */
  async orchestrateTasks(tasks: TaskConfig[]): Promise<TaskOrchestrationResponse> {
    await this.ensureInitialized();

    // Validate all task configurations
    const validatedTasks = tasks.map((task) => TaskConfigSchema.parse(task));

    try {
      const response = await this.httpClient.post<ApiResponse<TaskOrchestrationResponse>>(
        '/task/orchestrate',
        {
          tasks: validatedTasks,
          sessionId: this.currentSessionId,
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new ClaudeFlowError('Task orchestration failed', 'ORCHESTRATION_ERROR');
      }

      return response.data.data;
    } catch (error) {
      throw this.wrapError(error, 'Failed to orchestrate tasks');
    }
  }

  /**
   * Execute a complete workflow
   */
  async executeWorkflow(workflow: WorkflowConfig): Promise<TaskResult[]> {
    await this.ensureInitialized();

    // Validate workflow configuration
    const validatedWorkflow = WorkflowConfigSchema.parse(workflow);

    try {
      // Initialize swarm if configured
      if (validatedWorkflow.swarmConfig) {
        await this.initSwarm(validatedWorkflow.swarmConfig);
      }

      // Orchestrate tasks
      const orchestration = await this.orchestrateTasks(validatedWorkflow.tasks);

      // Monitor task execution
      const results = await this.monitorTasks(orchestration.orchestrationId);

      return results;
    } catch (error) {
      throw this.wrapError(error, 'Failed to execute workflow');
    }
  }

  /**
   * Get the status of the current swarm
   */
  async getSwarmStatus(sessionId?: string): Promise<SwarmStatus> {
    await this.ensureInitialized();

    const sid = sessionId || this.currentSessionId;
    if (!sid) {
      throw new ClaudeFlowError('No active swarm session', 'NO_SESSION');
    }

    try {
      const response = await this.httpClient.get<ApiResponse<SwarmStatus>>(`/swarm/status/${sid}`);

      if (!response.data.success || !response.data.data) {
        throw new ClaudeFlowError('Failed to get swarm status', 'STATUS_ERROR');
      }

      return response.data.data;
    } catch (error) {
      throw this.wrapError(error, 'Failed to get swarm status');
    }
  }

  /**
   * Get metrics for a specific agent
   */
  async getAgentMetrics(agentId: string): Promise<AgentMetrics> {
    await this.ensureInitialized();

    try {
      const response = await this.httpClient.get<ApiResponse<AgentMetrics>>(
        `/agent/metrics/${agentId}`
      );

      if (!response.data.success || !response.data.data) {
        throw new ClaudeFlowError('Failed to get agent metrics', 'METRICS_ERROR');
      }

      return response.data.data;
    } catch (error) {
      throw this.wrapError(error, 'Failed to get agent metrics');
    }
  }

  /**
   * Get metrics for the entire swarm
   */
  async getSwarmMetrics(sessionId?: string): Promise<SwarmMetrics> {
    await this.ensureInitialized();

    const sid = sessionId || this.currentSessionId;
    if (!sid) {
      throw new ClaudeFlowError('No active swarm session', 'NO_SESSION');
    }

    try {
      const response = await this.httpClient.get<ApiResponse<SwarmMetrics>>(
        `/swarm/metrics/${sid}`
      );

      if (!response.data.success || !response.data.data) {
        throw new ClaudeFlowError('Failed to get swarm metrics', 'METRICS_ERROR');
      }

      return response.data.data;
    } catch (error) {
      throw this.wrapError(error, 'Failed to get swarm metrics');
    }
  }

  /**
   * Store data in swarm memory
   */
  async storeMemory(key: string, value: any, ttl?: number, tags?: string[]): Promise<void> {
    if (!this.config.enableMemory) {
      return;
    }

    await this.ensureInitialized();

    try {
      const entry: MemoryEntry = {
        key,
        value,
        timestamp: Date.now(),
        ttl,
        tags,
      };

      await this.httpClient.post('/memory/store', {
        sessionId: this.currentSessionId,
        entry,
      });
    } catch (error) {
      throw this.wrapError(error, 'Failed to store memory');
    }
  }

  /**
   * Retrieve data from swarm memory
   */
  async retrieveMemory(key: string): Promise<any> {
    if (!this.config.enableMemory) {
      return null;
    }

    await this.ensureInitialized();

    try {
      const response = await this.httpClient.get<ApiResponse<MemoryEntry>>(
        `/memory/retrieve/${key}`,
        { params: { sessionId: this.currentSessionId } }
      );

      return response.data.data?.value || null;
    } catch (error) {
      // Return null for missing keys instead of throwing
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw this.wrapError(error, 'Failed to retrieve memory');
    }
  }

  /**
   * Query memory with advanced filters
   */
  async queryMemory(query: MemoryQuery): Promise<MemoryEntry[]> {
    if (!this.config.enableMemory) {
      return [];
    }

    await this.ensureInitialized();

    try {
      const response = await this.httpClient.post<ApiResponse<MemoryEntry[]>>('/memory/query', {
        sessionId: this.currentSessionId,
        query,
      });

      return response.data.data || [];
    } catch (error) {
      throw this.wrapError(error, 'Failed to query memory');
    }
  }

  /**
   * Train neural patterns from successful operations
   */
  async trainNeural(data: NeuralTrainingData): Promise<void> {
    if (!this.config.enableNeural) {
      return;
    }

    await this.ensureInitialized();

    try {
      await this.httpClient.post('/neural/train', {
        sessionId: this.currentSessionId,
        data,
      });
    } catch (error) {
      throw this.wrapError(error, 'Failed to train neural patterns');
    }
  }

  /**
   * Get recognized neural patterns
   */
  async getNeuralPatterns(limit: number = 10): Promise<NeuralPattern[]> {
    if (!this.config.enableNeural) {
      return [];
    }

    await this.ensureInitialized();

    try {
      const response = await this.httpClient.get<ApiResponse<NeuralPattern[]>>('/neural/patterns', {
        params: {
          sessionId: this.currentSessionId,
          limit,
        },
      });

      return response.data.data || [];
    } catch (error) {
      throw this.wrapError(error, 'Failed to get neural patterns');
    }
  }

  /**
   * Shutdown the current swarm
   */
  async shutdownSwarm(sessionId?: string): Promise<void> {
    await this.ensureInitialized();

    const sid = sessionId || this.currentSessionId;
    if (!sid) {
      return;
    }

    try {
      await this.httpClient.post(`/swarm/shutdown/${sid}`);

      if (sid === this.currentSessionId) {
        this.currentSessionId = undefined;
      }

      this.emit('swarm.shutdown', {
        type: 'swarm.shutdown',
        timestamp: Date.now(),
        data: { sessionId: sid },
      });
    } catch (error) {
      throw this.wrapError(error, 'Failed to shutdown swarm');
    }
  }

  /**
   * Monitor task execution and return results
   */
  private async monitorTasks(
    orchestrationId: string,
    timeoutMs: number = 300000
  ): Promise<TaskResult[]> {
    const startTime = Date.now();
    const results: TaskResult[] = [];

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await this.httpClient.get<ApiResponse<TaskResult[]>>(
          `/task/results/${orchestrationId}`
        );

        if (response.data.data) {
          const completedTasks = response.data.data.filter(
            (task) => task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED
          );

          // Check if all tasks are complete
          if (completedTasks.length === response.data.data.length) {
            return response.data.data;
          }

          results.length = 0;
          results.push(...response.data.data);
        }

        // Wait before polling again
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        // Continue polling on temporary errors
        if (!axios.isAxiosError(error) || error.response?.status !== 404) {
          throw error;
        }
      }
    }

    throw new TimeoutError('Task monitoring timeout', { orchestrationId, results });
  }

  /**
   * Ensure client is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Handle Axios errors
   */
  private handleAxiosError(error: AxiosError): Promise<never> {
    if (error.response) {
      const message = (error.response.data as any)?.error || error.message;
      return Promise.reject(
        new ClaudeFlowError(message, `HTTP_${error.response.status}`, error.response.data)
      );
    } else if (error.request) {
      return Promise.reject(
        new ClaudeFlowError('No response from server', 'NO_RESPONSE', error.request)
      );
    } else {
      return Promise.reject(error);
    }
  }

  /**
   * Wrap errors with context
   */
  private wrapError(error: any, message: string): ClaudeFlowError {
    if (error instanceof ClaudeFlowError) {
      return error;
    }

    return new ClaudeFlowError(`${message}: ${error.message}`, 'WRAPPED_ERROR', error);
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | undefined {
    return this.currentSessionId;
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get client configuration
   */
  getConfig(): Readonly<Required<ClaudeFlowClientConfig>> {
    return { ...this.config };
  }
}
