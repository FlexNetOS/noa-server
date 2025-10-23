/**
 * Master-Level AI Prompt Optimization Specialist
 * Main entry point
 */

// Core exports
export { PromptOptimizationAgent, promptOptimizer } from './core/agent';
export { PromptAnalyzer } from './core/analyzer';
export { PromptDiagnostics } from './core/diagnostics';
export { PromptDeveloper } from './core/developer';
export { PromptDeliverer } from './core/deliverer';

// Utility exports
export { PromptParser } from './utils/parser';
export { PromptValidator } from './utils/validator';
export { PromptFormatter } from './utils/formatter';

// Type exports
export * from './types/interfaces';

// Re-export singleton for convenience
import { promptOptimizer } from './core/agent';
export default promptOptimizer;
