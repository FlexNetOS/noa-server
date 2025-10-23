import { WorkflowBuilder } from './WorkflowBuilder';
import { AgentType, TaskPriority, SwarmTopology, WorkflowConfig } from '../types';

/**
 * Pre-built workflow templates for common development scenarios
 *
 * Provides ready-to-use workflows for typical development tasks like
 * full-stack development, API creation, testing, and more.
 */
export class PrebuiltWorkflows {
  /**
   * Full-stack application development workflow
   */
  static fullStackDevelopment(projectName: string): WorkflowConfig {
    return WorkflowBuilder.meshSwarm('fullstack-dev', `Full-Stack Development: ${projectName}`, 8)
      .withDescription('Complete full-stack application development with testing')
      .addTask('research', 'Research best practices and architecture patterns')
      .withAgent(AgentType.RESEARCHER)
      .withPriority(TaskPriority.HIGH)
      .addTask('design-architecture', 'Design system architecture')
      .withAgent(AgentType.SYSTEM_ARCHITECT)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('research')
      .addTask('design-database', 'Design database schema')
      .withAgent(AgentType.CODE_ANALYZER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('design-architecture')
      .addTask('implement-backend', 'Implement backend API')
      .withAgent(AgentType.BACKEND_DEV)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('design-database')
      .addTask('implement-frontend', 'Implement frontend UI')
      .withAgent(AgentType.CODER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('design-architecture')
      .addTask('write-tests', 'Write comprehensive test suite')
      .withAgent(AgentType.TESTER)
      .withPriority(TaskPriority.MEDIUM)
      .dependsOn('implement-backend', 'implement-frontend')
      .addTask('setup-cicd', 'Setup CI/CD pipeline')
      .withAgent(AgentType.CICD_ENGINEER)
      .withPriority(TaskPriority.MEDIUM)
      .dependsOn('write-tests')
      .addTask('review-code', 'Review code quality and security')
      .withAgent(AgentType.REVIEWER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('setup-cicd')
      .build();
  }

  /**
   * REST API development workflow
   */
  static apiDevelopment(apiName: string): WorkflowConfig {
    return WorkflowBuilder.meshSwarm('api-dev', `API Development: ${apiName}`, 6)
      .withDescription('REST API development with testing and documentation')
      .addTask('design-api', 'Design API endpoints and contracts')
      .withAgent(AgentType.SYSTEM_ARCHITECT)
      .withPriority(TaskPriority.HIGH)
      .addTask('design-schema', 'Design database schema')
      .withAgent(AgentType.CODE_ANALYZER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('design-api')
      .addTask('implement-endpoints', 'Implement REST endpoints')
      .withAgent(AgentType.BACKEND_DEV)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('design-schema')
      .addTask('write-tests', 'Write API tests')
      .withAgent(AgentType.TESTER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('implement-endpoints')
      .addTask('generate-docs', 'Generate API documentation')
      .withAgent(AgentType.CODER)
      .withPriority(TaskPriority.MEDIUM)
      .dependsOn('implement-endpoints')
      .addTask('review-security', 'Review security and performance')
      .withAgent(AgentType.REVIEWER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('write-tests', 'generate-docs')
      .build();
  }

  /**
   * Machine learning pipeline workflow
   */
  static mlPipeline(modelName: string): WorkflowConfig {
    return WorkflowBuilder.meshSwarm('ml-pipeline', `ML Pipeline: ${modelName}`, 6)
      .withDescription('Complete ML pipeline from data to deployment')
      .addTask('research-models', 'Research appropriate ML models')
      .withAgent(AgentType.RESEARCHER)
      .withPriority(TaskPriority.HIGH)
      .addTask('design-pipeline', 'Design data processing pipeline')
      .withAgent(AgentType.SYSTEM_ARCHITECT)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('research-models')
      .addTask('implement-preprocessing', 'Implement data preprocessing')
      .withAgent(AgentType.ML_DEVELOPER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('design-pipeline')
      .addTask('train-model', 'Train and tune model')
      .withAgent(AgentType.ML_DEVELOPER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('implement-preprocessing')
      .withTimeout(600000) // 10 minutes
      .addTask('evaluate-model', 'Evaluate model performance')
      .withAgent(AgentType.ML_DEVELOPER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('train-model')
      .addTask('deploy-model', 'Deploy model to production')
      .withAgent(AgentType.CICD_ENGINEER)
      .withPriority(TaskPriority.MEDIUM)
      .dependsOn('evaluate-model')
      .build();
  }

  /**
   * Test-driven development workflow
   */
  static tddWorkflow(featureName: string): WorkflowConfig {
    return WorkflowBuilder.sequential('tdd-workflow', `TDD: ${featureName}`)
      .withDescription('Test-driven development workflow')
      .addTask('write-spec', 'Write feature specification')
      .withAgent(AgentType.PLANNER)
      .withPriority(TaskPriority.HIGH)
      .addTask('write-tests', 'Write failing tests')
      .withAgent(AgentType.TESTER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('write-spec')
      .addTask('implement-feature', 'Implement feature to pass tests')
      .withAgent(AgentType.CODER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('write-tests')
      .addTask('refactor-code', 'Refactor and optimize')
      .withAgent(AgentType.REVIEWER)
      .withPriority(TaskPriority.MEDIUM)
      .dependsOn('implement-feature')
      .build();
  }

  /**
   * Code review and refactoring workflow
   */
  static codeReview(componentName: string): WorkflowConfig {
    return WorkflowBuilder.parallel('code-review', `Code Review: ${componentName}`)
      .withDescription('Comprehensive code review and refactoring')
      .addTask('analyze-code', 'Analyze code quality')
      .withAgent(AgentType.CODE_ANALYZER)
      .withPriority(TaskPriority.HIGH)
      .addTask('review-security', 'Review security concerns')
      .withAgent(AgentType.REVIEWER)
      .withPriority(TaskPriority.HIGH)
      .addTask('review-performance', 'Review performance')
      .withAgent(AgentType.REVIEWER)
      .withPriority(TaskPriority.MEDIUM)
      .addTask('suggest-improvements', 'Suggest improvements')
      .withAgent(AgentType.PLANNER)
      .withPriority(TaskPriority.MEDIUM)
      .dependsOn('analyze-code', 'review-security', 'review-performance')
      .addTask('implement-improvements', 'Implement improvements')
      .withAgent(AgentType.CODER)
      .withPriority(TaskPriority.MEDIUM)
      .dependsOn('suggest-improvements')
      .build();
  }

  /**
   * Microservices architecture workflow
   */
  static microservicesDevelopment(serviceName: string): WorkflowConfig {
    return WorkflowBuilder.hierarchicalSwarm('microservices', `Microservices: ${serviceName}`, 10)
      .withDescription('Develop microservice with containerization and orchestration')
      .addTask('design-service', 'Design service architecture')
      .withAgent(AgentType.SYSTEM_ARCHITECT)
      .withPriority(TaskPriority.HIGH)
      .addTask('define-api', 'Define service API contracts')
      .withAgent(AgentType.SYSTEM_ARCHITECT)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('design-service')
      .addTask('implement-service', 'Implement service logic')
      .withAgent(AgentType.BACKEND_DEV)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('define-api')
      .addTask('setup-database', 'Setup service database')
      .withAgent(AgentType.CODE_ANALYZER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('design-service')
      .addTask('write-tests', 'Write service tests')
      .withAgent(AgentType.TESTER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('implement-service')
      .addTask('containerize', 'Create Docker container')
      .withAgent(AgentType.CICD_ENGINEER)
      .withPriority(TaskPriority.MEDIUM)
      .dependsOn('write-tests')
      .addTask('setup-orchestration', 'Setup Kubernetes manifests')
      .withAgent(AgentType.CICD_ENGINEER)
      .withPriority(TaskPriority.MEDIUM)
      .dependsOn('containerize')
      .addTask('setup-monitoring', 'Setup monitoring and logging')
      .withAgent(AgentType.CICD_ENGINEER)
      .withPriority(TaskPriority.LOW)
      .dependsOn('setup-orchestration')
      .build();
  }

  /**
   * Database migration workflow
   */
  static databaseMigration(migrationName: string): WorkflowConfig {
    return WorkflowBuilder.sequential('db-migration', `Database Migration: ${migrationName}`)
      .withDescription('Safe database migration with rollback support')
      .withFailFast(true)
      .addTask('analyze-schema', 'Analyze current schema')
      .withAgent(AgentType.CODE_ANALYZER)
      .withPriority(TaskPriority.HIGH)
      .addTask('design-migration', 'Design migration strategy')
      .withAgent(AgentType.SYSTEM_ARCHITECT)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('analyze-schema')
      .addTask('write-migration', 'Write migration scripts')
      .withAgent(AgentType.BACKEND_DEV)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('design-migration')
      .addTask('test-migration', 'Test migration on staging')
      .withAgent(AgentType.TESTER)
      .withPriority(TaskPriority.CRITICAL)
      .dependsOn('write-migration')
      .addTask('create-rollback', 'Create rollback scripts')
      .withAgent(AgentType.BACKEND_DEV)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('test-migration')
      .addTask('review-migration', 'Review migration safety')
      .withAgent(AgentType.REVIEWER)
      .withPriority(TaskPriority.CRITICAL)
      .dependsOn('create-rollback')
      .build();
  }

  /**
   * Documentation generation workflow
   */
  static documentationGeneration(projectName: string): WorkflowConfig {
    return WorkflowBuilder.parallel('docs-generation', `Documentation: ${projectName}`)
      .withDescription('Generate comprehensive project documentation')
      .addTask('analyze-codebase', 'Analyze codebase structure')
      .withAgent(AgentType.CODE_ANALYZER)
      .withPriority(TaskPriority.HIGH)
      .addTask('generate-api-docs', 'Generate API documentation')
      .withAgent(AgentType.CODER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('analyze-codebase')
      .addTask('write-guides', 'Write user guides')
      .withAgent(AgentType.CODER)
      .withPriority(TaskPriority.MEDIUM)
      .dependsOn('analyze-codebase')
      .addTask('create-examples', 'Create code examples')
      .withAgent(AgentType.CODER)
      .withPriority(TaskPriority.MEDIUM)
      .dependsOn('analyze-codebase')
      .addTask('generate-diagrams', 'Generate architecture diagrams')
      .withAgent(AgentType.SYSTEM_ARCHITECT)
      .withPriority(TaskPriority.LOW)
      .dependsOn('analyze-codebase')
      .addTask('review-docs', 'Review documentation quality')
      .withAgent(AgentType.REVIEWER)
      .withPriority(TaskPriority.MEDIUM)
      .dependsOn('generate-api-docs', 'write-guides', 'create-examples')
      .build();
  }

  /**
   * Security audit workflow
   */
  static securityAudit(componentName: string): WorkflowConfig {
    return WorkflowBuilder.parallel('security-audit', `Security Audit: ${componentName}`)
      .withDescription('Comprehensive security audit and remediation')
      .addTask('scan-dependencies', 'Scan dependencies for vulnerabilities')
      .withAgent(AgentType.REVIEWER)
      .withPriority(TaskPriority.CRITICAL)
      .addTask('review-auth', 'Review authentication and authorization')
      .withAgent(AgentType.REVIEWER)
      .withPriority(TaskPriority.CRITICAL)
      .addTask('check-input-validation', 'Check input validation')
      .withAgent(AgentType.REVIEWER)
      .withPriority(TaskPriority.HIGH)
      .addTask('review-crypto', 'Review cryptographic implementations')
      .withAgent(AgentType.REVIEWER)
      .withPriority(TaskPriority.HIGH)
      .addTask('analyze-secrets', 'Analyze secrets management')
      .withAgent(AgentType.CODE_ANALYZER)
      .withPriority(TaskPriority.CRITICAL)
      .addTask('create-remediation-plan', 'Create remediation plan')
      .withAgent(AgentType.PLANNER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn(
        'scan-dependencies',
        'review-auth',
        'check-input-validation',
        'review-crypto',
        'analyze-secrets'
      )
      .addTask('implement-fixes', 'Implement security fixes')
      .withAgent(AgentType.CODER)
      .withPriority(TaskPriority.CRITICAL)
      .dependsOn('create-remediation-plan')
      .build();
  }

  /**
   * Performance optimization workflow
   */
  static performanceOptimization(componentName: string): WorkflowConfig {
    return WorkflowBuilder.sequential(
      'perf-optimization',
      `Performance Optimization: ${componentName}`
    )
      .withDescription('Systematic performance analysis and optimization')
      .addTask('benchmark-current', 'Benchmark current performance')
      .withAgent(AgentType.CODE_ANALYZER)
      .withPriority(TaskPriority.HIGH)
      .addTask('identify-bottlenecks', 'Identify performance bottlenecks')
      .withAgent(AgentType.CODE_ANALYZER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('benchmark-current')
      .addTask('plan-optimizations', 'Plan optimization strategies')
      .withAgent(AgentType.PLANNER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('identify-bottlenecks')
      .addTask('implement-optimizations', 'Implement optimizations')
      .withAgent(AgentType.CODER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('plan-optimizations')
      .addTask('benchmark-optimized', 'Benchmark optimized performance')
      .withAgent(AgentType.CODE_ANALYZER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('implement-optimizations')
      .addTask('validate-improvements', 'Validate performance improvements')
      .withAgent(AgentType.REVIEWER)
      .withPriority(TaskPriority.HIGH)
      .dependsOn('benchmark-optimized')
      .build();
  }
}
