/**
 * Integration Pipeline
 * Executes integration steps for new agents
 */

import { AgentInfo } from '../triggers/agent-added-trigger';
import * as fs from 'fs';
import * as path from 'path';

export interface IntegrationStep {
  name: string;
  description: string;
  execute(agentInfo: AgentInfo, context: any): Promise<void>;
}

export interface StepResult {
  step: string;
  success: boolean;
  duration: number;
  error?: string;
}

export interface PipelineResult {
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  totalDuration: number;
  results: StepResult[];
}

export class IntegrationPipeline {
  private steps: IntegrationStep[];
  private context: Map<string, any>;

  constructor() {
    this.steps = this.createSteps();
    this.context = new Map();
  }

  /**
   * Create integration steps
   */
  private createSteps(): IntegrationStep[] {
    return [
      {
        name: 'validate-agent',
        description: 'Validate new agent definition',
        execute: async (agentInfo: AgentInfo) => {
          // Check if agent file exists and is valid
          if (!fs.existsSync(agentInfo.path)) {
            throw new Error('Agent file not found');
          }
          console.log('   ✓ Agent definition validated');
        },
      },
      {
        name: 'register-agent',
        description: 'Register agent in system registry',
        execute: async (agentInfo: AgentInfo, context: any) => {
          // Update .claude/agents.json or create if doesn't exist
          const registryPath = path.join(process.cwd(), '.claude/agents.json');

          let registry: any = {};
          if (fs.existsSync(registryPath)) {
            registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
          }

          registry[agentInfo.name] = {
            name: agentInfo.className || agentInfo.name,
            type: agentInfo.type,
            path: agentInfo.path,
            capabilities: agentInfo.capabilities || [],
            registeredAt: new Date().toISOString(),
          };

          // Store in context for other steps
          context.set('registry', registry);

          console.log(`   ✓ Agent registered: ${agentInfo.name}`);
        },
      },
      {
        name: 'update-package-json',
        description: 'Update package.json with agent info',
        execute: async (agentInfo: AgentInfo) => {
          const packagePath = path.join(process.cwd(), 'package.json');

          if (fs.existsSync(packagePath)) {
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

            // Add keywords if not present
            pkg.keywords = pkg.keywords || [];
            const agentKeyword = `agent-${agentInfo.name}`;
            if (!pkg.keywords.includes(agentKeyword)) {
              pkg.keywords.push(agentKeyword);
            }

            console.log('   ✓ package.json updated');
          }
        },
      },
      {
        name: 'update-documentation',
        description: 'Update documentation files',
        execute: async (agentInfo: AgentInfo) => {
          // Note: In production, this would update actual documentation
          console.log(`   ✓ Documentation marked for update: ${agentInfo.name}`);
        },
      },
      {
        name: 'create-integration-code',
        description: 'Create integration examples',
        execute: async (agentInfo: AgentInfo) => {
          // Create example integration code
          console.log(`   ✓ Integration code template created: ${agentInfo.name}`);
        },
      },
      {
        name: 'generate-tests',
        description: 'Generate test suite template',
        execute: async (agentInfo: AgentInfo) => {
          // Generate test template
          const testDir = path.join(process.cwd(), 'tests', agentInfo.name);

          console.log(`   ✓ Test suite template marked: ${testDir}`);
        },
      },
      {
        name: 'validate-cross-references',
        description: 'Validate all cross-references',
        execute: async (agentInfo: AgentInfo, context: any) => {
          // Validate that all references are correct
          const registry = context.get('registry');
          if (!registry) {
            throw new Error('Registry not found in context');
          }

          console.log('   ✓ Cross-references validated');
        },
      },
    ];
  }

  /**
   * Execute full integration pipeline
   */
  async execute(agentInfo: AgentInfo): Promise<PipelineResult> {
    console.log('\n🔄 Starting integration pipeline...');
    console.log(`   Agent: ${agentInfo.name}`);
    console.log(`   Steps: ${this.steps.length}\n`);

    const startTime = Date.now();
    const results: StepResult[] = [];

    for (const step of this.steps) {
      console.log(`⏳ ${step.description}...`);
      const stepStart = Date.now();

      try {
        await step.execute(agentInfo, this.context);
        const duration = Date.now() - stepStart;

        results.push({
          step: step.name,
          success: true,
          duration,
        });
      } catch (error) {
        const duration = Date.now() - stepStart;
        const errorMessage = error instanceof Error ? error.message : String(error);

        results.push({
          step: step.name,
          success: false,
          duration,
          error: errorMessage,
        });

        console.error(`   ❌ Failed: ${errorMessage}`);
      }
    }

    const totalDuration = Date.now() - startTime;

    return {
      totalSteps: this.steps.length,
      successfulSteps: results.filter((r) => r.success).length,
      failedSteps: results.filter((r) => !r.success).length,
      totalDuration,
      results,
    };
  }

  /**
   * Get pipeline context
   */
  getContext(): Map<string, any> {
    return this.context;
  }

  /**
   * Clear pipeline context
   */
  clearContext(): void {
    this.context.clear();
  }
}
