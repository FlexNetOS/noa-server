# Workflow Orchestration

Comprehensive orchestration engine for Claude Flow workflows with advanced state
management, execution control, and workflow patterns.

## Features

- **Orchestration Engine** - Execute workflows with dependency resolution
- **State Management** - Track and persist workflow execution state
- **Parallel Execution** - Run tasks concurrently with concurrency control
- **Sequential Execution** - Execute tasks in order with guarantees
- **Workflow Templates** - Pre-built patterns for common scenarios
- **Error Recovery** - Automatic retry and recovery mechanisms
- **Progress Tracking** - Real-time monitoring and metrics
- **Snapshot & Restore** - State persistence for recovery

## Installation

```bash
npm install @noa/workflow-orchestration @noa/claude-flow-integration
```

## Quick Start

### Basic Orchestration

```typescript
import { Orchestrator } from '@noa/workflow-orchestration';
import {
  ClaudeFlowClient,
  WorkflowBuilder,
  AgentType,
} from '@noa/claude-flow-integration';

// Initialize client and orchestrator
const client = new ClaudeFlowClient();
await client.initialize();

const orchestrator = new Orchestrator(client, {
  maxConcurrentTasks: 5,
  taskTimeout: 300000,
  enableAutoRecovery: true,
});

// Build workflow
const workflow = WorkflowBuilder.meshSwarm('my-workflow', 'My Workflow', 5)
  .addTask('task-1', 'First task')
  .withAgent(AgentType.PLANNER)
  .addTask('task-2', 'Second task')
  .withAgent(AgentType.CODER)
  .dependsOn('task-1')
  .build();

// Execute
const results = await orchestrator.execute(workflow);
console.log('Workflow completed:', results);
```

### Monitor Progress

```typescript
// Subscribe to events
orchestrator.on('workflow.started', ({ workflowId }) => {
  console.log('Workflow started:', workflowId);
});

orchestrator.on('task.completed', ({ taskId, result }) => {
  console.log('Task completed:', taskId, result.status);
});

orchestrator.on('workflow.completed', ({ workflowId, status }) => {
  console.log('Workflow finished:', workflowId, status);
});

// Get real-time progress
const progress = orchestrator.getWorkflowProgress(workflowId);
console.log(
  `Progress: ${progress.completed}/${progress.total} (${progress.percentage.toFixed(1)}%)`
);
```

### State Management

```typescript
import { StateManager } from '@noa/workflow-orchestration';

const stateManager = new StateManager({ maxSnapshots: 10 });

// Create workflow state
const state = stateManager.createWorkflowState(workflow);

// Update task state
stateManager.updateTaskState(workflowId, taskId, {
  status: TaskStatus.IN_PROGRESS,
  agentId: 'agent-123',
});

// Create snapshot
stateManager.createSnapshot(workflowId);

// Restore from snapshot
const restoredState = stateManager.restoreFromSnapshot(workflowId);

// Export state
const json = stateManager.exportState(workflowId);
await fs.writeFile('workflow-state.json', json);
```

### Parallel Execution

```typescript
import { ParallelExecutor } from '@noa/workflow-orchestration';

const executor = new ParallelExecutor({
  maxConcurrency: 10,
  timeout: 60000,
  retryAttempts: 3,
  loadBalancing: 'least-loaded',
});

// Execute tasks in parallel
const results = await executor.executeTasks(tasks, async (task) => {
  // Your task execution logic
  return await executeTask(task);
});

// Monitor execution
executor.on('task.completed', (result) => {
  console.log('Task done:', result.taskId);
});

// Get statistics
const stats = executor.getStatistics();
console.log(
  `Active: ${stats.busySlots}/${stats.totalSlots}, Queue: ${stats.queueSize}`
);
```

### Sequential Execution

```typescript
import { SequentialExecutor } from '@noa/workflow-orchestration';

const executor = new SequentialExecutor({
  timeout: 60000,
  retryAttempts: 3,
  stopOnFailure: true,
});

// Validate dependencies
const validation = executor.validateDependencies(tasks);
if (!validation.valid) {
  console.error('Invalid dependencies:', validation.errors);
}

// Sort tasks by dependencies
const sortedTasks = executor.sortByDependencies(tasks);

// Execute sequentially
const results = await executor.executeTasks(sortedTasks, async (task) => {
  return await executeTask(task);
});
```

## Workflow Templates

### Linear Workflow

```typescript
import { WorkflowTemplates } from '@noa/workflow-orchestration';
import { AgentType } from '@noa/claude-flow-integration';

const workflow = WorkflowTemplates.linear('linear-flow', 'Linear Process', [
  { id: 'step-1', description: 'Plan', agent: AgentType.PLANNER },
  { id: 'step-2', description: 'Code', agent: AgentType.CODER },
  { id: 'step-3', description: 'Test', agent: AgentType.TESTER },
]);
```

### Fan-Out/Fan-In

```typescript
const workflow = WorkflowTemplates.fanOutFanIn(
  'fan-flow',
  'Fan-Out Fan-In',
  { id: 'prepare', description: 'Prepare data', agent: AgentType.PLANNER },
  [
    { id: 'process-1', description: 'Process A', agent: AgentType.CODER },
    { id: 'process-2', description: 'Process B', agent: AgentType.CODER },
    { id: 'process-3', description: 'Process C', agent: AgentType.CODER },
  ],
  {
    id: 'aggregate',
    description: 'Aggregate results',
    agent: AgentType.CODE_ANALYZER,
  }
);
```

### Map-Reduce

```typescript
const workflow = WorkflowTemplates.mapReduce(
  'map-reduce',
  'Map-Reduce Processing',
  [
    { id: 'map-1', description: 'Map task 1', agent: AgentType.CODER },
    { id: 'map-2', description: 'Map task 2', agent: AgentType.CODER },
    { id: 'map-3', description: 'Map task 3', agent: AgentType.CODER },
  ],
  {
    id: 'reduce',
    description: 'Reduce results',
    agent: AgentType.CODE_ANALYZER,
  }
);
```

### Pipeline with Stages

```typescript
const workflow = WorkflowTemplates.pipeline(
  'pipeline',
  'Multi-Stage Pipeline',
  [
    {
      name: 'build',
      tasks: [
        { id: 'compile', description: 'Compile code', agent: AgentType.CODER },
        { id: 'bundle', description: 'Bundle assets', agent: AgentType.CODER },
      ],
    },
    {
      name: 'test',
      tasks: [
        {
          id: 'unit-test',
          description: 'Run unit tests',
          agent: AgentType.TESTER,
        },
        {
          id: 'integration-test',
          description: 'Run integration tests',
          agent: AgentType.TESTER,
        },
      ],
    },
    {
      name: 'deploy',
      tasks: [
        {
          id: 'deploy-staging',
          description: 'Deploy to staging',
          agent: AgentType.CICD_ENGINEER,
        },
        {
          id: 'smoke-test',
          description: 'Run smoke tests',
          agent: AgentType.TESTER,
        },
      ],
    },
  ]
);
```

### Conditional Workflow

```typescript
const workflow = WorkflowTemplates.conditional(
  'conditional',
  'Conditional Flow',
  { id: 'check', description: 'Check condition', agent: AgentType.PLANNER },
  [
    { id: 'true-1', description: 'True branch task 1', agent: AgentType.CODER },
    { id: 'true-2', description: 'True branch task 2', agent: AgentType.CODER },
  ],
  [
    {
      id: 'false-1',
      description: 'False branch task 1',
      agent: AgentType.CODER,
    },
    {
      id: 'false-2',
      description: 'False branch task 2',
      agent: AgentType.CODER,
    },
  ]
);
```

## Advanced Features

### Custom Orchestrator Configuration

```typescript
const orchestrator = new Orchestrator(client, {
  // Maximum concurrent tasks
  maxConcurrentTasks: 10,

  // Task timeout in ms
  taskTimeout: 600000,

  // Retry delay in ms
  retryDelay: 3000,

  // Enable automatic recovery
  enableAutoRecovery: true,

  // Snapshot interval in ms
  snapshotInterval: 60000,
});
```

### Event Monitoring

```typescript
orchestrator.on('workflow.started', ({ workflowId, workflow }) => {
  console.log('Started:', workflowId);
});

orchestrator.on('task.started', ({ workflowId, taskId, task }) => {
  console.log('Task started:', taskId);
});

orchestrator.on('task.retry', ({ taskId, attempt, maxRetries, error }) => {
  console.log(`Retrying ${taskId}: ${attempt}/${maxRetries}`);
});

orchestrator.on('task.completed', ({ workflowId, taskId, result }) => {
  console.log('Task completed:', taskId, result.duration, 'ms');
});

orchestrator.on('task.failed', ({ workflowId, taskId, error }) => {
  console.error('Task failed:', taskId, error);
});

orchestrator.on('workflow.completed', ({ workflowId, status, results }) => {
  const succeeded = results.filter((r) => r.status === 'completed').length;
  console.log(`Workflow done: ${succeeded}/${results.length} succeeded`);
});

orchestrator.on('agent.spawned', ({ workflowId, agent }) => {
  console.log('Agent spawned:', agent.agentId, agent.type);
});
```

### Workflow Cancellation

```typescript
// Cancel running workflow
await orchestrator.cancelWorkflow(workflowId);

// Listen for cancellation
orchestrator.on('workflow.cancelled', ({ workflowId }) => {
  console.log('Workflow cancelled:', workflowId);
});
```

### Progress Tracking

```typescript
// Get detailed progress
const progress = orchestrator.getWorkflowProgress(workflowId);

console.log(`Total tasks: ${progress.total}`);
console.log(`Completed: ${progress.completed}`);
console.log(`Failed: ${progress.failed}`);
console.log(`In progress: ${progress.inProgress}`);
console.log(`Pending: ${progress.pending}`);
console.log(`Progress: ${progress.percentage.toFixed(1)}%`);
```

### State Inspection

```typescript
// Get full workflow state
const state = orchestrator.getWorkflowState(workflowId);

// Inspect task states
for (const [taskId, taskState] of state.taskStates.entries()) {
  console.log(`Task ${taskId}:`, {
    status: taskState.status,
    duration: taskState.endTime
      ? taskState.endTime - taskState.startTime
      : null,
    retries: taskState.retryCount,
    dependencies: taskState.dependencies,
    dependents: taskState.dependents,
  });
}

// Get task results
for (const result of state.results) {
  console.log(`Result ${result.taskId}:`, {
    status: result.status,
    duration: result.duration,
    output: result.output,
    error: result.error,
  });
}
```

## Best Practices

1. **Set appropriate timeouts** for long-running tasks
2. **Use parallel execution** when tasks are independent
3. **Enable auto-recovery** for production workflows
4. **Monitor events** for debugging and observability
5. **Create snapshots** regularly for state recovery
6. **Validate dependencies** before execution
7. **Handle failures gracefully** with retry logic

## API Reference

See [API Documentation](./docs/api.md) for complete reference.

## Examples

See [examples/](./examples/) for more examples.

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
