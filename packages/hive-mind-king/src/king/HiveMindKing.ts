import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';
import { z } from 'zod';
import { AgentManager } from '../agents/AgentManager';
import { ExecutionLayer } from '../execution/ExecutionLayer';
import { MemoryManager } from '../memory/MemoryManager';
import { NeuralCoordinator } from '../neural/NeuralCoordinator';
import { SwarmManager } from '../swarms/SwarmManager';
import { ToolManager } from '../tools/ToolManager';
import { KingState } from './KingState';

/**
 * Core configuration schema for HiveMindKing
 */
export const HiveMindKingConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  memory: z.object({
    alwaysEnabled: z.boolean().default(true),
    mode: z.enum(['persistent', 'ephemeral', 'hybrid']).default('persistent'),
    backend: z.enum(['sqlite', 'redis', 'memory']).default('sqlite'),
    ttl: z.number().default(86400),
    syncInterval: z.number().default(30000),
  }),
  neural: z.object({
    alwaysEnabled: z.boolean().default(true),
    primaryProvider: z.enum(['claude', 'llama-cpp', 'auto']).default('auto'),
    fallbackProviders: z.array(z.string()).default(['claude', 'llama-cpp']),
    modelConfigs: z.record(z.any()).default({}),
  }),
  swarms: z.object({
    maxConcurrent: z.number().default(10),
    defaultQueenType: z.enum(['strategic', 'tactical', 'operational']).default('strategic'),
    autoScaling: z.boolean().default(true),
    resourceLimits: z.object({
      maxAgentsPerSwarm: z.number().default(50),
      maxSwarms: z.number().default(20),
      memoryPerSwarm: z.number().default(100),
    }),
  }),
  tools: z.object({
    mcpEnabled: z.boolean().default(true),
    dynamicLoading: z.boolean().default(true),
    toolTimeout: z.number().default(60000),
    parallelExecution: z.boolean().default(true),
  }),
  execution: z.object({
    providers: z.record(z.object({
      enabled: z.boolean(),
    }).catchall(z.any())).default({
      claude: { enabled: true },
      llamaCpp: { enabled: true },
    }),
    defaultProvider: z.string().default('auto'),
    failoverEnabled: z.boolean().default(true),
  }),
  monitoring: z.object({
    enabled: z.boolean().default(true),
    metricsInterval: z.number().default(60000),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
});

export type HiveMindKingConfig = z.infer<typeof HiveMindKingConfigSchema>;

/**
 * Main Hive-Mind King orchestrator class
 * Central coordinator for all hive-mind operations
 */
export class HiveMindKing extends EventEmitter {
  public readonly id: string;
  private config: HiveMindKingConfig;
  private state: KingState;
  private logger: Logger;

  // Core managers
  private memoryManager: MemoryManager;
  private neuralCoordinator: NeuralCoordinator;
  private swarmManager: SwarmManager;
  private agentManager: AgentManager;
  private toolManager: ToolManager;
  private executionLayer: ExecutionLayer;

  // Lifecycle state
  private initialized: boolean = false;
  private running: boolean = false;

  constructor(config: Partial<HiveMindKingConfig> = {}, logger?: Logger) {
    super();

    this.id = uuidv4();
    this.config = HiveMindKingConfigSchema.parse(config);
    this.state = new KingState(this.id);
    this.logger = logger || this.createDefaultLogger();

    this.initializeManagers();
  }

  /**
   * Initialize all manager components
   */
  private initializeManagers(): void {
    try {
      // Initialize memory system (always enabled)
      this.memoryManager = new MemoryManager({
        ...this.config.memory,
        kingId: this.id,
      });

      // Initialize neural coordinator (always enabled)
      this.neuralCoordinator = new NeuralCoordinator({
        ...this.config.neural,
        kingId: this.id,
      });

      // Initialize swarm manager
      this.swarmManager = new SwarmManager({
        ...this.config.swarms,
        kingId: this.id,
        memoryManager: this.memoryManager,
        neuralCoordinator: this.neuralCoordinator,
      });

      // Initialize agent manager
      this.agentManager = new AgentManager({
        kingId: this.id,
        swarmManager: this.swarmManager,
        memoryManager: this.memoryManager,
      });

      // Initialize tool manager
      this.toolManager = new ToolManager({
        ...this.config.tools,
        kingId: this.id,
        mcpEnabled: this.config.tools.mcpEnabled,
      });

      // Initialize execution layer
      this.executionLayer = new ExecutionLayer({
        ...this.config.execution,
        kingId: this.id,
        neuralCoordinator: this.neuralCoordinator,
      });

      this.initialized = true;
      this.logger.info('HiveMindKing managers initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize HiveMindKing managers', { error });
      throw error;
    }
  }

  /**
   * Start the Hive-Mind King orchestrator
   */
  async start(): Promise<void> {
    if (!this.initialized) {
      throw new Error('HiveMindKing not initialized');
    }

    if (this.running) {
      this.logger.warn('HiveMindKing already running');
      return;
    }

    try {
      this.logger.info('Starting HiveMindKing orchestrator...');

      // Start all managers
      await Promise.all([
        this.memoryManager.start(),
        this.neuralCoordinator.start(),
        this.swarmManager.start(),
        this.agentManager.start(),
        this.toolManager.start(),
        this.executionLayer.start(),
      ]);

      this.running = true;
      this.state.updateStatus('running');
      this.emit('started', { kingId: this.id, timestamp: new Date() });

      this.logger.info('HiveMindKing orchestrator started successfully');

    } catch (error) {
      this.logger.error('Failed to start HiveMindKing', { error });
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop the Hive-Mind King orchestrator
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      this.logger.info('Stopping HiveMindKing orchestrator...');

      // Stop all managers in reverse order
      await Promise.all([
        this.executionLayer.stop(),
        this.toolManager.stop(),
        this.agentManager.stop(),
        this.swarmManager.stop(),
        this.neuralCoordinator.stop(),
        this.memoryManager.stop(),
      ]);

      this.running = false;
      this.state.updateStatus('stopped');
      this.emit('stopped', { kingId: this.id, timestamp: new Date() });

      this.logger.info('HiveMindKing orchestrator stopped successfully');

    } catch (error) {
      this.logger.error('Error stopping HiveMindKing', { error });
      throw error;
    }
  }

  /**
   * Get current system status
   */
  getStatus(): any {
    return {
      kingId: this.id,
      status: this.state.getStatus().status,
      config: this.config,
      managers: {
        memory: this.memoryManager.getStatus(),
        neural: this.neuralCoordinator.getStatus(),
        swarms: this.swarmManager.getStatus(),
        agents: this.agentManager.getStatus(),
        tools: this.toolManager.getStatus(),
        execution: this.executionLayer.getStatus(),
      },
      uptime: this.state.getUptime(),
      timestamp: new Date(),
    };
  }

  /**
   * Execute a task through the hive-mind system
   */
  async executeTask(task: {
    description: string;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    swarmConfig?: any;
    executionFlags?: Record<string, any>;
  }): Promise<any> {
    if (!this.running) {
      throw new Error('HiveMindKing not running');
    }

    const taskId = uuidv4();
    this.logger.info('Executing task', { taskId, description: task.description });

    try {
      // Create or get appropriate swarm
      const swarm = await this.swarmManager.createSwarm({
        name: `task-${taskId}`,
        objective: task.description,
        config: task.swarmConfig,
      });

      // Execute through execution layer with specified flags
      const result = await this.executionLayer.execute({
        taskId,
        description: task.description,
        priority: task.priority || 'normal',
        swarmId: swarm.id,
        flags: task.executionFlags || {},
      });

      this.logger.info('Task executed successfully', { taskId });
      return result;

    } catch (error) {
      this.logger.error('Task execution failed', { taskId, error });
      throw error;
    }
  }

  /**
   * Get access to core managers for advanced operations
   */
  getManagers() {
    return {
      memory: this.memoryManager,
      neural: this.neuralCoordinator,
      swarms: this.swarmManager,
      agents: this.agentManager,
      tools: this.toolManager,
      execution: this.executionLayer,
    };
  }

  /**
   * Update configuration (requires restart for some changes)
   */
  updateConfig(newConfig: Partial<HiveMindKingConfig>): void {
    this.config = HiveMindKingConfigSchema.parse({ ...this.config, ...newConfig });
    this.logger.info('Configuration updated', { config: this.config });
    this.emit('config-updated', { config: this.config });
  }

  /**
   * Create default logger if none provided
   */
  private createDefaultLogger(): Logger {
    // Basic console logger - in production, this would be more sophisticated
    const winston = require('winston');
    return winston.createLogger({
      level: this.config.monitoring.logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'hive-mind-king', kingId: this.id },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  /**
   * Clean shutdown handler
   */
  async shutdown(): Promise<void> {
    this.logger.info('HiveMindKing shutdown initiated');
    await this.stop();
    this.emit('shutdown', { kingId: this.id, timestamp: new Date() });
  }
}
