/**
 * Validation Runner
 * Validates cross-references and consistency after agent integration
 */

import { AgentInfo } from '../triggers/agent-added-trigger';
import * as fs from 'fs';
import * as path from 'path';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'reference' | 'config' | 'import' | 'registry' | 'documentation';
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface ValidationResult {
  passed: boolean;
  totalChecks: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  duration: number;
}

export class ValidationRunner {
  private issues: ValidationIssue[] = [];
  private checksPerformed: number = 0;

  /**
   * Run complete validation suite
   */
  async validate(agentInfo: AgentInfo, context: Map<string, any>): Promise<ValidationResult> {
    console.log('\n🔍 Running validation suite...');
    const startTime = Date.now();

    this.issues = [];
    this.checksPerformed = 0;

    // Run all validation checks
    await this.validateAgentFile(agentInfo);
    await this.validateRegistry(agentInfo, context);
    await this.validatePackageJson(agentInfo);
    await this.validateImportExports(agentInfo);
    await this.validateDocumentation(agentInfo);
    await this.validateCrossReferences(agentInfo);
    await this.validateConfiguration(agentInfo);
    await this.validateTestFiles(agentInfo);

    const duration = Date.now() - startTime;

    const errors = this.issues.filter((i) => i.type === 'error');
    const warnings = this.issues.filter((i) => i.type === 'warning');
    const info = this.issues.filter((i) => i.type === 'info');

    const result: ValidationResult = {
      passed: errors.length === 0,
      totalChecks: this.checksPerformed,
      errors,
      warnings,
      info,
      duration,
    };

    this.printValidationReport(result);

    return result;
  }

  /**
   * Validate agent file exists and is properly structured
   */
  private async validateAgentFile(agentInfo: AgentInfo): Promise<void> {
    this.checksPerformed++;

    if (!fs.existsSync(agentInfo.path)) {
      this.issues.push({
        type: 'error',
        category: 'reference',
        message: `Agent file not found: ${agentInfo.path}`,
        file: agentInfo.path,
        suggestion: 'Ensure the agent file was created successfully',
      });
      return;
    }

    const content = fs.readFileSync(agentInfo.path, 'utf-8');

    // Check for class definition
    this.checksPerformed++;
    const hasClass = /export\s+class\s+\w+/i.test(content);
    if (!hasClass) {
      this.issues.push({
        type: 'warning',
        category: 'reference',
        message: `Agent file missing exported class: ${agentInfo.path}`,
        file: agentInfo.path,
        suggestion: 'Add: export class YourAgent { ... }',
      });
    }

    // Check for TypeScript syntax
    this.checksPerformed++;
    if (!agentInfo.path.endsWith('.ts') && !agentInfo.path.endsWith('.tsx')) {
      this.issues.push({
        type: 'warning',
        category: 'reference',
        message: `Agent file is not TypeScript: ${agentInfo.path}`,
        file: agentInfo.path,
      });
    }

    console.log(`   ✓ Agent file validated: ${agentInfo.name}`);
  }

  /**
   * Validate registry entry
   */
  private async validateRegistry(agentInfo: AgentInfo, context: Map<string, any>): Promise<void> {
    this.checksPerformed++;

    const registry = context.get('registry');
    if (!registry) {
      this.issues.push({
        type: 'error',
        category: 'registry',
        message: 'Registry not found in context',
        suggestion: 'Ensure register-agent step ran successfully',
      });
      return;
    }

    this.checksPerformed++;
    if (!registry[agentInfo.name]) {
      this.issues.push({
        type: 'error',
        category: 'registry',
        message: `Agent not found in registry: ${agentInfo.name}`,
        suggestion: 'Check register-agent step execution',
      });
      return;
    }

    const entry = registry[agentInfo.name];

    // Validate registry entry structure
    this.checksPerformed++;
    if (!entry.name || !entry.type || !entry.path) {
      this.issues.push({
        type: 'error',
        category: 'registry',
        message: `Incomplete registry entry for: ${agentInfo.name}`,
        suggestion: 'Registry entry must have: name, type, path',
      });
    }

    // Validate path matches
    this.checksPerformed++;
    if (entry.path !== agentInfo.path) {
      this.issues.push({
        type: 'warning',
        category: 'registry',
        message: `Path mismatch in registry for: ${agentInfo.name}`,
        file: '.claude/agents.json',
        suggestion: `Expected: ${agentInfo.path}, Got: ${entry.path}`,
      });
    }

    console.log(`   ✓ Registry validated: ${agentInfo.name}`);
  }

  /**
   * Validate package.json updates
   */
  private async validatePackageJson(agentInfo: AgentInfo): Promise<void> {
    const packagePath = path.join(process.cwd(), 'package.json');

    this.checksPerformed++;
    if (!fs.existsSync(packagePath)) {
      this.issues.push({
        type: 'info',
        category: 'config',
        message: 'package.json not found (optional)',
        file: packagePath,
      });
      return;
    }

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    // Check keywords
    this.checksPerformed++;
    const agentKeyword = `agent-${agentInfo.name}`;
    if (pkg.keywords && !pkg.keywords.includes(agentKeyword)) {
      this.issues.push({
        type: 'warning',
        category: 'config',
        message: `Agent keyword missing from package.json: ${agentKeyword}`,
        file: packagePath,
        suggestion: `Add "${agentKeyword}" to keywords array`,
      });
    }

    console.log('   ✓ package.json validated');
  }

  /**
   * Validate import/export statements
   */
  private async validateImportExports(agentInfo: AgentInfo): Promise<void> {
    if (!fs.existsSync(agentInfo.path)) {
      return;
    }

    const content = fs.readFileSync(agentInfo.path, 'utf-8');
    const imports = this.extractImports(content);

    for (const importPath of imports) {
      this.checksPerformed++;

      // Skip node_modules
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        continue;
      }

      // Resolve relative path
      const resolvedPath = this.resolveImportPath(agentInfo.path, importPath);

      if (resolvedPath && !fs.existsSync(resolvedPath)) {
        this.issues.push({
          type: 'error',
          category: 'import',
          message: `Import not found: ${importPath}`,
          file: agentInfo.path,
          suggestion: `Check that ${resolvedPath} exists`,
        });
      }
    }

    console.log('   ✓ Imports/exports validated');
  }

  /**
   * Validate documentation references
   */
  private async validateDocumentation(agentInfo: AgentInfo): Promise<void> {
    const docPaths = ['README.md', 'docs/README.md', 'CLAUDE.md', 'docs/agents.md'];

    let foundReference = false;

    for (const docPath of docPaths) {
      const fullPath = path.join(process.cwd(), docPath);

      this.checksPerformed++;
      if (!fs.existsSync(fullPath)) {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');

      // Check if agent is mentioned
      if (content.includes(agentInfo.name)) {
        foundReference = true;
        break;
      }
    }

    if (!foundReference) {
      this.issues.push({
        type: 'warning',
        category: 'documentation',
        message: `Agent not documented: ${agentInfo.name}`,
        suggestion: 'Add agent to README.md or docs/agents.md',
      });
    } else {
      console.log('   ✓ Documentation validated');
    }
  }

  /**
   * Validate cross-references between files
   */
  private async validateCrossReferences(agentInfo: AgentInfo): Promise<void> {
    const referencePaths = [
      '.claude/agents.json',
      '.claude/config.json',
      'src/index.ts',
      'src/agents/index.ts',
    ];

    for (const refPath of referencePaths) {
      this.checksPerformed++;
      const fullPath = path.join(process.cwd(), refPath);

      if (!fs.existsSync(fullPath)) {
        continue;
      }

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');

        // For JSON files, validate structure
        if (refPath.endsWith('.json')) {
          JSON.parse(content); // Will throw if invalid
        }

        // Check for agent references
        if (content.includes(agentInfo.name) || content.includes(agentInfo.className || '')) {
          console.log(`   ✓ Cross-reference found: ${refPath}`);
        }
      } catch (error) {
        this.issues.push({
          type: 'error',
          category: 'reference',
          message: `Invalid file format: ${refPath}`,
          file: fullPath,
          suggestion: error instanceof Error ? error.message : 'Check file syntax',
        });
      }
    }
  }

  /**
   * Validate configuration files
   */
  private async validateConfiguration(agentInfo: AgentInfo): Promise<void> {
    const configPaths = [
      '.claude/config.json',
      'tsconfig.json',
      'src/agent-swarm/triggers/trigger-config.json',
    ];

    for (const configPath of configPaths) {
      this.checksPerformed++;
      const fullPath = path.join(process.cwd(), configPath);

      if (!fs.existsSync(fullPath)) {
        continue;
      }

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        JSON.parse(content); // Validate JSON syntax
        console.log(`   ✓ Config validated: ${configPath}`);
      } catch (error) {
        this.issues.push({
          type: 'error',
          category: 'config',
          message: `Invalid JSON in: ${configPath}`,
          file: fullPath,
          suggestion: error instanceof Error ? error.message : 'Fix JSON syntax',
        });
      }
    }
  }

  /**
   * Validate test files exist
   */
  private async validateTestFiles(agentInfo: AgentInfo): Promise<void> {
    const testPaths = [
      `tests/${agentInfo.name}.test.ts`,
      `tests/${agentInfo.name}/${agentInfo.name}.test.ts`,
      `src/${agentInfo.name}/${agentInfo.name}.test.ts`,
    ];

    let foundTest = false;

    for (const testPath of testPaths) {
      this.checksPerformed++;
      const fullPath = path.join(process.cwd(), testPath);

      if (fs.existsSync(fullPath)) {
        foundTest = true;
        console.log(`   ✓ Test file found: ${testPath}`);
        break;
      }
    }

    if (!foundTest) {
      this.issues.push({
        type: 'warning',
        category: 'reference',
        message: `No test file found for: ${agentInfo.name}`,
        suggestion: `Create test at: tests/${agentInfo.name}.test.ts`,
      });
    }
  }

  /**
   * Extract import statements from code
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Resolve relative import path
   */
  private resolveImportPath(fromFile: string, importPath: string): string | null {
    const dir = path.dirname(fromFile);
    let resolved = path.resolve(dir, importPath);

    // Try with .ts extension
    if (fs.existsSync(resolved + '.ts')) {
      return resolved + '.ts';
    }

    // Try with .tsx extension
    if (fs.existsSync(resolved + '.tsx')) {
      return resolved + '.tsx';
    }

    // Try with index.ts
    if (fs.existsSync(path.join(resolved, 'index.ts'))) {
      return path.join(resolved, 'index.ts');
    }

    // Try as-is
    if (fs.existsSync(resolved)) {
      return resolved;
    }

    return null;
  }

  /**
   * Print validation report
   */
  private printValidationReport(result: ValidationResult): void {
    console.log('\n📊 Validation Report');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Checks: ${result.totalChecks}`);
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('');

    if (result.errors.length > 0) {
      console.log(`❌ Errors (${result.errors.length}):`);
      result.errors.forEach((issue, i) => {
        console.log(`   ${i + 1}. [${issue.category}] ${issue.message}`);
        if (issue.file) console.log(`      File: ${issue.file}`);
        if (issue.suggestion) console.log(`      💡 ${issue.suggestion}`);
      });
      console.log('');
    }

    if (result.warnings.length > 0) {
      console.log(`⚠️  Warnings (${result.warnings.length}):`);
      result.warnings.forEach((issue, i) => {
        console.log(`   ${i + 1}. [${issue.category}] ${issue.message}`);
        if (issue.suggestion) console.log(`      💡 ${issue.suggestion}`);
      });
      console.log('');
    }

    if (result.info.length > 0) {
      console.log(`ℹ️  Info (${result.info.length}):`);
      result.info.forEach((issue, i) => {
        console.log(`   ${i + 1}. [${issue.category}] ${issue.message}`);
      });
      console.log('');
    }

    if (result.passed) {
      console.log('✅ All critical validations passed!');
    } else {
      console.log('❌ Validation failed - please fix errors above');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Get validation statistics
   */
  getStatistics(): {
    totalIssues: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const byType: Record<string, number> = {
      error: this.issues.filter((i) => i.type === 'error').length,
      warning: this.issues.filter((i) => i.type === 'warning').length,
      info: this.issues.filter((i) => i.type === 'info').length,
    };

    const byCategory: Record<string, number> = {};
    this.issues.forEach((issue) => {
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
    });

    return {
      totalIssues: this.issues.length,
      byType,
      byCategory,
    };
  }
}
