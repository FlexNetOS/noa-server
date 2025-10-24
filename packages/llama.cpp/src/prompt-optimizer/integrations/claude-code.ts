/**
 * Claude Code Integration
 * Automatically optimizes prompts in Claude Code environment
 */

import { mandatoryOptimizer } from '../automation/auto-optimizer';
import { prePromptHook } from '../automation/pre-prompt-hook';
import { AutomationLogger } from '../automation/logger';

export class ClaudeCodeIntegration {
  private static instance: ClaudeCodeIntegration;
  private logger: AutomationLogger;
  private enabled: boolean = false;

  private constructor() {
    this.logger = AutomationLogger.getInstance();
  }

  static getInstance(): ClaudeCodeIntegration {
    if (!ClaudeCodeIntegration.instance) {
      ClaudeCodeIntegration.instance = new ClaudeCodeIntegration();
    }
    return ClaudeCodeIntegration.instance;
  }

  /**
   * Initialize Claude Code integration
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Claude Code integration...');

      // Register pre-prompt hook
      prePromptHook.register('claude-code', async (original, optimized, metadata) => {
        this.logger.verbose('Claude Code prompt optimized', {
          originalLength: original.length,
          optimizedLength: optimized.length,
          bypassed: metadata.bypassed,
          cached: metadata.cached,
        });
      });

      this.enabled = true;
      this.logger.info('Claude Code integration enabled');
    } catch (error) {
      this.logger.error('Failed to initialize Claude Code integration', error);
      throw error;
    }
  }

  /**
   * Intercept and optimize a Claude Code prompt
   */
  async interceptPrompt(prompt: string): Promise<string> {
    if (!this.enabled) {
      this.logger.warn('Claude Code integration not enabled');
      return prompt;
    }

    const result = await mandatoryOptimizer.intercept(prompt, {
      source: 'claude-code',
      timestamp: new Date(),
    });

    return result.optimized;
  }

  /**
   * Wrap a Claude Code command with optimization
   */
  async wrapCommand(command: string, args: any[] = []): Promise<{ command: string; args: any[] }> {
    if (!this.enabled) {
      return { command, args };
    }

    // If first arg is a prompt string, optimize it
    if (args.length > 0 && typeof args[0] === 'string') {
      const optimized = await this.interceptPrompt(args[0]);
      return { command, args: [optimized, ...args.slice(1)] };
    }

    return { command, args };
  }

  /**
   * Disable integration
   */
  disable(): void {
    prePromptHook.unregister('claude-code');
    this.enabled = false;
    this.logger.info('Claude Code integration disabled');
  }

  /**
   * Check if integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton
export const claudeCodeIntegration = ClaudeCodeIntegration.getInstance();

/**
 * Initialize Claude Code automatic optimization
 */
export async function initializeClaudeCodeOptimization(): Promise<void> {
  await claudeCodeIntegration.initialize();
}

/**
 * Intercept Claude Code prompts
 */
export async function interceptClaudeCodePrompt(prompt: string): Promise<string> {
  return await claudeCodeIntegration.interceptPrompt(prompt);
}
