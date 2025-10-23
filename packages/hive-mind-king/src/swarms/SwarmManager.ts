import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface SwarmConfig {
  id?: string;
  name: string;
  objective: string;
  queenType: 'strategic' | 'tactical' | 'operational' | 'adaptive';
  maxAgents: number;
  minAgents?: number;
  autoScale: boolean;
  memoryLimit?: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface Swarm {
  id: string;
  name: string;
  objective: string;
  queen: Queen;
  agents: Agent[];
  status: 'initializing' | 'active' | 'scaling' | 'idle' | 'terminating' | 'error';
  createdAt: Date;
  lastActivity: Date;
  config: SwarmConfig;
  metrics: SwarmMetrics;
  communicationBus: CommunicationBus;
}

export interface Queen {
  id: string;
  type: 'strategic' | 'tactical' | 'operational' | 'adaptive';
  status: 'active' | 'overloaded' | 'error';
  capabilities: string[];
  loadFactor: number;
  decisionHistory: Decision[];
}

export interface Agent {
  id: string;
  type: string;
  role: string;
  capabilities: string[];
  status: 'active' | 'idle' | 'busy' | 'error';
  swarmId: string;
  queenId: string;
  performance: AgentPerformance;
  createdAt: Date;
}

export interface SwarmMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageResponseTime: number;
  resourceUsage: {
    memory: number;
    cpu: number;
    network: number;
  };
  agentUtilization: number;
  queenLoad: number;
}

export interface AgentPerformance {
  tasksCompleted: number;
  averageExecutionTime: number;
  successRate: number;
  errorRate: number;
  lastActivity: Date;
}

export interface Decision {
  id: string;
  timestamp: Date;
  type: string;
  context: any;
  outcome: any;
  confidence: number;
}

export interface CommunicationBus {
  id: string;
  channels: Map<string, CommunicationChannel>;
  subscribers: Map<string, Function[]>;
}

export interface CommunicationChannel {
  id: string;
  type: 'broadcast' | 'direct' | 'queen-only' | 'task' | 'status' | 'decision' | 'error' | 'control';
  subscribers: string[];
  messageHistory: Message[];
}

export interface Message {
  id: string;
  from: string;
  to: string | string[];
  type: 'task' | 'status' | 'decision' | 'error' | 'control' | 'broadcast' | 'queen-only';
  payload: any;
  timestamp: Date;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

/**
 * Swarm Manager - Manages swarm lifecycle and coordination
 */
export class SwarmManager extends EventEmitter {
  private config: any;
  private initialized: boolean = false;
  private swarms: Map<string, Swarm> = new Map();
  private agentRegistry: Map<string, Agent> = new Map();
  private queenRegistry: Map<string, Queen> = new Map();
  private communicationBuses: Map<string, CommunicationBus> = new Map();
  private metricsInterval?: NodeJS.Timeout;

  constructor(config: any) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    this.initialized = true;

    // Start metrics collection
    this.startMetricsCollection();

    // Initialize communication infrastructure
    this.initializeCommunicationInfrastructure();

    console.log('SwarmManager started');
    this.emit('started');
  }

  async stop(): Promise<void> {
    // Stop metrics collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Terminate all swarms gracefully
    const terminationPromises = Array.from(this.swarms.values()).map(swarm =>
      this.destroySwarm(swarm.id)
    );

    await Promise.allSettled(terminationPromises);

    this.initialized = false;
    console.log('SwarmManager stopped');
    this.emit('stopped');
  }

  getStatus(): any {
    const activeSwarms = Array.from(this.swarms.values()).filter(
      swarm => swarm.status === 'active' || swarm.status === 'scaling'
    );

    return {
      initialized: this.initialized,
      maxConcurrent: this.config.maxConcurrent,
      activeSwarms: activeSwarms.length,
      totalSwarms: this.swarms.size,
      totalAgents: this.agentRegistry.size,
      totalQueens: this.queenRegistry.size,
      resourceUsage: this.calculateResourceUsage(),
      performance: {
        averageResponseTime: this.calculateAverageResponseTime(),
        totalTasksProcessed: this.calculateTotalTasksProcessed(),
        successRate: this.calculateSuccessRate(),
        resourceEfficiency: this.calculateResourceEfficiency(),
      },
      swarms: activeSwarms.map(swarm => ({
        id: swarm.id,
        name: swarm.name,
        status: swarm.status,
        agentCount: swarm.agents.length,
        queenType: swarm.queen.type,
        metrics: swarm.metrics,
      })),
    };
  }

  async createSwarm(config: SwarmConfig): Promise<Swarm> {
    if (!this.initialized) {
      throw new Error('SwarmManager not initialized');
    }

    // Check resource limits
    if (this.swarms.size >= this.config.maxConcurrent) {
      throw new Error(`Maximum concurrent swarms limit reached: ${this.config.maxConcurrent}`);
    }

    const swarmId = config.id || uuidv4();
    const queen = await this.createQueen(config.queenType, swarmId);
    const communicationBus = this.createCommunicationBus(swarmId);

    const swarm: Swarm = {
      id: swarmId,
      name: config.name,
      objective: config.objective,
      queen,
      agents: [],
      status: 'initializing',
      createdAt: new Date(),
      lastActivity: new Date(),
      config,
      metrics: this.initializeSwarmMetrics(),
      communicationBus,
    };

    this.swarms.set(swarmId, swarm);
    this.queenRegistry.set(queen.id, queen);
    this.communicationBuses.set(swarmId, communicationBus);

    // Initialize with minimum agents
    const minAgents = config.minAgents || 2;
    for (let i = 0; i < minAgents; i++) {
      await this.addAgentToSwarm(swarmId, 'worker', `Worker ${i + 1}`);
    }

    swarm.status = 'active';
    this.emit('swarm-created', { swarmId, swarm });

    console.log(`Swarm created: ${swarmId} (${config.name})`);
    return swarm;
  }

  async destroySwarm(swarmId: string): Promise<void> {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      throw new Error(`Swarm not found: ${swarmId}`);
    }

    swarm.status = 'terminating';

    // Remove all agents
    const agentRemovalPromises = swarm.agents.map(agent =>
      this.removeAgentFromSwarm(swarmId, agent.id)
    );
    await Promise.allSettled(agentRemovalPromises);

    // Clean up resources
    this.swarms.delete(swarmId);
    this.queenRegistry.delete(swarm.queen.id);
    this.communicationBuses.delete(swarmId);

    this.emit('swarm-destroyed', { swarmId });
    console.log(`Swarm destroyed: ${swarmId}`);
  }

  async addAgentToSwarm(swarmId: string, type: string, role: string): Promise<Agent> {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      throw new Error(`Swarm not found: ${swarmId}`);
    }

    // Check agent limits
    if (swarm.agents.length >= swarm.config.maxAgents) {
      throw new Error(`Maximum agents limit reached for swarm ${swarmId}: ${swarm.config.maxAgents}`);
    }

    const agent: Agent = {
      id: uuidv4(),
      type,
      role,
      capabilities: this.getAgentCapabilities(type),
      status: 'active',
      swarmId,
      queenId: swarm.queen.id,
      performance: {
        tasksCompleted: 0,
        averageExecutionTime: 0,
        successRate: 1.0,
        errorRate: 0.0,
        lastActivity: new Date(),
      },
      createdAt: new Date(),
    };

    swarm.agents.push(agent);
    this.agentRegistry.set(agent.id, agent);

    this.emit('agent-added', { swarmId, agentId: agent.id, agent });
    console.log(`Agent added to swarm ${swarmId}: ${agent.id} (${role})`);

    return agent;
  }

  async removeAgentFromSwarm(swarmId: string, agentId: string): Promise<void> {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      throw new Error(`Swarm not found: ${swarmId}`);
    }

    const agentIndex = swarm.agents.findIndex(agent => agent.id === agentId);
    if (agentIndex === -1) {
      throw new Error(`Agent not found in swarm: ${agentId}`);
    }

    const agent = swarm.agents[agentIndex];
    swarm.agents.splice(agentIndex, 1);
    this.agentRegistry.delete(agentId);

    this.emit('agent-removed', { swarmId, agentId });
    console.log(`Agent removed from swarm ${swarmId}: ${agentId}`);
  }

  async scaleSwarm(swarmId: string, targetAgentCount: number): Promise<void> {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      throw new Error(`Swarm not found: ${swarmId}`);
    }

    const currentCount = swarm.agents.length;
    const difference = targetAgentCount - currentCount;

    if (difference === 0) {
      return; // Already at target
    }

    swarm.status = 'scaling';

    try {
      if (difference > 0) {
        // Scale up
        for (let i = 0; i < difference; i++) {
          await this.addAgentToSwarm(swarmId, 'worker', `Scaled Worker ${currentCount + i + 1}`);
        }
      } else {
        // Scale down (remove least active agents)
        const agentsToRemove = swarm.agents
          .sort((a, b) => b.performance.lastActivity.getTime() - a.performance.lastActivity.getTime())
          .slice(0, Math.abs(difference));

        for (const agent of agentsToRemove) {
          await this.removeAgentFromSwarm(swarmId, agent.id);
        }
      }

      swarm.status = 'active';
      this.emit('swarm-scaled', { swarmId, from: currentCount, to: targetAgentCount });

    } catch (error) {
      swarm.status = 'error';
      throw error;
    }
  }

  async sendMessage(swarmId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<void> {
    const bus = this.communicationBuses.get(swarmId);
    if (!bus) {
      throw new Error(`Communication bus not found for swarm: ${swarmId}`);
    }

    const fullMessage: Message = {
      ...message,
      id: uuidv4(),
      timestamp: new Date(),
    };

    // Route message based on type
    if (message.type === 'broadcast') {
      // Send to all agents in swarm
      const swarm = this.swarms.get(swarmId);
      if (swarm) {
        swarm.agents.forEach(agent => {
          this.routeMessageToAgent(agent.id, fullMessage);
        });
      }
    } else if (message.type === 'queen-only') {
      // Send to queen only
      this.routeMessageToQueen(swarmId, fullMessage);
    } else {
      // Direct message
      this.routeDirectMessage(fullMessage);
    }

    // Store in message history
    const channel = bus.channels.get(message.type) || this.createChannel(bus, message.type);
    channel.messageHistory.push(fullMessage);

    // Keep only recent messages
    if (channel.messageHistory.length > 1000) {
      channel.messageHistory = channel.messageHistory.slice(-500);
    }

    this.emit('message-sent', { swarmId, message: fullMessage });
  }

  getSwarm(swarmId: string): Swarm | undefined {
    return this.swarms.get(swarmId);
  }

  getAllSwarms(): Swarm[] {
    return Array.from(this.swarms.values());
  }

  getSwarmAgents(swarmId: string): Agent[] {
    const swarm = this.swarms.get(swarmId);
    return swarm ? swarm.agents : [];
  }

  private async createQueen(type: string, swarmId: string): Promise<Queen> {
    const queen: Queen = {
      id: uuidv4(),
      type: type as any,
      status: 'active',
      capabilities: this.getQueenCapabilities(type),
      loadFactor: 0.0,
      decisionHistory: [],
    };

    return queen;
  }

  private createCommunicationBus(swarmId: string): CommunicationBus {
    const bus: CommunicationBus = {
      id: uuidv4(),
      channels: new Map(),
      subscribers: new Map(),
    };

    // Create default channels
    ['task', 'status', 'decision', 'error', 'control'].forEach(type => {
      this.createChannel(bus, type);
    });

    return bus;
  }

  private createChannel(bus: CommunicationBus, type: string): CommunicationChannel {
    const channel: CommunicationChannel = {
      id: uuidv4(),
      type: type as any,
      subscribers: [],
      messageHistory: [],
    };

    bus.channels.set(type, channel);
    return channel;
  }

  private initializeSwarmMetrics(): SwarmMetrics {
    return {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageResponseTime: 0,
      resourceUsage: {
        memory: 0,
        cpu: 0,
        network: 0,
      },
      agentUtilization: 0,
      queenLoad: 0,
    };
  }

  private getAgentCapabilities(type: string): string[] {
    const capabilities: Record<string, string[]> = {
      worker: ['task-execution', 'data-processing', 'communication'],
      specialist: ['domain-expertise', 'analysis', 'problem-solving'],
      coordinator: ['task-distribution', 'resource-management', 'monitoring'],
      researcher: ['information-gathering', 'synthesis', 'validation'],
    };

    return capabilities[type] || ['general'];
  }

  private getQueenCapabilities(type: string): string[] {
    const capabilities: Record<string, string[]> = {
      strategic: ['long-term-planning', 'resource-allocation', 'goal-setting'],
      tactical: ['real-time-coordination', 'conflict-resolution', 'optimization'],
      operational: ['task-execution', 'performance-monitoring', 'quality-control'],
      adaptive: ['learning', 'adaptation', 'innovation'],
    };

    return capabilities[type] || ['coordination'];
  }

  private calculateResourceUsage(): any {
    let totalMemory = 0;
    let totalCpu = 0;
    let totalNetwork = 0;

    for (const swarm of this.swarms.values()) {
      totalMemory += swarm.metrics.resourceUsage.memory;
      totalCpu += swarm.metrics.resourceUsage.cpu;
      totalNetwork += swarm.metrics.resourceUsage.network;
    }

    return {
      memory: totalMemory,
      cpu: totalCpu,
      network: totalNetwork,
      swarmCount: this.swarms.size,
      agentCount: this.agentRegistry.size,
    };
  }

  private calculateAverageResponseTime(): number {
    let totalTime = 0;
    let count = 0;

    for (const swarm of this.swarms.values()) {
      if (swarm.metrics.averageResponseTime > 0) {
        totalTime += swarm.metrics.averageResponseTime;
        count++;
      }
    }

    return count > 0 ? totalTime / count : 0;
  }

  private calculateTotalTasksProcessed(): number {
    return Array.from(this.swarms.values()).reduce(
      (total, swarm) => total + swarm.metrics.totalTasks,
      0
    );
  }

  private calculateSuccessRate(): number {
    const totalTasks = this.calculateTotalTasksProcessed();
    const completedTasks = Array.from(this.swarms.values()).reduce(
      (total, swarm) => total + swarm.metrics.completedTasks,
      0
    );

    return totalTasks > 0 ? completedTasks / totalTasks : 1.0;
  }

  private calculateResourceEfficiency(): number {
    const resourceUsage = this.calculateResourceUsage();
    const totalTasks = this.calculateTotalTasksProcessed();

    if (totalTasks === 0) return 1.0;

    // Simple efficiency calculation: tasks per unit resource
    const resourceScore = resourceUsage.memory + resourceUsage.cpu + resourceUsage.network;
    return totalTasks / Math.max(resourceScore, 1);
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, this.config.metricsInterval || 60000);
  }

  private updateMetrics(): void {
    for (const swarm of this.swarms.values()) {
      // Update swarm metrics
      swarm.metrics.agentUtilization = swarm.agents.filter(a => a.status === 'busy').length / swarm.agents.length;
      swarm.metrics.queenLoad = swarm.queen.loadFactor;

      // Update resource usage (simplified)
      swarm.metrics.resourceUsage.memory = swarm.agents.length * 50; // MB per agent
      swarm.metrics.resourceUsage.cpu = swarm.metrics.agentUtilization * 100; // Percentage
    }

    this.emit('metrics-updated', { timestamp: new Date() });
  }

  private initializeCommunicationInfrastructure(): void {
    // Set up inter-swarm communication channels
    console.log('Communication infrastructure initialized');
  }

  private routeMessageToAgent(agentId: string, message: Message): void {
    // Route message to specific agent
    const agent = this.agentRegistry.get(agentId);
    if (agent) {
      this.emit('message-received', { agentId, message });
    }
  }

  private routeMessageToQueen(swarmId: string, message: Message): void {
    // Route message to swarm queen
    const swarm = this.swarms.get(swarmId);
    if (swarm) {
      this.emit('queen-message-received', { swarmId, queenId: swarm.queen.id, message });
    }
  }

  private routeDirectMessage(message: Message): void {
    // Route direct message to specific recipient(s)
    if (Array.isArray(message.to)) {
      message.to.forEach(recipient => {
        this.emit('direct-message-received', { recipient, message });
      });
    } else {
      this.emit('direct-message-received', { recipient: message.to, message });
    }
  }
}
