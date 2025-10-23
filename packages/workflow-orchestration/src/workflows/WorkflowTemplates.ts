import {
  AgentType,
  SwarmTopology,
  TaskPriority,
  WorkflowConfig,
} from '@noa/claude-flow-integration';

/**
 * Additional workflow templates for common orchestration patterns
 */

export class WorkflowTemplates {
  /**
   * Create a simple linear workflow
   */
  static linear(
    id: string,
    name: string,
    steps: Array<{ id: string; description: string; agent: AgentType }>
  ): WorkflowConfig {
    const tasks = steps.map((step, index) => ({
      id: step.id,
      description: step.description,
      agentType: step.agent,
      priority: TaskPriority.MEDIUM,
      dependencies: index > 0 ? [steps[index - 1].id] : [],
      retryCount: 3,
    }));

    return {
      id,
      name,
      tasks,
      parallelExecution: false,
      failFast: true,
    };
  }

  /**
   * Create a fan-out/fan-in workflow
   */
  static fanOutFanIn(
    id: string,
    name: string,
    initialTask: { id: string; description: string; agent: AgentType },
    parallelTasks: Array<{ id: string; description: string; agent: AgentType }>,
    finalTask: { id: string; description: string; agent: AgentType }
  ): WorkflowConfig {
    const tasks = [
      {
        id: initialTask.id,
        description: initialTask.description,
        agentType: initialTask.agent,
        priority: TaskPriority.HIGH,
        dependencies: [],
        retryCount: 3,
      },
      ...parallelTasks.map((task) => ({
        id: task.id,
        description: task.description,
        agentType: task.agent,
        priority: TaskPriority.MEDIUM,
        dependencies: [initialTask.id],
        retryCount: 3,
      })),
      {
        id: finalTask.id,
        description: finalTask.description,
        agentType: finalTask.agent,
        priority: TaskPriority.HIGH,
        dependencies: parallelTasks.map((t) => t.id),
        retryCount: 3,
      },
    ];

    return {
      id,
      name,
      tasks,
      parallelExecution: true,
      failFast: false,
    };
  }

  /**
   * Create a conditional workflow
   */
  static conditional(
    id: string,
    name: string,
    conditionTask: { id: string; description: string; agent: AgentType },
    trueBranch: Array<{ id: string; description: string; agent: AgentType }>,
    falseBranch: Array<{ id: string; description: string; agent: AgentType }>
  ): WorkflowConfig {
    const tasks = [
      {
        id: conditionTask.id,
        description: conditionTask.description,
        agentType: conditionTask.agent,
        priority: TaskPriority.HIGH,
        dependencies: [],
        retryCount: 3,
        metadata: { type: 'condition' },
      },
      ...trueBranch.map((task, index) => ({
        id: task.id,
        description: task.description,
        agentType: task.agent,
        priority: TaskPriority.MEDIUM,
        dependencies: index === 0 ? [conditionTask.id] : [trueBranch[index - 1].id],
        retryCount: 3,
        metadata: { branch: 'true' },
      })),
      ...falseBranch.map((task, index) => ({
        id: task.id,
        description: task.description,
        agentType: task.agent,
        priority: TaskPriority.MEDIUM,
        dependencies: index === 0 ? [conditionTask.id] : [falseBranch[index - 1].id],
        retryCount: 3,
        metadata: { branch: 'false' },
      })),
    ];

    return {
      id,
      name,
      tasks,
      parallelExecution: true,
      failFast: false,
    };
  }

  /**
   * Create a map-reduce workflow
   */
  static mapReduce(
    id: string,
    name: string,
    mapTasks: Array<{ id: string; description: string; agent: AgentType }>,
    reduceTask: { id: string; description: string; agent: AgentType }
  ): WorkflowConfig {
    const tasks = [
      ...mapTasks.map((task) => ({
        id: task.id,
        description: task.description,
        agentType: task.agent,
        priority: TaskPriority.MEDIUM,
        dependencies: [],
        retryCount: 3,
        metadata: { phase: 'map' },
      })),
      {
        id: reduceTask.id,
        description: reduceTask.description,
        agentType: reduceTask.agent,
        priority: TaskPriority.HIGH,
        dependencies: mapTasks.map((t) => t.id),
        retryCount: 3,
        metadata: { phase: 'reduce' },
      },
    ];

    return {
      id,
      name,
      tasks,
      parallelExecution: true,
      failFast: false,
      swarmConfig: {
        topology: SwarmTopology.MESH,
        maxAgents: mapTasks.length + 1,
        memoryEnabled: true,
        neuralEnabled: false,
        autoHealing: true,
      },
    };
  }

  /**
   * Create a pipeline workflow with stages
   */
  static pipeline(
    id: string,
    name: string,
    stages: Array<{
      name: string;
      tasks: Array<{ id: string; description: string; agent: AgentType }>;
    }>
  ): WorkflowConfig {
    const tasks = [];
    let previousStage: string[] = [];

    for (const stage of stages) {
      const stageTasks = stage.tasks.map((task) => ({
        id: task.id,
        description: task.description,
        agentType: task.agent,
        priority: TaskPriority.MEDIUM,
        dependencies: previousStage,
        retryCount: 3,
        metadata: { stage: stage.name },
      }));

      tasks.push(...stageTasks);
      previousStage = stageTasks.map((t) => t.id);
    }

    return {
      id,
      name,
      tasks,
      parallelExecution: true,
      failFast: false,
    };
  }

  /**
   * Create a retry workflow with fallback
   */
  static retryWithFallback(
    id: string,
    name: string,
    primaryTask: { id: string; description: string; agent: AgentType },
    fallbackTask: { id: string; description: string; agent: AgentType }
  ): WorkflowConfig {
    return {
      id,
      name,
      tasks: [
        {
          id: primaryTask.id,
          description: primaryTask.description,
          agentType: primaryTask.agent,
          priority: TaskPriority.HIGH,
          dependencies: [],
          retryCount: 5,
          metadata: { type: 'primary' },
        },
        {
          id: fallbackTask.id,
          description: fallbackTask.description,
          agentType: fallbackTask.agent,
          priority: TaskPriority.MEDIUM,
          dependencies: [],
          retryCount: 1,
          metadata: { type: 'fallback', triggerOn: 'primary-failure' },
        },
      ],
      parallelExecution: false,
      failFast: false,
    };
  }
}
