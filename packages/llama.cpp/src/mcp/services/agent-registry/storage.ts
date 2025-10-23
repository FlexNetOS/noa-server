/**
 * Agent Registry Storage Layer
 * Persistent storage for agent metadata, health, and performance metrics
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  AgentRegistration,
  AgentMetadata,
  AgentStatus,
  AgentHealthMetrics,
  AgentPerformanceMetrics,
  AgentCapability,
  AgentType,
  TaskAssignment,
  TaskCompletion,
  RegistryEvent,
  RegistryEventType
} from './types';

export interface StorageConfig {
  dataDir: string;
  enablePersistence: boolean;
  autoSaveInterval?: number; // milliseconds
  maxEventHistory?: number;
}

/**
 * In-memory storage with optional file persistence
 */
export class AgentRegistryStorage {
  private agents: Map<string, AgentRegistration> = new Map();
  private tasks: Map<string, TaskAssignment> = new Map();
  private events: RegistryEvent[] = [];
  private config: StorageConfig;
  private autoSaveTimer?: NodeJS.Timeout;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = {
      dataDir: config.dataDir || '/tmp/agent-registry',
      enablePersistence: config.enablePersistence ?? true,
      autoSaveInterval: config.autoSaveInterval || 30000, // 30 seconds
      maxEventHistory: config.maxEventHistory || 1000
    };
  }

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    if (this.config.enablePersistence) {
      await fs.mkdir(this.config.dataDir, { recursive: true });
      await this.load();

      // Start auto-save
      if (this.config.autoSaveInterval && this.config.autoSaveInterval > 0) {
        this.autoSaveTimer = setInterval(() => {
          this.save().catch(err => console.error('Auto-save failed:', err));
        }, this.config.autoSaveInterval);
      }
    }
  }

  /**
   * Shutdown storage
   */
  async shutdown(): Promise<void> {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    if (this.config.enablePersistence) {
      await this.save();
    }
  }

  /**
   * Save data to disk
   */
  private async save(): Promise<void> {
    if (!this.config.enablePersistence) return;

    const data = {
      agents: Array.from(this.agents.entries()),
      tasks: Array.from(this.tasks.entries()),
      events: this.events,
      timestamp: new Date().toISOString()
    };

    const filePath = path.join(this.config.dataDir, 'registry.json');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Load data from disk
   */
  private async load(): Promise<void> {
    if (!this.config.enablePersistence) return;

    const filePath = path.join(this.config.dataDir, 'registry.json');

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      this.agents = new Map(data.agents?.map((entry: [string, AgentRegistration]) => {
        // Restore Date objects
        const [id, agent] = entry;
        return [id, {
          ...agent,
          metadata: {
            ...agent.metadata,
            createdAt: new Date(agent.metadata.createdAt),
            updatedAt: new Date(agent.metadata.updatedAt)
          },
          health: {
            ...agent.health,
            lastHeartbeat: new Date(agent.health.lastHeartbeat)
          },
          performance: {
            ...agent.performance,
            lastUpdated: new Date(agent.performance.lastUpdated)
          }
        }];
      }) || []);

      this.tasks = new Map(data.tasks?.map((entry: [string, TaskAssignment]) => {
        const [id, task] = entry;
        return [id, {
          ...task,
          assignedAt: new Date(task.assignedAt),
          deadline: task.deadline ? new Date(task.deadline) : undefined
        }];
      }) || []);

      this.events = data.events?.map((event: RegistryEvent) => ({
        ...event,
        timestamp: new Date(event.timestamp)
      })) || [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('Failed to load registry data:', error);
      }
      // File doesn't exist yet, start fresh
    }
  }

  /**
   * Register a new agent
   */
  async registerAgent(registration: AgentRegistration): Promise<void> {
    this.agents.set(registration.metadata.id, registration);
    await this.addEvent({
      type: RegistryEventType.AGENT_REGISTERED,
      agentId: registration.metadata.id,
      timestamp: new Date(),
      data: registration.metadata
    });
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentRegistration | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentRegistration[] {
    return Array.from(this.agents.values());
  }

  /**
   * Update agent
   */
  async updateAgent(agentId: string, updates: Partial<AgentRegistration>): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    const updated = {
      ...agent,
      ...updates,
      metadata: {
        ...agent.metadata,
        ...updates.metadata,
        updatedAt: new Date()
      }
    };

    this.agents.set(agentId, updated);
    await this.addEvent({
      type: RegistryEventType.AGENT_UPDATED,
      agentId,
      timestamp: new Date(),
      data: updates
    });

    return true;
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(agentId: string, status: AgentStatus): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    const previousStatus = agent.status;
    agent.status = status;
    agent.metadata.updatedAt = new Date();

    if (previousStatus !== status) {
      await this.addEvent({
        type: RegistryEventType.AGENT_STATUS_CHANGED,
        agentId,
        timestamp: new Date(),
        data: { previousStatus, newStatus: status }
      });
    }

    return true;
  }

  /**
   * Update agent health
   */
  async updateAgentHealth(agentId: string, health: Partial<AgentHealthMetrics>): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.health = {
      ...agent.health,
      ...health,
      lastHeartbeat: new Date()
    };

    await this.addEvent({
      type: RegistryEventType.AGENT_HEARTBEAT,
      agentId,
      timestamp: new Date(),
      data: health
    });

    return true;
  }

  /**
   * Update agent performance
   */
  async updateAgentPerformance(agentId: string, performance: Partial<AgentPerformanceMetrics>): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.performance = {
      ...agent.performance,
      ...performance,
      lastUpdated: new Date()
    };

    return true;
  }

  /**
   * Remove agent
   */
  async removeAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    this.agents.delete(agentId);
    await this.addEvent({
      type: RegistryEventType.AGENT_REMOVED,
      agentId,
      timestamp: new Date(),
      data: agent.metadata
    });

    return true;
  }

  /**
   * Assign task to agent
   */
  async assignTask(task: TaskAssignment): Promise<void> {
    this.tasks.set(task.taskId, task);
    await this.addEvent({
      type: RegistryEventType.TASK_ASSIGNED,
      agentId: task.agentId,
      timestamp: new Date(),
      data: task
    });
  }

  /**
   * Complete task
   */
  async completeTask(completion: TaskCompletion): Promise<void> {
    const task = this.tasks.get(completion.taskId);
    if (!task) return;

    const agent = this.agents.get(completion.agentId);
    if (agent) {
      // Update performance metrics
      agent.performance.tasksCompleted++;
      if (!completion.success) {
        agent.performance.tasksFailed++;
      }

      // Update average task duration (rolling average)
      const totalDuration = agent.performance.averageTaskDuration * (agent.performance.tasksCompleted - 1) + completion.duration;
      agent.performance.averageTaskDuration = totalDuration / agent.performance.tasksCompleted;

      // Update success rate
      agent.performance.successRate = agent.performance.tasksCompleted /
        (agent.performance.tasksCompleted + agent.performance.tasksFailed);

      if (completion.tokensProcessed) {
        agent.performance.tokensProcessed += completion.tokensProcessed;
      }

      agent.performance.lastUpdated = new Date();
    }

    this.tasks.delete(completion.taskId);
    await this.addEvent({
      type: RegistryEventType.TASK_COMPLETED,
      agentId: completion.agentId,
      timestamp: new Date(),
      data: completion
    });
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): TaskAssignment | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get tasks for agent
   */
  getAgentTasks(agentId: string): TaskAssignment[] {
    return Array.from(this.tasks.values())
      .filter(task => task.agentId === agentId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): TaskAssignment[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Add event to history
   */
  private async addEvent(event: RegistryEvent): Promise<void> {
    this.events.push(event);

    // Trim event history if needed
    if (this.config.maxEventHistory && this.events.length > this.config.maxEventHistory) {
      this.events = this.events.slice(-this.config.maxEventHistory);
    }
  }

  /**
   * Get events for agent
   */
  getAgentEvents(agentId: string, limit?: number): RegistryEvent[] {
    const events = this.events.filter(event => event.agentId === agentId);
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Get all events
   */
  getAllEvents(limit?: number): RegistryEvent[] {
    return limit ? this.events.slice(-limit) : this.events;
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.agents.clear();
    this.tasks.clear();
    this.events = [];

    if (this.config.enablePersistence) {
      await this.save();
    }
  }
}
