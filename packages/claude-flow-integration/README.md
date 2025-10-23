# Claude Flow Integration

Complete integration layer for Claude Flow orchestration system, replacing Maestro stubs with production-ready functionality.

## Features

- **Full Claude Flow API Integration** - Complete client for Claude Flow orchestration
- **Workflow Builder** - Fluent API for building complex workflows
- **Pre-built Workflows** - Ready-to-use templates for common scenarios
- **Maestro Compatibility** - Drop-in replacement for existing Maestro code
- **Type Safety** - Full TypeScript support with runtime validation
- **Event-Driven** - Comprehensive event system for monitoring
- **Memory Management** - Built-in swarm memory support
- **Neural Patterns** - Optional neural pattern training

## Installation

```bash
npm install @noa/claude-flow-integration
```

## Quick Start

### Basic Usage

```typescript
import { ClaudeFlowClient, AgentType, SwarmTopology } from '@noa/claude-flow-integration';

// Initialize client
const client = new ClaudeFlowClient({
  apiEndpoint: 'http://localhost:3000',
  enableHooks: true,
  enableMemory: true
});

await client.initialize();

// Create a swarm
const swarm = await client.initSwarm({
  topology: SwarmTopology.MESH,
  maxAgents: 10,
  memoryEnabled: true
});

// Spawn agents
const agent = await client.spawnAgent({
  type: AgentType.CODER,
  maxConcurrency: 5
});

// Orchestrate tasks
await client.orchestrateTasks([
  {
    id: 'task-1',
    description: 'Implement REST API',
    agentType: AgentType.BACKEND_DEV,
    priority: 'high'
  },
  {
    id: 'task-2',
    description: 'Write tests',
    agentType: AgentType.TESTER,
    priority: 'high',
    dependencies: ['task-1']
  }
]);
```

### Using Workflow Builder

```typescript
import { WorkflowBuilder, AgentType, TaskPriority } from '@noa/claude-flow-integration';

const workflow = WorkflowBuilder.meshSwarm('api-dev', 'Build REST API', 6)
  .addTask('design-api', 'Design API endpoints')
    .withAgent(AgentType.SYSTEM_ARCHITECT)
    .withPriority(TaskPriority.HIGH)
  .addTask('implement-api', 'Implement endpoints')
    .withAgent(AgentType.BACKEND_DEV)
    .withPriority(TaskPriority.HIGH)
    .dependsOn('design-api')
  .addTask('write-tests', 'Write API tests')
    .withAgent(AgentType.TESTER)
    .withPriority(TaskPriority.HIGH)
    .dependsOn('implement-api')
  .build();

const results = await client.executeWorkflow(workflow);
```

### Using Pre-built Workflows

```typescript
import { PrebuiltWorkflows } from '@noa/claude-flow-integration';

// Full-stack development
const workflow = PrebuiltWorkflows.fullStackDevelopment('MyApp');
await client.executeWorkflow(workflow);

// API development
const apiWorkflow = PrebuiltWorkflows.apiDevelopment('UserAPI');
await client.executeWorkflow(apiWorkflow);

// ML pipeline
const mlWorkflow = PrebuiltWorkflows.mlPipeline('RecommendationModel');
await client.executeWorkflow(mlWorkflow);
```

### Maestro Compatibility

```typescript
import { MaestroAdapter } from '@noa/claude-flow-integration';

// Drop-in replacement for Maestro
const maestro = new MaestroAdapter();
await maestro.initialize();

// Use existing Maestro code
await maestro.orchestrate(workflow);
await maestro.createSwarm({ topology: 'mesh', maxAgents: 10 });
await maestro.addAgent('coder');
```

## Available Workflows

### Development Workflows
- `fullStackDevelopment` - Complete full-stack app development
- `apiDevelopment` - REST API with testing and docs
- `microservicesDevelopment` - Microservice with containerization
- `tddWorkflow` - Test-driven development

### ML/AI Workflows
- `mlPipeline` - Complete ML pipeline from data to deployment

### Maintenance Workflows
- `codeReview` - Comprehensive code review
- `securityAudit` - Security audit and remediation
- `performanceOptimization` - Performance analysis and optimization
- `databaseMigration` - Safe database migration

### Documentation Workflows
- `documentationGeneration` - Generate comprehensive docs

## Agent Types

- `CODER` - General coding tasks
- `REVIEWER` - Code review and security
- `TESTER` - Test creation and validation
- `PLANNER` - Planning and strategy
- `RESEARCHER` - Research and analysis
- `BACKEND_DEV` - Backend development
- `FRONTEND_DEV` - Frontend development
- `ML_DEVELOPER` - Machine learning development
- `CICD_ENGINEER` - CI/CD and DevOps
- `SYSTEM_ARCHITECT` - System architecture
- `CODE_ANALYZER` - Code analysis and optimization

## Swarm Topologies

- `MESH` - Fully connected, best for collaboration
- `HIERARCHICAL` - Coordinator-worker model
- `ADAPTIVE` - Dynamically adapts topology
- `STAR` - Central coordinator with workers
- `RING` - Sequential processing

## Event System

```typescript
client.on('task.started', (event) => {
  console.log('Task started:', event.data.taskId);
});

client.on('task.completed', (event) => {
  console.log('Task completed:', event.data.taskId);
});

client.on('agent.spawned', (event) => {
  console.log('Agent spawned:', event.data.agentId);
});

client.on('swarm.initialized', (event) => {
  console.log('Swarm initialized:', event.data.sessionId);
});
```

## Memory Management

```typescript
// Store data
await client.storeMemory('user-schema', schemaDefinition, 3600000, ['database']);

// Retrieve data
const schema = await client.retrieveMemory('user-schema');

// Query memory
const entries = await client.queryMemory({
  tags: ['database'],
  after: Date.now() - 3600000,
  limit: 10
});
```

## Error Handling

```typescript
import { ClaudeFlowError, ValidationError, TimeoutError } from '@noa/claude-flow-integration';

try {
  await client.executeWorkflow(workflow);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid configuration:', error.details);
  } else if (error instanceof TimeoutError) {
    console.error('Operation timeout:', error.details);
  } else if (error instanceof ClaudeFlowError) {
    console.error('Claude Flow error:', error.code, error.message);
  }
}
```

## Advanced Features

### Custom Workflow Building

```typescript
const workflow = new WorkflowBuilder('custom-workflow', 'My Workflow')
  .withDescription('Custom workflow for specific needs')
  .withSwarm({
    topology: SwarmTopology.HIERARCHICAL,
    maxAgents: 8,
    memoryEnabled: true,
    neuralEnabled: true,
    autoHealing: true
  })
  .withParallelExecution(true)
  .withFailFast(false)
  .addTask('task-1', 'First task')
    .withAgent(AgentType.CODER)
    .withPriority(TaskPriority.HIGH)
    .withTimeout(60000)
    .withRetries(5)
    .withMetadata({ custom: 'data' })
  .build();
```

### Sequential Workflows

```typescript
const sequential = WorkflowBuilder.sequential('seq', 'Sequential Tasks')
  .addTask('step-1', 'First step')
    .withAgent(AgentType.PLANNER)
  .addTask('step-2', 'Second step')
    .withAgent(AgentType.CODER)
    .dependsOn('step-1')
  .addTask('step-3', 'Third step')
    .withAgent(AgentType.TESTER)
    .dependsOn('step-2')
  .build();
```

### Monitoring and Metrics

```typescript
// Get swarm status
const status = await client.getSwarmStatus();
console.log(`Active agents: ${status.activeAgents}`);
console.log(`Completed tasks: ${status.completedTasks}`);

// Get agent metrics
const metrics = await client.getAgentMetrics(agentId);
console.log(`Tasks completed: ${metrics.tasksCompleted}`);
console.log(`Average duration: ${metrics.averageDuration}ms`);

// Get swarm metrics
const swarmMetrics = await client.getSwarmMetrics();
console.log(`Success rate: ${swarmMetrics.successRate}%`);
```

## Configuration

```typescript
const client = new ClaudeFlowClient({
  // API endpoint (default: http://localhost:3000)
  apiEndpoint: 'http://localhost:3000',

  // API key (default: from CLAUDE_FLOW_API_KEY env var)
  apiKey: 'your-api-key',

  // Request timeout in ms (default: 30000)
  timeout: 30000,

  // Retry attempts for failed requests (default: 3)
  retryAttempts: 3,

  // Delay between retries in ms (default: 1000)
  retryDelay: 1000,

  // Enable hooks integration (default: true)
  enableHooks: true,

  // Enable memory management (default: true)
  enableMemory: true,

  // Enable neural pattern training (default: false)
  enableNeural: false,

  // Enable debug logging (default: false)
  debug: false
});
```

## Best Practices

1. **Always initialize before use**
   ```typescript
   await client.initialize();
   ```

2. **Use workflow builders for complex workflows**
   ```typescript
   const workflow = WorkflowBuilder.meshSwarm('id', 'name', 10);
   ```

3. **Handle errors appropriately**
   ```typescript
   try {
     await client.executeWorkflow(workflow);
   } catch (error) {
     // Handle error
   }
   ```

4. **Clean up resources**
   ```typescript
   await client.shutdownSwarm();
   ```

5. **Use memory for inter-agent communication**
   ```typescript
   await client.storeMemory('shared-data', data);
   ```

6. **Monitor progress with events**
   ```typescript
   client.on('task.completed', handleTaskComplete);
   ```

## Migration from Maestro

Replace Maestro imports with MaestroAdapter:

```typescript
// Before
import Maestro from 'maestro';
const maestro = new Maestro();

// After
import { MaestroAdapter } from '@noa/claude-flow-integration';
const maestro = new MaestroAdapter();
```

All existing Maestro code should work without modification!

## API Reference

See [API Documentation](./docs/api.md) for complete API reference.

## Examples

See [examples/](./examples/) directory for more examples:
- Basic workflow execution
- Custom agent configuration
- Memory management patterns
- Event handling
- Error recovery strategies

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
