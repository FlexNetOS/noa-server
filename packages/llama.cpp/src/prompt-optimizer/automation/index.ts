/**
 * Mandatory Automation System - Main Exports
 */

// Core
export { MandatoryOptimizer, mandatoryOptimizer } from './auto-optimizer';
export { AutomationConfigLoader, automationConfig } from './config';
export { PromptCache } from './cache';
export { AutomationLogger } from './logger';
export { AutomationMonitor } from './monitor';

// Middleware
export {
  mandatoryPromptOptimizer,
  optimizeEndpoint,
  conditionalOptimizer
} from './middleware';

// Hooks
export {
  PrePromptHook,
  prePromptHook,
  optimizeBeforeExecution
} from './pre-prompt-hook';

// Types
export type { InterceptionResult } from './auto-optimizer';
export type { HookCallback } from './pre-prompt-hook';
export type { MiddlewareOptions } from './middleware';
export type { AutomationConfig } from './config';
