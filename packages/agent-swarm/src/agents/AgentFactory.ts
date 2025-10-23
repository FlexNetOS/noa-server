import { AgentConfig, AgentType } from '@noa/claude-flow-integration';

/**
 * Agent Factory
 *
 * Factory for creating pre-configured agent configurations
 * with appropriate capabilities and settings.
 */

export class AgentFactory {
  /**
   * Create a coder agent configuration
   */
  static coder(capabilities?: string[]): AgentConfig {
    return {
      type: AgentType.CODER,
      capabilities: capabilities || [
        'coding',
        'implementation',
        'debugging',
        'refactoring',
        'code-generation',
      ],
      maxConcurrency: 5,
      timeoutMs: 300000,
    };
  }

  /**
   * Create a reviewer agent configuration
   */
  static reviewer(capabilities?: string[]): AgentConfig {
    return {
      type: AgentType.REVIEWER,
      capabilities: capabilities || [
        'code-review',
        'security-analysis',
        'quality-assurance',
        'best-practices',
        'performance-review',
      ],
      maxConcurrency: 3,
      timeoutMs: 300000,
    };
  }

  /**
   * Create a tester agent configuration
   */
  static tester(capabilities?: string[]): AgentConfig {
    return {
      type: AgentType.TESTER,
      capabilities: capabilities || [
        'unit-testing',
        'integration-testing',
        'e2e-testing',
        'test-generation',
        'coverage-analysis',
      ],
      maxConcurrency: 5,
      timeoutMs: 300000,
    };
  }

  /**
   * Create a planner agent configuration
   */
  static planner(capabilities?: string[]): AgentConfig {
    return {
      type: AgentType.PLANNER,
      capabilities: capabilities || [
        'planning',
        'strategy',
        'roadmap',
        'estimation',
        'prioritization',
      ],
      maxConcurrency: 3,
      timeoutMs: 300000,
    };
  }

  /**
   * Create a researcher agent configuration
   */
  static researcher(capabilities?: string[]): AgentConfig {
    return {
      type: AgentType.RESEARCHER,
      capabilities: capabilities || [
        'research',
        'analysis',
        'documentation',
        'best-practices',
        'technology-evaluation',
      ],
      maxConcurrency: 3,
      timeoutMs: 300000,
    };
  }

  /**
   * Create a backend developer agent configuration
   */
  static backendDev(capabilities?: string[]): AgentConfig {
    return {
      type: AgentType.BACKEND_DEV,
      capabilities: capabilities || [
        'backend-development',
        'api-design',
        'database-design',
        'microservices',
        'authentication',
        'server-side-logic',
      ],
      maxConcurrency: 5,
      timeoutMs: 300000,
    };
  }

  /**
   * Create a frontend developer agent configuration
   */
  static frontendDev(capabilities?: string[]): AgentConfig {
    return {
      type: AgentType.FRONTEND_DEV,
      capabilities: capabilities || [
        'frontend-development',
        'ui-implementation',
        'responsive-design',
        'state-management',
        'component-design',
      ],
      maxConcurrency: 5,
      timeoutMs: 300000,
    };
  }

  /**
   * Create an ML developer agent configuration
   */
  static mlDeveloper(capabilities?: string[]): AgentConfig {
    return {
      type: AgentType.ML_DEVELOPER,
      capabilities: capabilities || [
        'machine-learning',
        'model-training',
        'data-preprocessing',
        'feature-engineering',
        'model-evaluation',
        'deployment',
      ],
      maxConcurrency: 3,
      timeoutMs: 600000, // 10 minutes for ML tasks
    };
  }

  /**
   * Create a CI/CD engineer agent configuration
   */
  static cicdEngineer(capabilities?: string[]): AgentConfig {
    return {
      type: AgentType.CICD_ENGINEER,
      capabilities: capabilities || [
        'cicd-pipeline',
        'containerization',
        'orchestration',
        'deployment',
        'infrastructure',
        'monitoring',
      ],
      maxConcurrency: 3,
      timeoutMs: 300000,
    };
  }

  /**
   * Create a system architect agent configuration
   */
  static systemArchitect(capabilities?: string[]): AgentConfig {
    return {
      type: AgentType.SYSTEM_ARCHITECT,
      capabilities: capabilities || [
        'architecture-design',
        'system-design',
        'scalability',
        'performance',
        'security-architecture',
        'technology-selection',
      ],
      maxConcurrency: 2,
      timeoutMs: 300000,
    };
  }

  /**
   * Create a code analyzer agent configuration
   */
  static codeAnalyzer(capabilities?: string[]): AgentConfig {
    return {
      type: AgentType.CODE_ANALYZER,
      capabilities: capabilities || [
        'code-analysis',
        'performance-analysis',
        'complexity-analysis',
        'dependency-analysis',
        'refactoring-suggestions',
      ],
      maxConcurrency: 5,
      timeoutMs: 300000,
    };
  }

  /**
   * Create a custom agent configuration
   */
  static custom(
    type: AgentType,
    capabilities: string[],
    options?: Partial<AgentConfig>
  ): AgentConfig {
    return {
      type,
      capabilities,
      maxConcurrency: options?.maxConcurrency || 5,
      timeoutMs: options?.timeoutMs || 300000,
    };
  }

  /**
   * Create multiple agents for a swarm
   */
  static createSwarm(
    configs: Array<{ type: AgentType; count: number; capabilities?: string[] }>
  ): AgentConfig[] {
    const agents: AgentConfig[] = [];

    for (const config of configs) {
      for (let i = 0; i < config.count; i++) {
        switch (config.type) {
          case AgentType.CODER:
            agents.push(AgentFactory.coder(config.capabilities));
            break;
          case AgentType.REVIEWER:
            agents.push(AgentFactory.reviewer(config.capabilities));
            break;
          case AgentType.TESTER:
            agents.push(AgentFactory.tester(config.capabilities));
            break;
          case AgentType.PLANNER:
            agents.push(AgentFactory.planner(config.capabilities));
            break;
          case AgentType.RESEARCHER:
            agents.push(AgentFactory.researcher(config.capabilities));
            break;
          case AgentType.BACKEND_DEV:
            agents.push(AgentFactory.backendDev(config.capabilities));
            break;
          case AgentType.ML_DEVELOPER:
            agents.push(AgentFactory.mlDeveloper(config.capabilities));
            break;
          case AgentType.CICD_ENGINEER:
            agents.push(AgentFactory.cicdEngineer(config.capabilities));
            break;
          case AgentType.SYSTEM_ARCHITECT:
            agents.push(AgentFactory.systemArchitect(config.capabilities));
            break;
          case AgentType.CODE_ANALYZER:
            agents.push(AgentFactory.codeAnalyzer(config.capabilities));
            break;
          default:
            agents.push(AgentFactory.custom(config.type, config.capabilities || [], {}));
        }
      }
    }

    return agents;
  }
}
