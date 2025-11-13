/**
 * Swarm Initializer
 * Automatically initializes Claude-Flow swarm for agent integration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { AgentInfo } from '../triggers/agent-added-trigger';

const execAsync = promisify(exec);

export interface SwarmSession {
  sessionId: string;
  agentInfo: AgentInfo;
  startTime: Date;
  spawnedAgents: string[];
}

export class SwarmInitializer {
  private config: any;
  private activeSessions: Map<string, SwarmSession> = new Map();

  constructor(config?: any) {
    this.config = config || this.getDefaultConfig();
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): any {
    return {
      swarm: {
        topology: 'hierarchical',
        maxAgents: 10,
        coordinatorType: 'integration-coordinator',
        sessionPrefix: 'agent-integration',
      },
      agents: {
        'config-updater': { enabled: true, priority: 'high' },
        'doc-updater': { enabled: true, priority: 'high' },
        'code-updater': { enabled: true, priority: 'medium' },
        'agent-registry-updater': { enabled: true, priority: 'high' },
        'test-creator': { enabled: true, priority: 'medium' },
        'cross-reference-validator': { enabled: true, priority: 'low' },
      },
    };
  }

  /**
   * Initialize swarm for agent integration
   */
  async initializeSwarm(agentInfo: AgentInfo): Promise<string> {
    console.log('\n🚀 Initializing integration swarm...');

    const sessionId = this.generateSessionId(agentInfo.name);
    const { topology, maxAgents, coordinatorType } = this.config.swarm;

    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Topology: ${topology}`);
    console.log(`   Max Agents: ${maxAgents}`);

    try {
      // Initialize Claude-Flow swarm
      const initCmd = `npx claude-flow@alpha swarm init \
        --topology ${topology} \
        --coordinator ${coordinatorType} \
        --max-agents ${maxAgents} \
        --session-id ${sessionId}`;

      const { stdout, stderr } = await execAsync(initCmd);

      if (stderr && !stderr.includes('warning')) {
        console.warn('   ⚠️  Swarm init warnings:', stderr);
      }

      console.log('   ✅ Swarm initialized successfully');

      // Create session record
      const session: SwarmSession = {
        sessionId,
        agentInfo,
        startTime: new Date(),
        spawnedAgents: [],
      };

      this.activeSessions.set(sessionId, session);

      return sessionId;
    } catch (error) {
      console.error('   ❌ Failed to initialize swarm:', error);
      throw new Error(`Swarm initialization failed: ${error.message}`);
    }
  }

  /**
   * Spawn integration agents
   */
  async spawnIntegrationAgents(sessionId: string, agentInfo: AgentInfo): Promise<void> {
    console.log('\n📦 Spawning integration agents...');

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const agentSpecs = this.getAgentSpecs(agentInfo);
    const spawnPromises: Promise<void>[] = [];

    for (const spec of agentSpecs) {
      if (this.config.agents[spec.type]?.enabled) {
        spawnPromises.push(this.spawnAgent(sessionId, spec));
      }
    }

    // Spawn all agents in parallel
    await Promise.all(spawnPromises);

    console.log(`   ✅ Spawned ${spawnPromises.length} integration agents`);
  }

  /**
   * Get agent specifications
   */
  private getAgentSpecs(agentInfo: AgentInfo): AgentSpec[] {
    return [
      {
        type: 'config-updater',
        task: `Update all configuration files to include new agent: ${agentInfo.name}`,
        memoryKey: 'config-updates',
      },
      {
        type: 'doc-updater',
        task: `Update documentation (README.md, CLAUDE.md, guides) for agent: ${agentInfo.name}`,
        memoryKey: 'doc-updates',
      },
      {
        type: 'code-updater',
        task: `Integrate new agent into codebase and create examples: ${agentInfo.name}`,
        memoryKey: 'code-updates',
      },
      {
        type: 'agent-registry-updater',
        task: `Register new agent in hierarchy and flow configs: ${agentInfo.name}`,
        memoryKey: 'registry-updates',
      },
      {
        type: 'test-creator',
        task: `Create comprehensive test suite for agent: ${agentInfo.name}`,
        memoryKey: 'test-creation',
      },
      {
        type: 'cross-reference-validator',
        task: `Validate all cross-references and consistency for: ${agentInfo.name}`,
        memoryKey: 'validation',
      },
    ];
  }

  /**
   * Spawn individual agent
   */
  private async spawnAgent(sessionId: string, spec: AgentSpec): Promise<void> {
    try {
      const spawnCmd = `npx claude-flow@alpha agent spawn \
        --type ${spec.type} \
        --task "${spec.task}" \
        --session-id ${sessionId} \
        --memory-key "swarm/${spec.memoryKey}"`;

      await execAsync(spawnCmd);

      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.spawnedAgents.push(spec.type);
      }

      console.log(`   ✅ Spawned: ${spec.type}`);
    } catch (error) {
      console.error(`   ❌ Failed to spawn ${spec.type}:`, error.message);
      // Continue with other agents
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(agentName: string): string {
    const timestamp = Date.now();
    const prefix = this.config.swarm.sessionPrefix || 'agent-integration';
    const cleanName = agentName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    return `${prefix}-${cleanName}-${timestamp}`;
  }

  /**
   * Get session status
   */
  getSession(sessionId: string): SwarmSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SwarmSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Close session
   */
  closeSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }
}

interface AgentSpec {
  type: string;
  task: string;
  memoryKey: string;
}
