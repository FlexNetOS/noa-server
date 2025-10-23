/**
 * Pre-Prompt Hook System
 * Intercepts prompts before execution
 */

import { mandatoryOptimizer } from './auto-optimizer';
import { AutomationLogger } from './logger';

export type HookCallback = (prompt: string, optimized: string, metadata: any) => void | Promise<void>;

export class PrePromptHook {
  private static instance: PrePromptHook;
  private hooks: Map<string, HookCallback[]>;
  private logger: AutomationLogger;

  private constructor() {
    this.hooks = new Map();
    this.logger = AutomationLogger.getInstance();
  }

  static getInstance(): PrePromptHook {
    if (!PrePromptHook.instance) {
      PrePromptHook.instance = new PrePromptHook();
    }
    return PrePromptHook.instance;
  }

  /**
   * Register a pre-prompt hook
   */
  register(name: string, callback: HookCallback): void {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }
    this.hooks.get(name)!.push(callback);
    this.logger.info(`Registered pre-prompt hook: ${name}`);
  }

  /**
   * Unregister a hook
   */
  unregister(name: string): void {
    this.hooks.delete(name);
    this.logger.info(`Unregistered pre-prompt hook: ${name}`);
  }

  /**
   * Execute pre-prompt hooks and return optimized prompt
   */
  async execute(prompt: string, context?: any): Promise<string> {
    try {
      // Run mandatory optimization
      const result = await mandatoryOptimizer.intercept(prompt, context);

      // Execute all registered hooks
      for (const [name, callbacks] of this.hooks.entries()) {
        for (const callback of callbacks) {
          try {
            await callback(prompt, result.optimized, {
              bypassed: result.bypassed,
              cached: result.cached,
              processingTime: result.processingTime,
              qualityScore: result.qualityScore,
              context
            });
          } catch (error) {
            this.logger.error(`Hook ${name} failed`, error);
          }
        }
      }

      return result.optimized;

    } catch (error) {
      this.logger.error('Pre-prompt hook execution failed', error);
      return prompt; // Return original on error
    }
  }

  /**
   * List all registered hooks
   */
  listHooks(): string[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Clear all hooks
   */
  clearAll(): void {
    this.hooks.clear();
    this.logger.info('Cleared all pre-prompt hooks');
  }
}

// Export singleton instance
export const prePromptHook = PrePromptHook.getInstance();

/**
 * Convenience function for executing pre-prompt hooks
 */
export async function optimizeBeforeExecution(
  prompt: string,
  context?: any
): Promise<string> {
  return await prePromptHook.execute(prompt, context);
}
