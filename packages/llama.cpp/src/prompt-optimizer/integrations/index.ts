/**
 * Integration Modules - Main Exports
 */

// Claude Code Integration
export {
  ClaudeCodeIntegration,
  claudeCodeIntegration,
  initializeClaudeCodeOptimization,
  interceptClaudeCodePrompt
} from './claude-code';

// API Wrapper
export {
  OptimizedAPIClient,
  createOptimizedAPI,
  wrapAPIFunction
} from './api-wrapper';

// Terminal Hook
export {
  TerminalHookIntegration,
  terminalHook,
  initializeTerminalHook,
  interceptTerminalCommand
} from './terminal-hook';

// Types
export type { APIConfig, APIResponse } from './api-wrapper';
