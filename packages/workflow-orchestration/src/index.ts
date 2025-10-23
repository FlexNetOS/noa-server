/**
 * Workflow Orchestration Package
 *
 * Comprehensive orchestration engine for Claude Flow workflows.
 * Provides state management, execution control, and advanced patterns.
 *
 * @packageDocumentation
 */

// Core orchestrator
export { Orchestrator } from './Orchestrator';
export type { OrchestratorConfig, ExecutionContext } from './Orchestrator';

// State management
export { StateManager } from './state';
export type { WorkflowState, TaskState, StateSnapshot } from './state';

// Executors
export { ParallelExecutor } from './executors/ParallelExecutor';
export type { ParallelExecutionOptions, ExecutionSlot } from './executors/ParallelExecutor';

export { SequentialExecutor } from './executors/SequentialExecutor';
export type { SequentialExecutionOptions } from './executors/SequentialExecutor';

// Workflow templates
export { WorkflowTemplates } from './workflows/WorkflowTemplates';

// Version
export const VERSION = '1.0.0';
