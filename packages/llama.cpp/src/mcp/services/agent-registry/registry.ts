/**
 * Agent Registry Core Logic
 * Handles agent registration, discovery, health monitoring, and task allocation
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { AgentRegistryStorage } from './storage';
import {
  AgentRegistration,
  AgentMetadata,
  AgentStatus,
  AgentType,
  AgentCapability,
  AgentHealthMetrics,
  AgentPerformanceMetrics,
  AgentDiscoveryFilter,
  AgentDiscoveryResult,
  RegisterAgentRequest,
  UpdateAgentRequest,
  AgentHeartbeat,
  TaskAssignment,
  TaskCompletion,
  RegistryStatistics,
  RegistryEvent,
  MCPToolResult,
} from './types';

export interface RegistryConfig {
  storage?: AgentRegistryStorage;
  heartbeatTimeout?: number; // milliseconds
  healthCheckInterval?: number; // milliseconds
  enableAutoCleanup?: boolean;
  cleanupInterval?: number; // milliseconds
}

/**
 * Agent Registry - Central service for agent lifecycle management
 */
export class AgentRegistry extends EventEmitter {
  private storage: AgentRegistryStorage;
  private config: Required<RegistryConfig>;
  private healthCheckTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: RegistryConfig = {}) {
    super();

    this.storage = config.storage || new AgentRegistryStorage();
    this.config = {
      storage: this.storage,
      heartbeatTimeout: config.heartbeatTimeout || 60000, // 1 minute
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      enableAutoCleanup: config.enableAutoCleanup ?? true,
      cleanupInterval: config.cleanupInterval || 300000, // 5 minutes
    };
  }

  /**
   * Initialize registry
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();

    // Start health monitoring
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks().catch((err) => console.error('Health check failed:', err));
    }, this.config.healthCheckInterval);

    // Start cleanup
    if (this.config.enableAutoCleanup) {
      this.cleanupTimer = setInterval(() => {
        this.performCleanup().catch((err) => console.error('Cleanup failed:', err));
      }, this.config.cleanupInterval);
    }
  }

  /**
   * Shutdown registry
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    await this.storage.shutdown();
  }

  /**
   * Register a new agent
   */
  async registerAgent(request: RegisterAgentRequest): Promise<MCPToolResult<AgentRegistration>> {
    try {
      const agentId = uuidv4();
      const now = new Date();

      const metadata: AgentMetadata = {
        id: agentId,
        name: request.name,
        type: request.type,
        capabilities: request.capabilities,
        version: request.version || '1.0.0',
        description: request.description,
        tags: request.tags || [],
        priority: request.priority ?? 5,
        maxConcurrentTasks: request.maxConcurrentTasks || 5,
        createdAt: now,
        updatedAt: now,
        configuration: request.configuration,
      };

      const health: AgentHealthMetrics = {
        status: AgentStatus.INITIALIZING,
        uptime: 0,
        lastHeartbeat: now,
        errorCount: 0,
        warningCount: 0,
        taskCount: 0,
        successRate: 1.0,
        averageResponseTime: 0,
      };

      const performance: AgentPerformanceMetrics = {
        tasksCompleted: 0,
        tasksInProgress: 0,
        tasksFailed: 0,
        averageTaskDuration: 0,
        tokensProcessed: 0,
        tokenRate: 0,
        cacheHitRate: 0,
        qualityScore: 1.0,
        collaborationScore: 1.0,
        lastUpdated: now,
      };

      const registration: AgentRegistration = {
        metadata,
        status: AgentStatus.INITIALIZING,
        health,
        performance,
        endpoint: request.endpoint,
      };

      await this.storage.registerAgent(registration);
      this.emit('agent:registered', registration);

      // Auto-transition to IDLE after registration
      setTimeout(() => {
        this.updateAgentStatus(agentId, AgentStatus.IDLE).catch((err) =>
          console.error('Failed to transition agent to IDLE:', err)
        );
      }, 1000);

      return {
        success: true,
        data: registration,
        timestamp: now,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Discover agents by filter
   */
  async discoverAgents(
    filter: AgentDiscoveryFilter = {}
  ): Promise<MCPToolResult<AgentDiscoveryResult>> {
    try {
      let agents = this.storage.getAllAgents();
      const total = agents.length;

      // Apply filters
      if (filter.types && filter.types.length > 0) {
        agents = agents.filter((a) => filter.types!.includes(a.metadata.type));
      }

      if (filter.capabilities && filter.capabilities.length > 0) {
        agents = agents.filter((a) =>
          filter.capabilities!.some((cap) => a.metadata.capabilities.includes(cap))
        );
      }

      if (filter.statuses && filter.statuses.length > 0) {
        agents = agents.filter((a) => filter.statuses!.includes(a.status));
      }

      if (filter.tags && filter.tags.length > 0) {
        agents = agents.filter((a) => filter.tags!.some((tag) => a.metadata.tags?.includes(tag)));
      }

      if (filter.minPriority !== undefined) {
        agents = agents.filter((a) => a.metadata.priority >= filter.minPriority!);
      }

      if (filter.maxPriority !== undefined) {
        agents = agents.filter((a) => a.metadata.priority <= filter.maxPriority!);
      }

      if (filter.availableOnly) {
        agents = agents.filter(
          (a) => a.status === AgentStatus.IDLE || a.status === AgentStatus.ACTIVE
        );
      }

      if (filter.minSuccessRate !== undefined) {
        agents = agents.filter((a) => a.performance.successRate >= filter.minSuccessRate!);
      }

      const filtered = agents.length;

      // Sort
      if (filter.sortBy) {
        agents.sort((a, b) => {
          let comparison = 0;

          switch (filter.sortBy) {
            case 'priority':
              comparison = a.metadata.priority - b.metadata.priority;
              break;
            case 'successRate':
              comparison = a.performance.successRate - b.performance.successRate;
              break;
            case 'uptime':
              comparison = a.health.uptime - b.health.uptime;
              break;
            case 'taskCount':
              comparison = a.performance.tasksCompleted - b.performance.tasksCompleted;
              break;
          }

          return filter.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      // Pagination
      const offset = filter.offset || 0;
      const limit = filter.limit || agents.length;
      agents = agents.slice(offset, offset + limit);

      const result: AgentDiscoveryResult = {
        agents,
        total,
        filtered,
        limit,
        offset,
      };

      return {
        success: true,
        data: result,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get agent health
   */
  async getAgentHealth(agentId: string): Promise<MCPToolResult<AgentHealthMetrics>> {
    try {
      const agent = this.storage.getAgent(agentId);

      if (!agent) {
        return {
          success: false,
          error: `Agent ${agentId} not found`,
          timestamp: new Date(),
        };
      }

      return {
        success: true,
        data: agent.health,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get agent metrics
   */
  async getAgentMetrics(agentId: string): Promise<MCPToolResult<AgentPerformanceMetrics>> {
    try {
      const agent = this.storage.getAgent(agentId);

      if (!agent) {
        return {
          success: false,
          error: `Agent ${agentId} not found`,
          timestamp: new Date(),
        };
      }

      return {
        success: true,
        data: agent.performance,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(agentId: string, status: AgentStatus): Promise<MCPToolResult<boolean>> {
    try {
      const success = await this.storage.updateAgentStatus(agentId, status);

      if (success) {
        this.emit('agent:status-changed', { agentId, status });
      }

      return {
        success,
        data: success,
        error: success ? undefined : `Agent ${agentId} not found`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Update agent
   */
  async updateAgent(request: UpdateAgentRequest): Promise<MCPToolResult<boolean>> {
    try {
      const updates: Partial<AgentRegistration> = {
        status: request.status,
        metadata: {
          capabilities: request.capabilities,
          tags: request.tags,
          priority: request.priority,
          maxConcurrentTasks: request.maxConcurrentTasks,
          configuration: request.configuration,
        } as Partial<AgentMetadata>,
      };

      const success = await this.storage.updateAgent(request.agentId, updates);

      if (success) {
        this.emit('agent:updated', { agentId: request.agentId, updates });
      }

      return {
        success,
        data: success,
        error: success ? undefined : `Agent ${request.agentId} not found`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Process heartbeat
   */
  async heartbeat(heartbeat: AgentHeartbeat): Promise<MCPToolResult<boolean>> {
    try {
      const health: Partial<AgentHealthMetrics> = {
        lastHeartbeat: heartbeat.timestamp,
        taskCount: heartbeat.taskCount,
        memoryUsage: heartbeat.memoryUsage,
        cpuUsage: heartbeat.cpuUsage,
      };

      const success = await this.storage.updateAgentHealth(heartbeat.agentId, health);

      if (success && heartbeat.status) {
        await this.storage.updateAgentStatus(heartbeat.agentId, heartbeat.status);
      }

      return {
        success,
        data: success,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Assign task to agent
   */
  async assignTask(task: TaskAssignment): Promise<MCPToolResult<boolean>> {
    try {
      const agent = this.storage.getAgent(task.agentId);

      if (!agent) {
        return {
          success: false,
          error: `Agent ${task.agentId} not found`,
          timestamp: new Date(),
        };
      }

      await this.storage.assignTask(task);
      agent.performance.tasksInProgress++;

      this.emit('task:assigned', task);

      return {
        success: true,
        data: true,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Complete task
   */
  async completeTask(completion: TaskCompletion): Promise<MCPToolResult<boolean>> {
    try {
      await this.storage.completeTask(completion);

      const agent = this.storage.getAgent(completion.agentId);
      if (agent) {
        agent.performance.tasksInProgress--;
      }

      this.emit('task:completed', completion);

      return {
        success: true,
        data: true,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get registry statistics
   */
  async getStatistics(): Promise<MCPToolResult<RegistryStatistics>> {
    try {
      const agents = this.storage.getAllAgents();
      const tasks = this.storage.getAllTasks();

      const stats: RegistryStatistics = {
        totalAgents: agents.length,
        activeAgents: agents.filter((a) => a.status === AgentStatus.ACTIVE).length,
        idleAgents: agents.filter((a) => a.status === AgentStatus.IDLE).length,
        busyAgents: agents.filter((a) => a.status === AgentStatus.BUSY).length,
        errorAgents: agents.filter((a) => a.status === AgentStatus.ERROR).length,
        offlineAgents: agents.filter((a) => a.status === AgentStatus.OFFLINE).length,
        totalTasks: agents.reduce(
          (sum, a) => sum + a.performance.tasksCompleted + a.performance.tasksFailed,
          0
        ),
        completedTasks: agents.reduce((sum, a) => sum + a.performance.tasksCompleted, 0),
        failedTasks: agents.reduce((sum, a) => sum + a.performance.tasksFailed, 0),
        averageSuccessRate:
          agents.length > 0
            ? agents.reduce((sum, a) => sum + a.performance.successRate, 0) / agents.length
            : 0,
        averageResponseTime:
          agents.length > 0
            ? agents.reduce((sum, a) => sum + a.health.averageResponseTime, 0) / agents.length
            : 0,
        updatedAt: new Date(),
      };

      return {
        success: true,
        data: stats,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Perform health checks on all agents
   */
  private async performHealthChecks(): Promise<void> {
    const agents = this.storage.getAllAgents();
    const now = Date.now();

    for (const agent of agents) {
      const timeSinceHeartbeat = now - agent.health.lastHeartbeat.getTime();

      if (timeSinceHeartbeat > this.config.heartbeatTimeout) {
        // Mark agent as offline
        if (agent.status !== AgentStatus.OFFLINE) {
          await this.storage.updateAgentStatus(agent.metadata.id, AgentStatus.OFFLINE);
          this.emit('agent:offline', { agentId: agent.metadata.id });
        }
      }
    }
  }

  /**
   * Cleanup stale data
   */
  private async performCleanup(): Promise<void> {
    const agents = this.storage.getAllAgents();
    const now = Date.now();
    const maxOfflineTime = 24 * 60 * 60 * 1000; // 24 hours

    for (const agent of agents) {
      if (agent.status === AgentStatus.OFFLINE) {
        const offlineTime = now - agent.health.lastHeartbeat.getTime();

        if (offlineTime > maxOfflineTime) {
          await this.storage.removeAgent(agent.metadata.id);
          this.emit('agent:removed', { agentId: agent.metadata.id, reason: 'stale' });
        }
      }
    }
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentRegistration | undefined {
    return this.storage.getAgent(agentId);
  }

  /**
   * Remove agent
   */
  async removeAgent(agentId: string): Promise<MCPToolResult<boolean>> {
    try {
      const success = await this.storage.removeAgent(agentId);

      if (success) {
        this.emit('agent:removed', { agentId });
      }

      return {
        success,
        data: success,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }
}
