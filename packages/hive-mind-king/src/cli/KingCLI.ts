#!/usr/bin/env node
/**
 * Hive-Mind King CLI Interface
 * Command-line interface for managing the Hive-Mind King system
 */

import { Command } from 'commander';
import { HiveMindKing } from '../king/HiveMindKing';

export class KingCLI {
  private program: Command;
  private king: HiveMindKing | null = null;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  /**
   * Setup CLI commands
   */
  private setupCommands(): void {
    this.program
      .name('hive-king')
      .description('Hive-Mind King - Distributed AI Agent Orchestrator')
      .version('1.0.0');

    // Start command
    this.program
      .command('start')
      .description('Start the Hive-Mind King orchestrator')
      .action(async () => {
        try {
          this.king = new HiveMindKing();
          await this.king.start();
          console.log('✅ Hive-Mind King started successfully');
        } catch (error) {
          console.error('❌ Failed to start Hive-Mind King:', error);
          process.exit(1);
        }
      });

    // Stop command
    this.program
      .command('stop')
      .description('Stop the Hive-Mind King orchestrator')
      .action(async () => {
        try {
          if (this.king) {
            await this.king.stop();
            console.log('✅ Hive-Mind King stopped successfully');
          } else {
            console.log('⚠️  Hive-Mind King not running');
          }
        } catch (error) {
          console.error('❌ Failed to stop Hive-Mind King:', error);
          process.exit(1);
        }
      });

    // Status command
    this.program
      .command('status')
      .description('Show Hive-Mind King status')
      .action(() => {
        if (this.king) {
          const status = this.king.getStatus();
          console.log(JSON.stringify(status, null, 2));
        } else {
          console.log('⚠️  Hive-Mind King not initialized');
        }
      });

    // Swarm management commands
    const swarmCmd = this.program
      .command('swarm')
      .description('Swarm management commands');

    swarmCmd
      .command('create <name>')
      .description('Create a new swarm')
      .option('-q, --queen-type <type>', 'Queen type (strategic, tactical, operational)', 'strategic')
      .option('-m, --max-agents <number>', 'Maximum agents', '20')
      .option('-o, --objective <text>', 'Swarm objective')
      .action(async (name, options) => {
        if (!this.king) {
          console.error('❌ Hive-Mind King not running');
          return;
        }

        try {
          const managers = this.king.getManagers();
          const swarm = await managers.swarms.createSwarm({
            name,
            objective: options.objective || `Swarm ${name}`,
            queenType: options.queenType,
            maxAgents: parseInt(options.maxAgents),
          });
          console.log(`✅ Swarm created: ${swarm.id} (${swarm.name})`);
          console.log(`   Queen: ${swarm.queen.id} (${swarm.queen.type})`);
        } catch (error) {
          console.error('❌ Failed to create swarm:', error);
        }
      });

    swarmCmd
      .command('list')
      .description('List active swarms')
      .action(() => {
        if (!this.king) {
          console.error('❌ Hive-Mind King not running');
          return;
        }

        const managers = this.king.getManagers();
        const status = managers.swarms.getStatus();
        console.log(`Active swarms: ${status.activeSwarms || 0}`);

        if (status.swarms && status.swarms.length > 0) {
          console.log('\nSwarm Details:');
          status.swarms.forEach((swarm: any) => {
            console.log(`  ${swarm.id}: ${swarm.name} (${swarm.status})`);
            console.log(`    Agents: ${swarm.agentCount || 0}, Queen: ${swarm.queen?.type || 'none'}`);
          });
        }
      });

    swarmCmd
      .command('destroy <swarmId>')
      .description('Destroy a swarm')
      .action(async (swarmId) => {
        if (!this.king) {
          console.error('❌ Hive-Mind King not running');
          return;
        }

        try {
          const managers = this.king.getManagers();
          await managers.swarms.destroySwarm(swarmId);
          console.log(`✅ Swarm destroyed: ${swarmId}`);
        } catch (error) {
          console.error('❌ Failed to destroy swarm:', error);
        }
      });

    swarmCmd
      .command('scale <swarmId> <agents>')
      .description('Scale swarm to specified number of agents')
      .action(async (swarmId, agents) => {
        if (!this.king) {
          console.error('❌ Hive-Mind King not running');
          return;
        }

        try {
          const managers = this.king.getManagers();
          await managers.swarms.scaleSwarm(swarmId, parseInt(agents));
          console.log(`✅ Swarm scaled: ${swarmId} to ${agents} agents`);
        } catch (error) {
          console.error('❌ Failed to scale swarm:', error);
        }
      });

    // Agent management commands
    const agentCmd = this.program
      .command('agent')
      .description('Agent management commands');

    agentCmd
      .command('add <swarmId> <type>')
      .description('Add agent to swarm')
      .option('-r, --role <role>', 'Agent role', 'worker')
      .option('-c, --capabilities <caps>', 'Comma-separated capabilities', 'task-execution')
      .action(async (swarmId, type, options) => {
        if (!this.king) {
          console.error('❌ Hive-Mind King not running');
          return;
        }

        try {
          const managers = this.king.getManagers();
          const agent = await managers.agents.createAgent({
            type,
            role: options.role,
            capabilities: options.capabilities.split(','),
            swarmId,
            priority: 'normal',
          });

          await managers.swarms.addAgentToSwarm(swarmId, agent);
          console.log(`✅ Agent added to swarm ${swarmId}: ${agent} (${type})`);
        } catch (error) {
          console.error('❌ Failed to add agent:', error);
        }
      });

    agentCmd
      .command('remove <agentId>')
      .description('Remove agent from swarm')
      .action(async (agentId) => {
        if (!this.king) {
          console.error('❌ Hive-Mind King not running');
          return;
        }

        try {
          const managers = this.king.getManagers();
          await managers.agents.destroyAgent(agentId);
          console.log(`✅ Agent removed: ${agentId}`);
        } catch (error) {
          console.error('❌ Failed to remove agent:', error);
        }
      });

    agentCmd
      .command('list [swarmId]')
      .description('List agents (optionally for specific swarm)')
      .action((swarmId) => {
        if (!this.king) {
          console.error('❌ Hive-Mind King not running');
          return;
        }

        const managers = this.king.getManagers();
        const agents = swarmId
          ? managers.agents.getAgentsBySwarm(swarmId)
          : managers.agents.getAllAgents();

        console.log(`Agents${swarmId ? ` in swarm ${swarmId}` : ''}: ${agents.length}`);

        if (agents.length > 0) {
          console.log('\nAgent Details:');
          agents.forEach((agent: any) => {
            console.log(`  ${agent.id}: ${agent.type} (${agent.role}) - ${agent.performance.tasksCompleted} tasks`);
          });
        }
      });

    // Tool management commands
    const toolCmd = this.program
      .command('tool')
      .description('Tool management commands');

    toolCmd
      .command('register <name> <type>')
      .description('Register a new tool')
      .option('-d, --description <text>', 'Tool description')
      .option('-c, --capabilities <caps>', 'Comma-separated capabilities')
      .action(async (name, type, options) => {
        if (!this.king) {
          console.error('❌ Hive-Mind King not running');
          return;
        }

        try {
          const managers = this.king.getManagers();
          const tool = await managers.tools.registerTool({
            name,
            type: type as 'mcp' | 'native' | 'external' | 'custom',
            description: options.description || `Tool ${name}`,
            capabilities: options.capabilities ? options.capabilities.split(',') : [],
            version: '1.0.0',
            parameters: [],
            returnType: 'any',
          });
          console.log(`✅ Tool registered: ${tool} (${name})`);
        } catch (error) {
          console.error('❌ Failed to register tool:', error);
        }
      });

    toolCmd
      .command('list')
      .description('List registered tools')
      .action(() => {
        if (!this.king) {
          console.error('❌ Hive-Mind King not running');
          return;
        }

        const managers = this.king.getManagers();
        const tools = managers.tools.getAllTools();
        console.log(`Registered tools: ${tools.length}`);

        if (tools.length > 0) {
          console.log('\nTool Details:');
          tools.forEach((tool: any) => {
            console.log(`  ${tool.id}: ${tool.name} (${tool.type}) - ${tool.metrics.totalExecutions} executions`);
          });
        }
      });

    // Execute command with provider flags
    this.program
      .command('execute <task>')
      .description('Execute a task through the hive-mind')
      .option('--claude', 'Use Claude provider')
      .option('--llama-cpp', 'Use llama.cpp provider')
      .option('--provider <provider>', 'Specify provider (claude, llama-cpp, openai, custom)')
      .option('--model <model>', 'Specify model')
      .option('--priority <level>', 'Task priority (low, normal, high, critical)', 'normal')
      .option('--timeout <ms>', 'Execution timeout in milliseconds', '30000')
      .option('--cost-limit <amount>', 'Maximum cost limit', '1.0')
      .action(async (task, options) => {
        if (!this.king) {
          console.error('❌ Hive-Mind King not running');
          return;
        }

        try {
          const executionFlags: any = {};

          if (options.claude) executionFlags.provider = 'claude';
          if (options.llamaCpp) executionFlags.provider = 'llama-cpp';
          if (options.provider) executionFlags.provider = options.provider;
          if (options.model) executionFlags.model = options.model;

          const result = await this.king.executeTask({
            description: task,
            priority: options.priority,
            executionFlags: {
              ...executionFlags,
              timeout: parseInt(options.timeout),
              costLimit: parseFloat(options.costLimit),
            },
          });

          console.log('✅ Task executed successfully:');
          console.log(`   Task ID: ${result.taskId}`);
          console.log(`   Provider: ${result.provider}`);
          console.log(`   Tokens: ${result.tokensUsed || 'N/A'}`);
          console.log(`   Cost: $${result.cost?.toFixed(4) || 'N/A'}`);
          console.log(`   Time: ${result.executionTime}ms`);
          console.log(`   Output: ${result.output}`);
        } catch (error) {
          console.error('❌ Task execution failed:', error);
        }
      });

    // Memory commands
    const memoryCmd = this.program
      .command('memory')
      .description('Memory management commands');

    memoryCmd
      .command('store <key> <value>')
      .description('Store a value in memory')
      .option('-t, --ttl <seconds>', 'Time to live in seconds')
      .action(async (key, value, options) => {
        if (!this.king) {
          console.error('❌ Hive-Mind King not running');
          return;
        }

        try {
          const managers = this.king.getManagers();
          await managers.memory.store(key, JSON.parse(value), {
            ttl: options.ttl ? parseInt(options.ttl) : undefined,
          });
          console.log(`✅ Memory stored: ${key}`);
        } catch (error) {
          console.error('❌ Failed to store memory:', error);
        }
      });

    memoryCmd
      .command('retrieve <key>')
      .description('Retrieve a value from memory')
      .action(async (key) => {
        if (!this.king) {
          console.error('❌ Hive-Mind King not running');
          return;
        }

        try {
          const managers = this.king.getManagers();
          const value = await managers.memory.retrieve(key);
          console.log(`✅ Memory retrieved: ${key}`);
          console.log(JSON.stringify(value, null, 2));
        } catch (error) {
          console.error('❌ Failed to retrieve memory:', error);
        }
      });

    memoryCmd
      .command('clear')
      .description('Clear all memory')
      .action(async () => {
        if (!this.king) {
          console.error('❌ Hive-Mind King not running');
          return;
        }

        try {
          const managers = this.king.getManagers();
          await managers.memory.clear();
          console.log('✅ Memory cleared');
        } catch (error) {
          console.error('❌ Failed to clear memory:', error);
        }
      });

    // Config command
    const configCmd = this.program
      .command('config')
      .description('Configuration management');

    configCmd
      .command('show')
      .description('Show current configuration')
      .action(() => {
        if (this.king) {
          const status = this.king.getStatus();
          console.log(JSON.stringify(status.config, null, 2));
        } else {
          console.log('⚠️  Hive-Mind King not initialized');
        }
      });

    configCmd
      .command('update <key> <value>')
      .description('Update configuration value')
      .action((key, value) => {
        if (!this.king) {
          console.error('❌ Hive-Mind King not initialized');
          return;
        }

        try {
          // Parse nested keys like "memory.ttl"
          const keys = key.split('.');
          const configUpdate: any = {};
          let current = configUpdate;

          for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = {};
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = JSON.parse(value);

          this.king.updateConfig(configUpdate);
          console.log(`✅ Configuration updated: ${key}`);
        } catch (error) {
          console.error('❌ Failed to update configuration:', error);
        }
      });

    // Interactive mode
    this.program
      .command('interactive')
      .description('Start interactive mode')
      .action(async () => {
        await this.startInteractiveMode();
      });
  }

  /**
   * Start interactive mode for advanced operations
   */
  private async startInteractiveMode(): Promise<void> {
    console.log('🚀 Hive-Mind King Interactive Mode');
    console.log('Type "help" for commands, "exit" to quit');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'hive-king> '
    });

    rl.prompt();

    rl.on('line', async (line: string) => {
      const args = line.trim().split(' ');
      const command = args[0];

      try {
        switch (command) {
          case 'help':
            console.log(`
Available commands:
  start              - Start the system
  stop               - Stop the system
  status             - Show system status
  swarm list         - List active swarms
  swarm create <name> - Create a new swarm
  agent list         - List all agents
  tool list          - List registered tools
  execute <task>     - Execute a task
  memory store <k> <v> - Store in memory
  memory retrieve <k> - Retrieve from memory
  exit               - Exit interactive mode
            `);
            break;

          case 'start':
            if (!this.king) {
              this.king = new HiveMindKing();
              await this.king.start();
              console.log('✅ System started');
            } else {
              console.log('⚠️  System already running');
            }
            break;

          case 'stop':
            if (this.king) {
              await this.king.stop();
              console.log('✅ System stopped');
            } else {
              console.log('⚠️  System not running');
            }
            break;

          case 'status':
            if (this.king) {
              const status = this.king.getStatus();
              console.log(JSON.stringify(status, null, 2));
            } else {
              console.log('⚠️  System not initialized');
            }
            break;

          case 'exit':
            console.log('👋 Goodbye!');
            rl.close();
            return;

          default:
            if (command) {
              // Try to execute as CLI command
              await this.run(['node', 'cli.js', ...args]);
            }
        }
      } catch (error) {
        console.error('❌ Error:', error.message);
      }

      rl.prompt();
    });

    rl.on('close', () => {
      console.log('Interactive mode ended');
      process.exit(0);
    });
  }

  /**
   * Parse command line arguments
   */
  async run(argv: string[] = process.argv): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      console.error('CLI Error:', error);
      process.exit(1);
    }
  }

  /**
   * Get the commander program instance
   */
  getProgram(): Command {
    return this.program;
  }
}

/**
 * CLI Entry Point
 */
export async function runCLI(): Promise<void> {
  const cli = new KingCLI();
  await cli.run();
}

// Run if called directly
if (require.main === module) {
  runCLI().catch((error) => {
    console.error('CLI failed:', error);
    process.exit(1);
  });
}
