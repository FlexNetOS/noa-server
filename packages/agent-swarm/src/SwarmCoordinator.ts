import {
  ClaudeFlowClient,
  AgentType,
  AgentConfig,
  SwarmTopology,
  SwarmConfig,
} from '@noa/claude-flow-integration';
import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';

import { CommunicationManager, Message, MessageType } from './communication';
import { ConsensusManager, ConsensusAlgorithm, ConsensusProposal } from './consensus';

/**
 * Swarm Coordinator
 *
 * Coordinates multiple agents in a swarm, managing communication,
 * consensus, task distribution, and collective intelligence.
 */

export interface SwarmAgent {
  id: string;
  type: AgentType;
  status: 'idle' | 'busy' | 'offline';
  capabilities: string[];
  load: number; // 0-100
  lastActive: number;
  metadata?: Record<string, any>;
}

export interface SwarmTask {
  id: string;
  description: string;
  requiredCapabilities: string[];
  assignedAgents: string[];
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  result?: any;
}

export interface SwarmCoordinatorConfig {
  swarmConfig: SwarmConfig;
  consensusAlgorithm?: ConsensusAlgorithm;
  enableCommunication?: boolean;
  loadBalancing?: 'round-robin' | 'least-loaded' | 'capability-based';
  healthCheckInterval?: number;
  maxAgentLoad?: number;
}

/**
 * Swarm Coordinator class
 */
export class SwarmCoordinator extends EventEmitter {
  private client: ClaudeFlowClient;
  private config: Required<SwarmCoordinatorConfig>;
  private agents: Map<string, SwarmAgent> = new Map();
  private tasks: Map<string, SwarmTask> = new Map();
  private communication: CommunicationManager;
  private consensus: ConsensusManager;
  private sessionId?: string;
  private healthCheckTimer?: NodeJS.Timeout;
  private initialized: boolean = false;

  constructor(client: ClaudeFlowClient, config: SwarmCoordinatorConfig) {
    super();

    this.client = client;
    this.config = {
      swarmConfig: config.swarmConfig,
      consensusAlgorithm: config.consensusAlgorithm || ConsensusAlgorithm.MAJORITY_VOTE,
      enableCommunication: config.enableCommunication ?? true,
      loadBalancing: config.loadBalancing || 'least-loaded',
      healthCheckInterval: config.healthCheckInterval || 30000,
      maxAgentLoad: config.maxAgentLoad || 80,
    };

    // Initialize communication manager
    this.communication = new CommunicationManager();
    this.setupCommunicationHandlers();

    // Initialize consensus manager
    this.consensus = new ConsensusManager({
      algorithm: this.config.consensusAlgorithm,
      minParticipants: 3,
      timeoutMs: 30000,
      quorum: 51,
    });
    this.setupConsensusHandlers();
  }

  /**
   * Initialize the swarm
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize Claude Flow client
    if (!this.client.isInitialized()) {
      await this.client.initialize();
    }

    // Initialize swarm
    const swarmResponse = await this.client.initSwarm(this.config.swarmConfig);
    this.sessionId = swarmResponse.sessionId;

    // Start health checks
    this.startHealthChecks();

    this.initialized = true;
    this.emit('swarm.initialized', {
      sessionId: this.sessionId,
      topology: this.config.swarmConfig.topology,
      timestamp: Date.now(),
    });
  }

  /**
   * Add agent to swarm
   */
  async addAgent(config: AgentConfig): Promise<SwarmAgent> {
    await this.ensureInitialized();

    // Spawn agent via Claude Flow
    const agentResponse = await this.client.spawnAgent(config);

    // Create swarm agent
    const agent: SwarmAgent = {
      id: agentResponse.agentId,
      type: config.type,
      status: 'idle',
      capabilities: config.capabilities || [],
      load: 0,
      lastActive: Date.now(),
    };

    this.agents.set(agent.id, agent);

    // Register in communication system
    if (this.config.enableCommunication) {
      this.communication.registerAgent(agent.id);
    }

    this.emit('agent.added', agent);

    return agent;
  }

  /**
   * Remove agent from swarm
   */
  async removeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Unregister from communication
    if (this.config.enableCommunication) {
      this.communication.unregisterAgent(agentId);
    }

    // Remove agent
    this.agents.delete(agentId);

    this.emit('agent.removed', { agentId, timestamp: Date.now() });
  }

  /**
   * Assign task to agents
   */
  async assignTask(task: Omit<SwarmTask, 'id' | 'assignedAgents' | 'status'>): Promise<string> {
    await this.ensureInitialized();

    // Find suitable agents
    const suitableAgents = this.findSuitableAgents(task.requiredCapabilities);

    if (suitableAgents.length === 0) {
      throw new Error('No suitable agents available for task');
    }

    // Select agents based on load balancing strategy
    const selectedAgents = this.selectAgents(suitableAgents, 1);

    // Create task
    const swarmTask: SwarmTask = {
      id: uuidv4(),
      description: task.description,
      requiredCapabilities: task.requiredCapabilities,
      assignedAgents: selectedAgents.map((a) => a.id),
      status: 'assigned',
    };

    this.tasks.set(swarmTask.id, swarmTask);

    // Update agent load
    for (const agent of selectedAgents) {
      agent.status = 'busy';
      agent.load = Math.min(100, agent.load + 20);
    }

    this.emit('task.assigned', swarmTask);

    // Notify assigned agents via communication
    if (this.config.enableCommunication) {
      for (const agentId of swarmTask.assignedAgents) {
        this.communication.sendTo('coordinator', agentId, {
          type: 'task-assignment',
          task: swarmTask,
        });
      }
    }

    return swarmTask.id;
  }

  /**
   * Complete task
   */
  async completeTask(taskId: string, result: any): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'completed';
    task.endTime = Date.now();
    task.result = result;

    // Update agent load
    for (const agentId of task.assignedAgents) {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.load = Math.max(0, agent.load - 20);
        if (agent.load === 0) {
          agent.status = 'idle';
        }
      }
    }

    this.emit('task.completed', task);
  }

  /**
   * Propose action for consensus
   */
  async proposeAction(description: string, value: any, proposerId: string): Promise<string> {
    const proposal: ConsensusProposal = {
      id: uuidv4(),
      proposer: proposerId,
      value,
      timestamp: Date.now(),
      metadata: { description },
    };

    this.consensus.propose(proposal);

    // Broadcast proposal to all agents
    if (this.config.enableCommunication) {
      this.communication.broadcast('coordinator', {
        type: 'consensus-proposal',
        proposal,
      });
    }

    return proposal.id;
  }

  /**
   * Vote on proposal
   */
  async vote(
    proposalId: string,
    agentId: string,
    approve: boolean,
    reasoning?: string
  ): Promise<void> {
    this.consensus.vote({
      proposalId,
      voter: agentId,
      approve,
      timestamp: Date.now(),
      reasoning,
    });
  }

  /**
   * Wait for consensus result
   */
  async waitForConsensus(proposalId: string, timeoutMs?: number): Promise<any> {
    const result = await this.consensus.waitForResult(proposalId, timeoutMs);
    return result.approved ? result.finalValue : null;
  }

  /**
   * Broadcast message to all agents
   */
  broadcast(from: string, payload: any): void {
    if (!this.config.enableCommunication) {
      throw new Error('Communication is disabled');
    }
    this.communication.broadcast(from, payload);
  }

  /**
   * Send message to specific agent
   */
  sendMessage(from: string, to: string, payload: any): void {
    if (!this.config.enableCommunication) {
      throw new Error('Communication is disabled');
    }
    this.communication.sendTo(from, to, payload);
  }

  /**
   * Request-response pattern
   */
  async request(from: string, to: string, payload: any, timeoutMs?: number): Promise<any> {
    if (!this.config.enableCommunication) {
      throw new Error('Communication is disabled');
    }
    return this.communication.request(from, to, payload, timeoutMs);
  }

  /**
   * Get swarm statistics
   */
  getStatistics() {
    const activeAgents = Array.from(this.agents.values()).filter((a) => a.status !== 'offline');
    const busyAgents = activeAgents.filter((a) => a.status === 'busy');
    const idleAgents = activeAgents.filter((a) => a.status === 'idle');

    const activeTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === 'assigned' || t.status === 'in-progress'
    );
    const completedTasks = Array.from(this.tasks.values()).filter((t) => t.status === 'completed');

    const avgLoad =
      activeAgents.length > 0
        ? activeAgents.reduce((sum, a) => sum + a.load, 0) / activeAgents.length
        : 0;

    return {
      sessionId: this.sessionId,
      topology: this.config.swarmConfig.topology,
      totalAgents: this.agents.size,
      activeAgents: activeAgents.length,
      busyAgents: busyAgents.length,
      idleAgents: idleAgents.length,
      averageLoad: avgLoad,
      activeTasks: activeTasks.length,
      completedTasks: completedTasks.length,
      totalTasks: this.tasks.size,
      communication: this.communication.getStatistics(),
    };
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): SwarmAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAgents(): SwarmAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): SwarmTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getTasks(): SwarmTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Shutdown swarm
   */
  async shutdown(): Promise<void> {
    // Stop health checks
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Shutdown Claude Flow swarm
    if (this.sessionId) {
      await this.client.shutdownSwarm(this.sessionId);
    }

    // Clear all agents and tasks
    this.agents.clear();
    this.tasks.clear();

    this.initialized = false;
    this.emit('swarm.shutdown', { timestamp: Date.now() });
  }

  /**
   * Find suitable agents for task
   */
  private findSuitableAgents(requiredCapabilities: string[]): SwarmAgent[] {
    const suitable: SwarmAgent[] = [];

    for (const agent of this.agents.values()) {
      if (agent.status === 'offline') {
        continue;
      }

      if (agent.load >= this.config.maxAgentLoad) {
        continue;
      }

      // Check if agent has required capabilities
      const hasCapabilities = requiredCapabilities.every((cap) => agent.capabilities.includes(cap));

      if (hasCapabilities) {
        suitable.push(agent);
      }
    }

    return suitable;
  }

  /**
   * Select agents based on load balancing strategy
   */
  private selectAgents(candidates: SwarmAgent[], count: number): SwarmAgent[] {
    if (candidates.length === 0) {
      return [];
    }

    switch (this.config.loadBalancing) {
      case 'round-robin':
        // Simple round-robin selection
        return candidates.slice(0, count);

      case 'least-loaded':
        // Sort by load and select least loaded
        const sorted = [...candidates].sort((a, b) => a.load - b.load);
        return sorted.slice(0, count);

      case 'capability-based':
        // Prefer agents with more capabilities
        const byCapabilities = [...candidates].sort(
          (a, b) => b.capabilities.length - a.capabilities.length
        );
        return byCapabilities.slice(0, count);

      default:
        return candidates.slice(0, count);
    }
  }

  /**
   * Setup communication event handlers
   */
  private setupCommunicationHandlers(): void {
    this.communication.on('message.received', (message: Message, recipientId: string) => {
      this.emit('agent.message', { message, recipientId });
    });

    this.communication.on('agent.registered', (event) => {
      this.emit('communication.agent.registered', event);
    });
  }

  /**
   * Setup consensus event handlers
   */
  private setupConsensusHandlers(): void {
    this.consensus.on('proposal.created', (proposal) => {
      this.emit('consensus.proposal', proposal);
    });

    this.consensus.on('vote.cast', (vote) => {
      this.emit('consensus.vote', vote);
    });

    this.consensus.on('proposal.resolved', (result) => {
      this.emit('consensus.result', result);
    });
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on all agents
   */
  private performHealthCheck(): void {
    const now = Date.now();
    const timeout = 60000; // 1 minute

    for (const agent of this.agents.values()) {
      if (now - agent.lastActive > timeout) {
        agent.status = 'offline';
        this.emit('agent.timeout', { agentId: agent.id, timestamp: now });
      }
    }
  }

  /**
   * Ensure swarm is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get communication manager
   */
  getCommunicationManager(): CommunicationManager {
    return this.communication;
  }

  /**
   * Get consensus manager
   */
  getConsensusManager(): ConsensusManager {
    return this.consensus;
  }
}
