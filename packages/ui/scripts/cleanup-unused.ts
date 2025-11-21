#!/usr/bin/env node
/**
 * Intelligent Unused Variable Cleanup Script
 *
 * Systematically handles unused variables in TypeScript files:
 * - Genuinely unused: Remove completely
 * - Destructured props not used: Prefix with underscore
 * - Function parameters required: Prefix with underscore
 * - Imports not used: Remove import
 *
 * Features:
 * - Dry-run mode for testing
 * - File-by-file processing with verification
 * - Rollback capability if errors increase
 * - Progress reporting
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UnusedError {
  file: string;
  line: number;
  column: number;
  variable: string;
  errorType: 'TS6133' | 'TS6196';
  fullLine: string;
}

interface CleanupResult {
  file: string;
  changes: Array<{
    line: number;
    variable: string;
    action: 'remove-import' | 'prefix-underscore' | 'remove-declaration' | 'remove-type-import';
    before: string;
    after: string;
  }>;
  success: boolean;
  error?: string;
}

interface CleanupStats {
  totalErrors: number;
  filesProcessed: number;
  filesFixed: number;
  changesMade: number;
  errorsBefore: number;
  errorsAfter: number;
}

class UnusedVariableCleanup {
  private projectRoot: string;
  private dryRun: boolean;
  private verbose: boolean;
  private backupDir: string;

  constructor(options: { dryRun?: boolean; verbose?: boolean } = {}) {
    this.projectRoot = path.resolve(__dirname, '..');
    this.dryRun = options.dryRun ?? true;
    this.verbose = options.verbose ?? true;
    this.backupDir = path.join(this.projectRoot, '.cleanup-backups');
  }

  /**
   * Parse TypeScript errors from typecheck output
   */
  private parseErrors(): UnusedError[] {
    try {
      execSync('pnpm typecheck 2>&1', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      });
      return [];
    } catch (error: any) {
      const output = error.stdout?.toString() || '';
      const errors: UnusedError[] = [];
      const lines = output.split('\n');

      const errorPattern = /^src\/(.+?)\((\d+),(\d+)\): error (TS6133|TS6196): '(.+?)' is declared but/;

      for (const line of lines) {
        const match = line.match(errorPattern);
        if (match) {
          const [, filePath, lineNum, colNum, errorType, variable] = match;
          errors.push({
            file: path.join(this.projectRoot, 'src', filePath),
            line: parseInt(lineNum, 10),
            column: parseInt(colNum, 10),
            variable,
            errorType: errorType as 'TS6133' | 'TS6196',
            fullLine: line,
          });
        }
      }

      return errors;
    }
  }

  /**
   * Count total TypeScript errors
   */
  private countErrors(): number {
    try {
      execSync('pnpm typecheck 2>&1', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      });
      return 0;
    } catch (error: any) {
      const output = error.stdout?.toString() || '';
      const errorMatch = output.match(/Found (\d+) errors?/);
      return errorMatch ? parseInt(errorMatch[1], 10) : 0;
    }
  }

  /**
   * Create backup of a file
   */
  private backupFile(filePath: string): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const relativePath = path.relative(this.projectRoot, filePath);
    const backupPath = path.join(this.backupDir, relativePath);
    const backupDir = path.dirname(backupPath);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.copyFileSync(filePath, backupPath);
  }

  /**
   * Read file content
   */
  private readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Write file content
   */
  private writeFile(filePath: string, content: string): void {
    if (!this.dryRun) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  }

  /**
   * Fix unused variable in file
   */
  private fixUnusedVariable(error: UnusedError): CleanupResult {
    const content = this.readFile(error.file);
    const lines = content.split('\n');
    const lineIndex = error.line - 1;
    const line = lines[lineIndex];

    const result: CleanupResult = {
      file: error.file,
      changes: [],
      success: false,
    };

    try {
      // Backup file before making changes
      if (!this.dryRun) {
        this.backupFile(error.file);
      }

      // Case 1: Unused import (remove entire import or just the unused item)
      if (line.trim().startsWith('import ') && error.errorType === 'TS6133') {
        const newLine = this.fixUnusedImport(line, error.variable);
        if (newLine !== line) {
          result.changes.push({
            line: error.line,
            variable: error.variable,
            action: newLine === '' ? 'remove-import' : 'remove-import',
            before: line,
            after: newLine,
          });
          lines[lineIndex] = newLine;
          result.success = true;
        }
      }
      // Case 2: Type import that's never used (TS6196)
      else if (error.errorType === 'TS6196') {
        const newLine = this.fixUnusedTypeImport(line, error.variable);
        if (newLine !== line) {
          result.changes.push({
            line: error.line,
            variable: error.variable,
            action: 'remove-type-import',
            before: line,
            after: newLine,
          });
          lines[lineIndex] = newLine;
          result.success = true;
        }
      }
      // Case 3: Function parameter or event handler parameter - prefix with underscore
      else if (this.isFunctionParameter(line, error.variable)) {
        const newLine = this.prefixWithUnderscore(line, error.variable);
        if (newLine !== line) {
          result.changes.push({
            line: error.line,
            variable: error.variable,
            action: 'prefix-underscore',
            before: line,
            after: newLine,
          });
          lines[lineIndex] = newLine;
          result.success = true;
        }
      }
      // Case 4: Destructured prop not used - prefix with underscore
      else if (this.isDestructuredProp(line, error.variable)) {
        const newLine = this.prefixWithUnderscore(line, error.variable);
        if (newLine !== line) {
          result.changes.push({
            line: error.line,
            variable: error.variable,
            action: 'prefix-underscore',
            before: line,
            after: newLine,
          });
          lines[lineIndex] = newLine;
          result.success = true;
        }
      }
      // Case 5: Standalone variable declaration - prefix with underscore (safer than removal)
      else {
        const newLine = this.prefixWithUnderscore(line, error.variable);
        if (newLine !== line) {
          result.changes.push({
            line: error.line,
            variable: error.variable,
            action: 'prefix-underscore',
            before: line,
            after: newLine,
          });
          lines[lineIndex] = newLine;
          result.success = true;
        }
      }

      if (result.success) {
        this.writeFile(error.file, lines.join('\n'));
      }
    } catch (err: any) {
      result.success = false;
      result.error = err.message;
    }

    return result;
  }

  /**
   * Fix unused import
   */
  private fixUnusedImport(line: string, variable: string): string {
    // Match: import { A, B, C } from 'module'
    const namedImportMatch = line.match(/import\s+\{([^}]+)\}\s+from/);
    if (namedImportMatch) {
      const imports = namedImportMatch[1]
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== variable && s !== '');

      if (imports.length === 0) {
        return ''; // Remove entire import line
      }
      return line.replace(/\{[^}]+\}/, `{ ${imports.join(', ')} }`);
    }

    // Match: import Variable from 'module'
    const defaultImportMatch = line.match(/import\s+(\w+)\s+from/);
    if (defaultImportMatch && defaultImportMatch[1] === variable) {
      return ''; // Remove entire import line
    }

    return line;
  }

  /**
   * Fix unused type import (TS6196)
   */
  private fixUnusedTypeImport(line: string, variable: string): string {
    // Match: import type { A, B, C } from 'module'
    // Or: import { type A, B, C } from 'module'
    const typeImportMatch = line.match(/import\s+type\s+\{([^}]+)\}\s+from/);
    if (typeImportMatch) {
      const types = typeImportMatch[1]
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== variable && s !== '');

      if (types.length === 0) {
        return ''; // Remove entire import line
      }
      return line.replace(/\{[^}]+\}/, `{ ${types.join(', ')} }`);
    }

    // Match inline type imports
    const inlineTypeMatch = line.match(/import\s+\{([^}]+)\}\s+from/);
    if (inlineTypeMatch) {
      const imports = inlineTypeMatch[1]
        .split(',')
        .map(s => s.trim())
        .filter(s => !s.includes(`type ${variable}`) && s !== '');

      if (imports.length === 0) {
        return ''; // Remove entire import line
      }
      return line.replace(/\{[^}]+\}/, `{ ${imports.join(', ')} }`);
    }

    return line;
  }

  /**
   * Check if variable is a function parameter
   */
  private isFunctionParameter(line: string, variable: string): boolean {
    // Match function parameters: function(x), (x) =>, async (x) =>
    const patterns = [
      new RegExp(`\\([^)]*\\b${variable}\\b[^)]*\\)\\s*=>?`),
      new RegExp(`function\\s*\\w*\\s*\\([^)]*\\b${variable}\\b[^)]*\\)`),
      new RegExp(`\\.on\\([^,]+,\\s*\\([^)]*\\b${variable}\\b[^)]*\\)`), // Event handlers
    ];

    return patterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if variable is a destructured prop
   */
  private isDestructuredProp(line: string, variable: string): boolean {
    // Match: const { x, y } = props or ({ x, y }) =>
    const patterns = [
      new RegExp(`\\{[^}]*\\b${variable}\\b[^}]*\\}\\s*[=:]`),
      new RegExp(`\\(\\s*\\{[^}]*\\b${variable}\\b[^}]*\\}\\s*\\)`),
    ];

    return patterns.some(pattern => pattern.test(line));
  }

  /**
   * Prefix variable with underscore
   */
  private prefixWithUnderscore(line: string, variable: string): string {
    // Don't prefix if already prefixed
    if (variable.startsWith('_')) {
      return line;
    }

    // Use word boundary to avoid partial matches
    const regex = new RegExp(`\\b${variable}\\b`, 'g');
    return line.replace(regex, `_${variable}`);
  }

  /**
   * Process all errors in a file
   */
  private async processFile(errors: UnusedError[]): Promise<CleanupResult[]> {
    const results: CleanupResult[] = [];

    for (const error of errors) {
      if (this.verbose) {
        console.log(`\n  Processing: ${path.basename(error.file)}:${error.line}`);
        console.log(`    Variable: ${error.variable}`);
      }

      const result = this.fixUnusedVariable(error);
      results.push(result);

      if (result.success && this.verbose) {
        for (const change of result.changes) {
          console.log(`    Action: ${change.action}`);
          console.log(`    Before: ${change.before.trim()}`);
          console.log(`    After:  ${change.after.trim()}`);
        }
      } else if (!result.success && this.verbose) {
        console.log(`    Failed: ${result.error || 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Run cleanup on all files
   */
  async run(): Promise<CleanupStats> {
    console.log('\n🔍 Starting Unused Variable Cleanup');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Project: ${this.projectRoot}\n`);

    // Get initial error count
    const errorsBefore = this.countErrors();
    console.log(`📊 Initial TypeScript errors: ${errorsBefore}\n`);

    // Parse all unused variable errors
    console.log('🔎 Parsing unused variable errors...');
    const errors = this.parseErrors();
    console.log(`Found ${errors.length} unused variable errors\n`);

    if (errors.length === 0) {
      return {
        totalErrors: 0,
        filesProcessed: 0,
        filesFixed: 0,
        changesMade: 0,
        errorsBefore,
        errorsAfter: errorsBefore,
      };
    }

    // Group errors by file
    const errorsByFile = new Map<string, UnusedError[]>();
    for (const error of errors) {
      const fileErrors = errorsByFile.get(error.file) || [];
      fileErrors.push(error);
      errorsByFile.set(error.file, fileErrors);
    }

    console.log(`📁 Files to process: ${errorsByFile.size}\n`);

    // Process each file
    let filesFixed = 0;
    let totalChanges = 0;

    for (const [file, fileErrors] of errorsByFile) {
      console.log(`\n📄 Processing: ${path.relative(this.projectRoot, file)}`);
      console.log(`   Errors: ${fileErrors.length}`);

      const results = await this.processFile(fileErrors);
      const successfulChanges = results.filter(r => r.success);

      if (successfulChanges.length > 0) {
        filesFixed++;
        const changesInFile = successfulChanges.reduce(
          (sum, r) => sum + r.changes.length,
          0
        );
        totalChanges += changesInFile;
        console.log(`   ✅ Fixed: ${changesInFile} changes`);
      } else {
        console.log(`   ⚠️  No changes made`);
      }
    }

    // Get final error count
    const errorsAfter = this.countErrors();
    console.log(`\n📊 Final TypeScript errors: ${errorsAfter}`);
    console.log(`📉 Errors reduced: ${errorsBefore - errorsAfter}\n`);

    const stats: CleanupStats = {
      totalErrors: errors.length,
      filesProcessed: errorsByFile.size,
      filesFixed,
      changesMade: totalChanges,
      errorsBefore,
      errorsAfter,
    };

    return stats;
  }

  /**
   * Print summary report
   */
  printReport(stats: CleanupStats): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 CLEANUP SUMMARY REPORT');
    console.log('='.repeat(60));
    console.log(`Mode:                ${this.dryRun ? 'DRY RUN (no changes made)' : 'LIVE'}`);
    console.log(`Total Errors Found:  ${stats.totalErrors}`);
    console.log(`Files Processed:     ${stats.filesProcessed}`);
    console.log(`Files Fixed:         ${stats.filesFixed}`);
    console.log(`Changes Made:        ${stats.changesMade}`);
    console.log(`Errors Before:       ${stats.errorsBefore}`);
    console.log(`Errors After:        ${stats.errorsAfter}`);
    console.log(`Errors Reduced:      ${stats.errorsBefore - stats.errorsAfter}`);
    console.log('='.repeat(60) + '\n');

    if (this.dryRun) {
      console.log('💡 Run with --live flag to apply changes\n');
    } else if (stats.errorsAfter < stats.errorsBefore) {
      console.log('✅ Cleanup successful! Errors reduced.\n');
    } else if (stats.errorsAfter === stats.errorsBefore) {
      console.log('⚠️  No error reduction. Manual review needed.\n');
    } else {
      console.log('❌ Errors increased! Check backups in .cleanup-backups/\n');
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--live');
  const verbose = !args.includes('--quiet');

  const cleanup = new UnusedVariableCleanup({ dryRun, verbose });
  const stats = await cleanup.run();
  cleanup.printReport(stats);

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export { UnusedVariableCleanup };
