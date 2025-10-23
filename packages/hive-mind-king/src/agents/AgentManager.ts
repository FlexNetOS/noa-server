import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface AgentConfig {
  id?: string;
  type: string;
  role: string;
  capabilities: string[];
  swarmId: string;
  queenId: string;
  maxConcurrentTasks?: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface AgentTask {
  id: string;
  type: 'execution' | 'analysis' | 'communication' | 'coordination';
  description: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  assignedTo: string;
  assignedBy: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface AgentPerformance {
  tasksCompleted: number;
  tasksFailed: number;
  averageExecutionTime: number;
  successRate: number;
  currentLoad: number;
  specializationScore: number;
  lastActivity: Date;
  uptime: number;
}

export interface AgentMigration {
  id: string;
  agentId: string;
  fromSwarmId: string;
  toSwarmId: string;
  reason: string;
  timestamp: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

/**
 * Agent Manager - Manages agent lifecycle and coordination
 */
export class AgentManager extends EventEmitter {
  private config: any;
  private initialized: boolean = false;
  private agents: Map<string, AgentConfig & { performance: AgentPerformance; tasks: AgentTask[] }> = new Map();
  private activeTasks: Map<string, AgentTask> = new Map();
  private taskQueue: AgentTask[] = [];
  private migrations: Map<string, AgentMigration> = new Map();
  private performanceInterval?: NodeJS.Timeout;

  constructor(config: any) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    this.initialized = true;

    // Start performance monitoring
    this.startPerformanceMonitoring();

    // Initialize task processing
    this.startTaskProcessing();

    console.log('AgentManager started');
    this.emit('started');
  }

  async stop(): Promise<void> {
    // Stop performance monitoring
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }

    // Cancel all active tasks
    for (const task of this.activeTasks.values()) {
      await this.cancelTask(task.id);
    }

    this.initialized = false;
    console.log('AgentManager stopped');
    this.emit('stopped');
  }

  getStatus(): any {
    const activeAgents = Array.from(this.agents.values()).filter(
      agent => agent.performance.uptime > 0
    );

    return {
      initialized: this.initialized,
      totalAgents: this.agents.size,
      activeAgents: activeAgents.length,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      migrations: this.migrations.size,
      performance: this.calculateOverallPerformance(),
      agents: activeAgents.map(agent => ({
        id: agent.id,
        type: agent.type,
        role: agent.role,
        swarmId: agent.swarmId,
        status: this.getAgentStatus(agent.id),
        performance: agent.performance,
        activeTasks: agent.tasks.filter(t => t.status === 'in-progress').length,
      })),
    };
  }

  async createAgent(config: AgentConfig): Promise<string> {
    if (!this.initialized) {
      throw new Error('AgentManager not initialized');
    }

    const agentId = config.id || uuidv4();
    const agent = {
      ...config,
      id: agentId,
      performance: this.initializeAgentPerformance(),
      tasks: [],
    };

    this.agents.set(agentId, agent);

    this.emit('agent-created', { agentId, agent });
    console.log(`Agent created: ${agentId} (${config.role})`);

    return agentId;
  }

  async destroyAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Cancel all tasks for this agent
    const agentTasks = agent.tasks.filter(task => task.status === 'in-progress' || task.status === 'pending');
    for (const task of agentTasks) {
      await this.cancelTask(task.id);
    }

    this.agents.delete(agentId);

    this.emit('agent-destroyed', { agentId });
    console.log(`Agent destroyed: ${agentId}`);
  }

  async assignTask(agentId: string, task: Omit<AgentTask, 'id' | 'assignedTo' | 'createdAt' | 'status'>): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Check if agent can handle this task type
    if (!this.canAgentHandleTask(agent, task.type)) {
      throw new Error(`Agent ${agentId} cannot handle task type: ${task.type}`);
    }

    // Check agent capacity
    const activeTasks = agent.tasks.filter(t => t.status === 'in-progress').length;
    const maxConcurrent = agent.maxConcurrentTasks || 3;
    if (activeTasks >= maxConcurrent) {
      throw new Error(`Agent ${agentId} at maximum capacity: ${maxConcurrent}`);
    }

    const taskId = uuidv4();
    const fullTask: AgentTask = {
      ...task,
      id: taskId,
      assignedTo: agentId,
      createdAt: new Date(),
      status: 'pending',
    };

    agent.tasks.push(fullTask);
    this.taskQueue.push(fullTask);

    this.emit('task-assigned', { agentId, taskId, task: fullTask });
    console.log(`Task assigned to agent ${agentId}: ${taskId}`);

    return taskId;
  }

  async startTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId) || this.taskQueue.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'in-progress';
    task.startedAt = new Date();
    this.activeTasks.set(taskId, task);

    // Remove from queue if it was queued
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
    }

    this.emit('task-started', { taskId, agentId: task.assignedTo });
    console.log(`Task started: ${taskId} by agent ${task.assignedTo}`);
  }

  async completeTask(taskId: string, result?: any): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Active task not found: ${taskId}`);
    }

    task.status = 'completed';
    task.completedAt = new Date();
    task.result = result;

    // Update agent performance
    const agent = this.agents.get(task.assignedTo);
    if (agent) {
      agent.performance.tasksCompleted++;
      agent.performance.lastActivity = new Date();

      if (task.startedAt && task.completedAt) {
        const executionTime = task.completedAt.getTime() - task.startedAt.getTime();
        agent.performance.averageExecutionTime =
          (agent.performance.averageExecutionTime + executionTime) / 2;
      }

      // Add completed task to agent's task history
      agent.tasks.push(task);
    }

    this.activeTasks.delete(taskId);

    this.emit('task-completed', { taskId, agentId: task.assignedTo, result });
    console.log(`Task completed: ${taskId} by agent ${task.assignedTo}`);
  }

  async failTask(taskId: string, error: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Active task not found: ${taskId}`);
    }

    task.status = 'failed';
    task.error = error;
    task.completedAt = new Date();

    // Update agent performance
    const agent = this.agents.get(task.assignedTo);
    if (agent) {
      agent.performance.tasksFailed++;
      agent.performance.lastActivity = new Date();
    }

    this.activeTasks.delete(taskId);

    this.emit('task-failed', { taskId, agentId: task.assignedTo, error });
    console.error(`Task failed: ${taskId} by agent ${task.assignedTo}: ${error}`);
  }

  async cancelTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId) || this.taskQueue.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'cancelled';
    task.completedAt = new Date();

    this.activeTasks.delete(taskId);

    // Remove from queue if queued
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
    }

    this.emit('task-cancelled', { taskId, agentId: task.assignedTo });
    console.log(`Task cancelled: ${taskId}`);
  }

  async migrateAgent(agentId: string, toSwarmId: string, reason: string = 'load-balancing'): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const migrationId = uuidv4();
    const migration: AgentMigration = {
      id: migrationId,
      agentId,
      fromSwarmId: agent.swarmId,
      toSwarmId,
      reason,
      timestamp: new Date(),
      status: 'pending',
    };

    this.migrations.set(migrationId, migration);

    // Cancel current tasks
    const activeTasks = agent.tasks.filter(task => task.status === 'in-progress');
    for (const task of activeTasks) {
      await this.cancelTask(task.id);
    }

    // Update agent swarm
    agent.swarmId = toSwarmId;
    migration.status = 'completed';

    this.emit('agent-migrated', { migrationId, agentId, fromSwarmId: migration.fromSwarmId, toSwarmId });
    console.log(`Agent migrated: ${agentId} from ${migration.fromSwarmId} to ${toSwarmId}`);

    return migrationId;
  }

  getAgent(agentId: string): (AgentConfig & { performance: AgentPerformance; tasks: AgentTask[] }) | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): (AgentConfig & { performance: AgentPerformance; tasks: AgentTask[] })[] {
    return Array.from(this.agents.values());
  }

  getAgentsBySwarm(swarmId: string): (AgentConfig & { performance: AgentPerformance; tasks: AgentTask[] })[] {
    return Array.from(this.agents.values()).filter(agent => agent.swarmId === swarmId);
  }

  getTask(taskId: string): AgentTask | undefined {
    // Check active tasks first
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) return activeTask;

    // Check queued tasks
    const queuedTask = this.taskQueue.find(t => t.id === taskId);
    if (queuedTask) return queuedTask;

    // Check agent task lists
    for (const agent of this.agents.values()) {
      const agentTask = agent.tasks.find(t => t.id === taskId);
      if (agentTask) return agentTask;
    }

    return undefined;
  }

  getAgentTasks(agentId: string): AgentTask[] {
    const agent = this.agents.get(agentId);
    return agent ? agent.tasks : [];
  }

  private getAgentStatus(agentId: string): string {
    const agent = this.agents.get(agentId);
    if (!agent) return 'unknown';

    const activeTasks = agent.tasks.filter(t => t.status === 'in-progress').length;
    const hasQueuedTasks = agent.tasks.some(t => t.status === 'pending');

    if (activeTasks > 0) return 'busy';
    if (hasQueuedTasks) return 'active';
    return 'idle';
  }

  private canAgentHandleTask(agent: AgentConfig, taskType: string): boolean {
    const taskCapabilities: Record<string, string[]> = {
      execution: ['task-execution', 'data-processing'],
      analysis: ['analysis', 'problem-solving', 'domain-expertise'],
      communication: ['communication', 'coordination'],
      coordination: ['coordination', 'resource-management', 'monitoring'],
    };

    const requiredCapabilities = taskCapabilities[taskType] || [];
    return requiredCapabilities.some(cap => agent.capabilities.includes(cap));
  }

  private initializeAgentPerformance(): AgentPerformance {
    return {
      tasksCompleted: 0,
      tasksFailed: 0,
      averageExecutionTime: 0,
      successRate: 1.0,
      currentLoad: 0,
      specializationScore: 0.5,
      lastActivity: new Date(),
      uptime: 0,
    };
  }

  private calculateOverallPerformance(): any {
    const agents = Array.from(this.agents.values());
    if (agents.length === 0) return {};

    const totalTasks = agents.reduce((sum, agent) => sum + agent.performance.tasksCompleted, 0);
    const totalFailed = agents.reduce((sum, agent) => sum + agent.performance.tasksFailed, 0);
    const avgExecutionTime = agents.reduce((sum, agent) => sum + agent.performance.averageExecutionTime, 0) / agents.length;
    const avgLoad = agents.reduce((sum, agent) => sum + agent.performance.currentLoad, 0) / agents.length;

    return {
      totalTasks,
      totalFailed,
      successRate: totalTasks > 0 ? (totalTasks - totalFailed) / totalTasks : 1.0,
      averageExecutionTime: avgExecutionTime,
      averageLoad: avgLoad,
      activeAgents: agents.filter(a => a.performance.uptime > 0).length,
    };
  }

  private startPerformanceMonitoring(): void {
    this.performanceInterval = setInterval(() => {
      this.updatePerformanceMetrics();
    }, 30000); // Update every 30 seconds
  }

  private updatePerformanceMetrics(): void {
    const now = Date.now();

    for (const agent of this.agents.values()) {
      // Update uptime
      agent.performance.uptime = now - agent.performance.lastActivity.getTime();

      // Update current load
      const activeTasks = agent.tasks.filter(t => t.status === 'in-progress').length;
      agent.performance.currentLoad = activeTasks / (agent.maxConcurrentTasks || 3);

      // Update success rate
      const totalTasks = agent.performance.tasksCompleted + agent.performance.tasksFailed;
      if (totalTasks > 0) {
        agent.performance.successRate = agent.performance.tasksCompleted / totalTasks;
      }
    }

    this.emit('performance-updated', { timestamp: new Date() });
  }

  private startTaskProcessing(): void {
    // Process queued tasks
    setInterval(() => {
      this.processTaskQueue();
    }, 1000); // Check every second
  }

  private async processTaskQueue(): Promise<void> {
    if (this.taskQueue.length === 0) return;

    // Sort by priority
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Try to start highest priority task
    const task = this.taskQueue[0];
    if (task) {
      try {
        await this.startTask(task.id);
      } catch (error) {
        console.error(`Failed to start task ${task.id}:`, error);
        // Remove failed task from queue
        this.taskQueue.shift();
      }
    }
  }
}
