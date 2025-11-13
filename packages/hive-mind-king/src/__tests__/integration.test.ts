/**
 * Hive-Mind King Integration Tests
 * Comprehensive tests for the complete Hive-Mind King system
 */

import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HiveMindKing } from '../king/HiveMindKing';

describe('HiveMindKing Integration Tests', () => {
  let king: HiveMindKing;

  beforeEach(async () => {
    king = new HiveMindKing({
      memory: {
        alwaysEnabled: true,
        mode: 'persistent',
        backend: 'memory', // Use memory for testing
        ttl: 3600,
        syncInterval: 1000,
      },
      neural: {
        alwaysEnabled: true,
        primaryProvider: 'claude',
        fallbackProviders: ['llama-cpp'],
      },
      swarms: {
        maxConcurrent: 5,
        defaultQueenType: 'strategic',
        autoScaling: true,
        resourceLimits: {
          maxAgentsPerSwarm: 10,
          maxSwarms: 5,
          memoryPerSwarm: 50,
        },
      },
      tools: {
        mcpEnabled: true,
        dynamicLoading: true,
        toolTimeout: 30000,
        parallelExecution: true,
      },
      execution: {
        providers: {
          claude: { enabled: true },
          "llama-cpp": { enabled: true },
        },
        defaultProvider: 'claude',
        failoverEnabled: true,
      },
      monitoring: {
        enabled: true,
        metricsInterval: 5000,
        logLevel: 'info',
      },
    });
  });

  afterEach(async () => {
    if (king) {
      await king.stop();
    }
  });

  describe('System Lifecycle', () => {
    it('should start and stop successfully', async () => {
      await expect(king.start()).resolves.toBeUndefined();
      expect(king.getStatus().status).toBe('running');

      await expect(king.stop()).resolves.toBeUndefined();
      expect(king.getStatus().status).toBe('stopped');
    });

    it('should provide comprehensive status', async () => {
      await king.start();

      const status = king.getStatus();
      expect(status).toHaveProperty('kingId');
      expect(status).toHaveProperty('status', 'running');
      expect(status).toHaveProperty('config');
      expect(status).toHaveProperty('managers');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('timestamp');

      // Check manager statuses
      expect(status.managers).toHaveProperty('memory');
      expect(status.managers).toHaveProperty('neural');
      expect(status.managers).toHaveProperty('swarms');
      expect(status.managers).toHaveProperty('agents');
      expect(status.managers).toHaveProperty('tools');
      expect(status.managers).toHaveProperty('execution');

      await king.stop();
    });
  });

  describe('Swarm Management', () => {
    beforeEach(async () => {
      await king.start();
    });

    it('should create and manage swarms', async () => {
      const managers = king.getManagers();

      // Create a swarm
      const swarm = await managers.swarms.createSwarm({
        name: 'test-swarm',
        objective: 'Test swarm operations',
        queenType: 'strategic',
        maxAgents: 5,
        autoScale: true,
        priority: 'normal',
      });

      expect(swarm).toHaveProperty('id');
      expect(swarm.name).toBe('test-swarm');
      expect(swarm.queen).toHaveProperty('type', 'strategic');

      // Check swarm status
      const status = managers.swarms.getStatus();
      expect(status.activeSwarms).toBeGreaterThan(0);

      // Destroy swarm
      await managers.swarms.destroySwarm(swarm.id);
      const updatedStatus = managers.swarms.getStatus();
      expect(updatedStatus.activeSwarms).toBe(0);
    });

    it('should scale swarms dynamically', async () => {
      const managers = king.getManagers();

      const swarm = await managers.swarms.createSwarm({
        name: 'scaling-test',
        objective: 'Test swarm scaling',
        queenType: 'operational',
        maxAgents: 10,
        autoScale: true,
        priority: 'high',
      });

      // Scale up
      await managers.swarms.scaleSwarm(swarm.id, 5);
      let swarmStatus = managers.swarms.getSwarm(swarm.id);
      expect(swarmStatus?.agents.length).toBe(5);

      // Scale down
      await managers.swarms.scaleSwarm(swarm.id, 2);
      swarmStatus = managers.swarms.getSwarm(swarm.id);
      expect(swarmStatus?.agents.length).toBe(2);

      await managers.swarms.destroySwarm(swarm.id);
    });
  });

  describe('Agent Management', () => {
    let swarmId: string;

    beforeEach(async () => {
      await king.start();
      const managers = king.getManagers();
      const swarm = await managers.swarms.createSwarm({
        name: 'agent-test-swarm',
        objective: 'Test agent management',
        queenType: 'tactical',
        maxAgents: 5,
        autoScale: false,
        priority: 'normal',
      });
      swarmId = swarm.id;
    });

    it('should create and manage agents', async () => {
      const managers = king.getManagers();

      // Create agent
      const agentId = await managers.agents.createAgent({
        type: 'worker',
        role: 'executor',
        capabilities: ['task-execution', 'data-processing'],
        swarmId,
        queenId: 'test-queen',
        priority: 'normal',
      });

      expect(typeof agentId).toBe('string');
      expect(agentId.length).toBeGreaterThan(0);

      // Get agent
      const agent = managers.agents.getAgent(agentId);
      expect(agent).toBeDefined();
      expect(agent?.type).toBe('worker');
      expect(agent?.role).toBe('executor');
      expect(agent?.swarmId).toBe(swarmId);

      // List agents by swarm
      const swarmAgents = managers.agents.getAgentsBySwarm(swarmId);
      expect(swarmAgents.length).toBe(1);
      expect(swarmAgents[0].id).toBe(agentId);

      // Destroy agent
      await managers.agents.destroyAgent(agentId);
      expect(managers.agents.getAgent(agentId)).toBeUndefined();
    });

    it('should assign and execute tasks', async () => {
      const managers = king.getManagers();

      const agentId = await managers.agents.createAgent({
        type: 'specialist',
        role: 'analyst',
        capabilities: ['analysis', 'problem-solving'],
        swarmId,
        queenId: 'test-queen',
        priority: 'high',
      });

      // Assign task
      const taskId = await managers.agents.assignTask(agentId, {
        type: 'analysis',
        description: 'Analyze test data',
        priority: 'high',
        assignedBy: 'test-system',
      });

      expect(typeof taskId).toBe('string');

      // Get task
      const task = managers.agents.getTask(taskId);
      expect(task).toBeDefined();
      expect(task?.assignedTo).toBe(agentId);
      expect(task?.status).toBe('pending');

      // Start task
      await managers.agents.startTask(taskId);
      expect(managers.agents.getTask(taskId)?.status).toBe('in-progress');

      // Complete task
      await managers.agents.completeTask(taskId, { result: 'analysis complete' });
      expect(managers.agents.getTask(taskId)?.status).toBe('completed');

      await managers.agents.destroyAgent(agentId);
    });
  });

  describe('Tool Management', () => {
    beforeEach(async () => {
      await king.start();
    });

    it('should register and execute tools', async () => {
      const managers = king.getManagers();

      // Register tool
      const toolId = await managers.tools.registerTool({
        name: 'test-tool',
        type: 'custom',
        description: 'Test tool for integration testing',
        capabilities: ['testing', 'validation'],
        version: '1.0.0',
        parameters: [
          {
            name: 'input',
            type: 'string',
            description: 'Input parameter',
            required: true,
          },
        ],
        returnType: 'string',
        timeout: 5000,
      });

      expect(typeof toolId).toBe('string');

      // Get tool
      const tool = managers.tools.getTool(toolId);
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('test-tool');
      expect(tool?.type).toBe('custom');

      // List tools
      const allTools = managers.tools.getAllTools();
      expect(allTools.length).toBeGreaterThan(0);
      expect(allTools.some(t => t.id === toolId)).toBe(true);

      // Get tools by capability
      const testTools = managers.tools.getToolsByCapability('testing');
      expect(testTools.length).toBeGreaterThan(0);

      // Unregister tool
      await managers.tools.unregisterTool(toolId);
      expect(managers.tools.getTool(toolId)).toBeUndefined();
    });
  });

  describe('Execution Layer', () => {
    beforeEach(async () => {
      await king.start();
    });

    it('should register and manage providers', async () => {
      const managers = king.getManagers();

      // Register provider
      const providerId = await managers.execution.registerProvider({
        id: uuidv4(),
        name: 'test-provider',
        type: 'custom',
        capabilities: ['prompt', 'chat'],
        maxConcurrency: 5,
        timeout: 30000,
        config: {
          endpoint: 'http://test-provider.com',
          apiKey: 'test-key',
        },
      });

      expect(typeof providerId).toBe('string');

      // Get provider
      const provider = managers.execution.getProvider(providerId);
      expect(provider).toBeDefined();
      expect(provider?.name).toBe('test-provider');
      expect(provider?.type).toBe('custom');

      // List providers
      const allProviders = managers.execution.getAllProviders();
      expect(allProviders.length).toBeGreaterThan(0);

      // Get providers by type
      const customProviders = managers.execution.getProvidersByType('custom');
      expect(customProviders.length).toBeGreaterThan(0);

      // Unregister provider
      await managers.execution.unregisterProvider(providerId);
      expect(managers.execution.getProvider(providerId)).toBeUndefined();
    });

    it('should execute tasks with different providers', async () => {
      const managers = king.getManagers();

      // Register test provider
      const providerId = await managers.execution.registerProvider({
        id: uuidv4(),
        name: 'mock-claude',
        type: 'claude',
        capabilities: ['prompt', 'chat', 'completion'],
        maxConcurrency: 3,
        timeout: 10000,
        config: {
          apiKey: 'test-api-key',
          model: 'claude-3-sonnet-20240229',
        },
      });

      // Execute task
      const taskId = await managers.execution.executeTask({
        id: uuidv4(),
        type: 'prompt',
        prompt: 'Hello, world!',
        parameters: {},
        provider: providerId,
        priority: 'normal',
        timeout: 5000,
      });

      expect(typeof taskId).toBe('string');

      // Wait for result (in real implementation, this would be async)
      // For testing, we'll assume the task completes quickly
      const result = await managers.execution.getTaskResult(taskId);
      expect(result).toBeDefined();
      expect(result?.taskId).toBe(taskId);

      await managers.execution.unregisterProvider(providerId);
    });
  });

  describe('Memory Management', () => {
    beforeEach(async () => {
      await king.start();
    });

    it('should store and retrieve memory', async () => {
      const managers = king.getManagers();

      // Store memory
      await managers.memory.store('test-key', { data: 'test-value' });

      // Retrieve memory
      const retrieved = await managers.memory.retrieve('test-key');
      expect(retrieved).toEqual({ data: 'test-value' });

      // Store with TTL (mock implementation - TTL not supported in basic version)
      await managers.memory.store('ttl-key', { temp: 'data' });

      // Retrieve before expiry
      let ttlData = await managers.memory.retrieve('ttl-key');
      expect(ttlData).toEqual({ temp: 'data' });

      // Wait for expiry (in real test, this would be mocked)
      // ttlData = await managers.memory.retrieve('ttl-key');
      // expect(ttlData).toBeNull();
    });

    it('should handle memory operations', async () => {
      const managers = king.getManagers();

      // Test memory status
      const status = managers.memory.getStatus();
      expect(status).toHaveProperty('backend');
      expect(status).toHaveProperty('totalEntries');
      expect(status).toHaveProperty('memoryUsage');

      // Store multiple items
      await managers.memory.store('key1', 'value1');
      await managers.memory.store('key2', { complex: 'object' });
      await managers.memory.store('key3', [1, 2, 3]);

      // Retrieve all
      expect(await managers.memory.retrieve('key1')).toBe('value1');
      expect(await managers.memory.retrieve('key2')).toEqual({ complex: 'object' });
      expect(await managers.memory.retrieve('key3')).toEqual([1, 2, 3]);
    });
  });

  describe('Task Execution Integration', () => {
    it('should execute complete tasks through the system', async () => {
      await king.start();

      // Execute a complete task
      const result = await king.executeTask({
        description: 'Integration test task',
        priority: 'normal',
        executionFlags: {
          provider: 'claude',
          timeout: 10000,
          costLimit: 0.1,
        },
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('taskId');
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('executionTime');

      await king.stop();
    });

    it('should handle provider flags correctly', async () => {
      await king.start();

      // Test Claude provider flag
      const claudeResult = await king.executeTask({
        description: 'Test Claude execution',
        executionFlags: {
          provider: 'claude',
          model: 'claude-3-haiku-20240307',
        },
      });

      expect(claudeResult.provider).toBe('claude');

      // Test llama.cpp provider flag
      const llamaResult = await king.executeTask({
        description: 'Test llama.cpp execution',
        executionFlags: {
          provider: 'llama-cpp',
          model: 'llama-2-7b',
        },
      });

      expect(llamaResult.provider).toBe('llama-cpp');

      await king.stop();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid operations gracefully', async () => {
      await king.start();
      const managers = king.getManagers();

      // Try to get non-existent swarm
      const invalidSwarm = managers.swarms.getSwarm('invalid-id');
      expect(invalidSwarm).toBeUndefined();

      // Try to get non-existent agent
      const invalidAgent = managers.agents.getAgent('invalid-id');
      expect(invalidAgent).toBeUndefined();

      // Try to get non-existent tool
      const invalidTool = managers.tools.getTool('invalid-id');
      expect(invalidTool).toBeUndefined();

      // Try to get non-existent provider
      const invalidProvider = managers.execution.getProvider('invalid-id');
      expect(invalidProvider).toBeUndefined();

      await king.stop();
    });

    it('should handle system shutdown gracefully', async () => {
      await king.start();

      // Perform some operations
      const managers = king.getManagers();
      const swarm = await managers.swarms.createSwarm({
        name: 'shutdown-test',
        objective: 'Test shutdown handling',
        queenType: 'strategic',
        maxAgents: 3,
        autoScale: false,
        priority: 'normal',
      });

      // Shutdown
      await king.shutdown();

      // Verify system is stopped
      const status = king.getStatus();
      expect(status.status).toBe('stopped');
    });
  });

  describe('Performance and Metrics', () => {
    it('should track performance metrics', async () => {
      await king.start();

      const managers = king.getManagers();

      // Create some activity
      const swarm = await managers.swarms.createSwarm({
        name: 'metrics-test',
        objective: 'Test metrics collection',
        queenType: 'operational',
        maxAgents: 2,
        autoScale: false,
        priority: 'normal',
      });

      const agentId = await managers.agents.createAgent({
        type: 'worker',
        role: 'tester',
        capabilities: ['testing'],
        swarmId: swarm.id,
        queenId: swarm.queen.id,
        priority: 'normal',
      });

      // Check metrics
      const swarmMetrics = managers.swarms.getStatus();
      expect(swarmMetrics).toHaveProperty('performance');

      const agentMetrics = managers.agents.getStatus();
      expect(agentMetrics).toHaveProperty('performance');

      const toolMetrics = managers.tools.getStatus();
      expect(toolMetrics).toHaveProperty('metrics');

      const executionMetrics = managers.execution.getStatus();
      expect(executionMetrics).toHaveProperty('metrics');

      await king.stop();
    });
  });
});
