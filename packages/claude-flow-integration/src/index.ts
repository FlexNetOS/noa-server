/**
 * Claude Flow Integration Package
 *
 * Complete integration layer for Claude Flow orchestration system,
 * replacing Maestro stubs with production-ready functionality.
 *
 * @packageDocumentation
 */

// Core client
export { ClaudeFlowClient } from './ClaudeFlowClient';

// Workflow builders
export { WorkflowBuilder } from './workflows/WorkflowBuilder';
export { PrebuiltWorkflows } from './workflows/PrebuiltWorkflows';

// Maestro compatibility
export { MaestroAdapter, createMaestroAdapter } from './adapters/MaestroAdapter';
export { default as Maestro } from './adapters/MaestroAdapter';

// Types and schemas
export * from './types';

// Version
export const VERSION = '1.0.0';
