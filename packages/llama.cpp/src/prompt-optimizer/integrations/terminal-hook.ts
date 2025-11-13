/**
 * Terminal Hook Integration
 * Intercepts terminal AI commands
 */

import { mandatoryOptimizer } from '../automation/auto-optimizer';
import { AutomationLogger } from '../automation/logger';

export class TerminalHookIntegration {
  private static instance: TerminalHookIntegration;
  private logger: AutomationLogger;
  private enabled: boolean = false;
  private monitoredCommands: Set<string>;

  private constructor() {
    this.logger = AutomationLogger.getInstance();
    this.monitoredCommands = new Set(['ai', 'claude', 'chat', 'ask']);
  }

  static getInstance(): TerminalHookIntegration {
    if (!TerminalHookIntegration.instance) {
      TerminalHookIntegration.instance = new TerminalHookIntegration();
    }
    return TerminalHookIntegration.instance;
  }

  /**
   * Initialize terminal hook
   */
  initialize(commands: string[] = []): void {
    if (commands.length > 0) {
      this.monitoredCommands = new Set(commands);
    }

    this.enabled = true;
    this.logger.info('Terminal hook initialized', {
      commands: Array.from(this.monitoredCommands),
    });
  }

  /**
   * Intercept terminal command
   */
  async interceptCommand(command: string, args: string[]): Promise<string[]> {
    if (!this.enabled) {
      return args;
    }

    // Check if this is a monitored command
    if (!this.isMonitoredCommand(command)) {
      return args;
    }

    // Assume first argument is the prompt
    if (args.length > 0 && typeof args[0] === 'string') {
      const result = await mandatoryOptimizer.intercept(args[0]);
      return [result.optimized, ...args.slice(1)];
    }

    return args;
  }

  /**
   * Check if command should be monitored
   */
  private isMonitoredCommand(command: string): boolean {
    return this.monitoredCommands.has(command);
  }

  /**
   * Add command to monitor
   */
  addCommand(command: string): void {
    this.monitoredCommands.add(command);
    this.logger.info(`Added terminal command: ${command}`);
  }

  /**
   * Remove command from monitoring
   */
  removeCommand(command: string): void {
    this.monitoredCommands.delete(command);
    this.logger.info(`Removed terminal command: ${command}`);
  }

  /**
   * Disable terminal hook
   */
  disable(): void {
    this.enabled = false;
    this.logger.info('Terminal hook disabled');
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton
export const terminalHook = TerminalHookIntegration.getInstance();

/**
 * Initialize terminal hook
 */
export function initializeTerminalHook(commands?: string[]): void {
  terminalHook.initialize(commands);
}

/**
 * Intercept terminal command
 */
export async function interceptTerminalCommand(command: string, args: string[]): Promise<string[]> {
  return await terminalHook.interceptCommand(command, args);
}
