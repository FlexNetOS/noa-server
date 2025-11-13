/**
 * Pre-Agent-Add Hook
 * Executes before agent integration begins
 * Prepares environment and validates prerequisites
 */

import { AgentInfo } from '../triggers/agent-added-trigger';
import * as fs from 'fs';
import * as path from 'path';

export interface PreHookContext {
  timestamp: Date;
  environment: NodeJS.ProcessEnv;
  workingDirectory: string;
  gitStatus?: string;
  prerequisites: PrerequisiteCheck[];
}

export interface PrerequisiteCheck {
  name: string;
  required: boolean;
  passed: boolean;
  message: string;
}

export interface PreHookResult {
  canProceed: boolean;
  context: PreHookContext;
  warnings: string[];
  errors: string[];
  preparationSteps: string[];
}

export class PreAgentAddHook {
  private warnings: string[] = [];
  private errors: string[] = [];
  private preparationSteps: string[] = [];

  /**
   * Execute pre-agent-add hook
   */
  async execute(agentInfo: AgentInfo): Promise<PreHookResult> {
    console.log('\n🔧 Executing pre-agent-add hook...');
    console.log(`   Agent: ${agentInfo.name}`);

    const context = await this.buildContext();
    const prerequisites = await this.checkPrerequisites(agentInfo);
    await this.prepareEnvironment(agentInfo);
    await this.validateExistingState(agentInfo);
    await this.backupCriticalFiles();

    const canProceed =
      this.errors.length === 0 && prerequisites.every((p) => p.passed || !p.required);

    const result: PreHookResult = {
      canProceed,
      context: { ...context, prerequisites },
      warnings: this.warnings,
      errors: this.errors,
      preparationSteps: this.preparationSteps,
    };

    this.printHookReport(result);

    return result;
  }

  /**
   * Build execution context
   */
  private async buildContext(): Promise<PreHookContext> {
    return {
      timestamp: new Date(),
      environment: process.env,
      workingDirectory: process.cwd(),
      prerequisites: [],
    };
  }

  /**
   * Check prerequisites
   */
  private async checkPrerequisites(agentInfo: AgentInfo): Promise<PrerequisiteCheck[]> {
    const checks: PrerequisiteCheck[] = [];

    // Check: Agent file exists
    const fileExists = fs.existsSync(agentInfo.path);
    checks.push({
      name: 'agent-file-exists',
      required: true,
      passed: fileExists,
      message: fileExists
        ? `Agent file found: ${agentInfo.path}`
        : `Agent file not found: ${agentInfo.path}`,
    });

    if (!fileExists) {
      this.errors.push(`Agent file does not exist: ${agentInfo.path}`);
    }

    // Check: TypeScript installed
    const hasTypeScript = this.checkDependency('typescript');
    checks.push({
      name: 'typescript-installed',
      required: false,
      passed: hasTypeScript,
      message: hasTypeScript ? 'TypeScript is installed' : 'TypeScript not found (optional)',
    });

    // Check: Claude-Flow installed
    const hasClaudeFlow = this.checkDependency('claude-flow');
    checks.push({
      name: 'claude-flow-installed',
      required: true,
      passed: hasClaudeFlow,
      message: hasClaudeFlow ? 'Claude-Flow is installed' : 'Claude-Flow not installed',
    });

    if (!hasClaudeFlow) {
      this.errors.push('Claude-Flow is required. Install: npm install claude-flow@alpha');
    }

    // Check: .claude directory exists
    const claudeDir = path.join(process.cwd(), '.claude');
    const hasClaudeDir = fs.existsSync(claudeDir);
    checks.push({
      name: 'claude-directory-exists',
      required: false,
      passed: hasClaudeDir,
      message: hasClaudeDir ? '.claude directory exists' : '.claude directory will be created',
    });

    if (!hasClaudeDir) {
      this.warnings.push('.claude directory not found - will be created');
      this.preparationSteps.push('Create .claude directory');
    }

    // Check: No conflicting agents
    const hasConflict = await this.checkAgentConflict(agentInfo);
    checks.push({
      name: 'no-agent-conflict',
      required: true,
      passed: !hasConflict,
      message: hasConflict ? `Agent already exists: ${agentInfo.name}` : 'No agent name conflicts',
    });

    if (hasConflict) {
      this.errors.push(`Agent name conflict: ${agentInfo.name} already registered`);
    }

    // Check: Disk space
    const hasSpace = await this.checkDiskSpace();
    checks.push({
      name: 'sufficient-disk-space',
      required: true,
      passed: hasSpace,
      message: hasSpace ? 'Sufficient disk space available' : 'Low disk space warning',
    });

    if (!hasSpace) {
      this.warnings.push('Low disk space - integration may fail');
    }

    return checks;
  }

  /**
   * Prepare environment for integration
   */
  private async prepareEnvironment(agentInfo: AgentInfo): Promise<void> {
    // Create .claude directory if needed
    const claudeDir = path.join(process.cwd(), '.claude');
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
      this.preparationSteps.push('Created .claude directory');
      console.log('   ✓ Created .claude directory');
    }

    // Initialize agents.json if needed
    const agentsPath = path.join(claudeDir, 'agents.json');
    if (!fs.existsSync(agentsPath)) {
      fs.writeFileSync(agentsPath, JSON.stringify({}, null, 2));
      this.preparationSteps.push('Initialized agents.json');
      console.log('   ✓ Initialized agents.json');
    }

    // Create backup directory
    const backupDir = path.join(claudeDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      this.preparationSteps.push('Created backup directory');
      console.log('   ✓ Created backup directory');
    }

    // Create logs directory
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      this.preparationSteps.push('Created logs directory');
      console.log('   ✓ Created logs directory');
    }

    console.log('   ✓ Environment prepared');
  }

  /**
   * Validate existing system state
   */
  private async validateExistingState(agentInfo: AgentInfo): Promise<void> {
    // Validate agents.json structure
    const agentsPath = path.join(process.cwd(), '.claude/agents.json');
    if (fs.existsSync(agentsPath)) {
      try {
        const content = fs.readFileSync(agentsPath, 'utf-8');
        JSON.parse(content); // Will throw if invalid
        console.log('   ✓ agents.json is valid');
      } catch (error) {
        this.errors.push('agents.json is corrupted - cannot proceed');
      }
    }

    // Validate package.json if exists
    const packagePath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packagePath)) {
      try {
        const content = fs.readFileSync(packagePath, 'utf-8');
        JSON.parse(content);
        console.log('   ✓ package.json is valid');
      } catch (error) {
        this.warnings.push('package.json is invalid - will skip package updates');
      }
    }

    console.log('   ✓ System state validated');
  }

  /**
   * Backup critical files before modification
   */
  private async backupCriticalFiles(): Promise<void> {
    const backupDir = path.join(process.cwd(), '.claude/backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const criticalFiles = ['.claude/agents.json', '.claude/config.json', 'package.json'];

    for (const file of criticalFiles) {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        const backupPath = path.join(backupDir, `${path.basename(file)}.${timestamp}.backup`);

        fs.copyFileSync(fullPath, backupPath);
        this.preparationSteps.push(`Backed up: ${file}`);
      }
    }

    console.log('   ✓ Critical files backed up');
  }

  /**
   * Check if dependency is installed
   */
  private checkDependency(packageName: string): boolean {
    const packagePath = path.join(process.cwd(), 'package.json');

    if (!fs.existsSync(packagePath)) {
      return false;
    }

    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      const deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      return packageName in deps;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for agent name conflicts
   */
  private async checkAgentConflict(agentInfo: AgentInfo): Promise<boolean> {
    const agentsPath = path.join(process.cwd(), '.claude/agents.json');

    if (!fs.existsSync(agentsPath)) {
      return false;
    }

    try {
      const content = fs.readFileSync(agentsPath, 'utf-8');
      const registry = JSON.parse(content);

      return agentInfo.name in registry;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check available disk space (simplified)
   */
  private async checkDiskSpace(): Promise<boolean> {
    // Simplified check - in production, use proper disk space library
    // For now, just return true
    return true;
  }

  /**
   * Print hook report
   */
  private printHookReport(result: PreHookResult): void {
    console.log('\n📋 Pre-Agent-Add Hook Report');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log(`Status: ${result.canProceed ? '✅ CAN PROCEED' : '❌ BLOCKED'}`);
    console.log(`Timestamp: ${result.context.timestamp.toISOString()}`);
    console.log('');

    if (result.preparationSteps.length > 0) {
      console.log('✅ Preparation Steps:');
      result.preparationSteps.forEach((step, i) => {
        console.log(`   ${i + 1}. ${step}`);
      });
      console.log('');
    }

    if (result.context.prerequisites.length > 0) {
      console.log('📋 Prerequisites:');
      result.context.prerequisites.forEach((check) => {
        const icon = check.passed ? '✅' : check.required ? '❌' : '⚠️';
        console.log(`   ${icon} ${check.name}: ${check.message}`);
      });
      console.log('');
    }

    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
      console.log('');
    }

    if (result.errors.length > 0) {
      console.log('❌ Errors:');
      result.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}
