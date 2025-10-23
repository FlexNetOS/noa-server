#!/usr/bin/env node

/**
 * License Compliance Checker
 *
 * Scans project dependencies for license compliance issues and validates
 * against an approved licenses list. Supports multiple license formats
 * and provides detailed reporting.
 *
 * Usage:
 *   ts-node check-licenses.ts [options]
 *
 * Options:
 *   --config=<path>        Path to approved-licenses.json (default: ./approved-licenses.json)
 *   --format=<json|csv|markdown>  Output format (default: markdown)
 *   --strict               Fail on any non-approved license
 *   --exclude=<packages>   Comma-separated list of packages to exclude
 *   --output=<path>        Output file path
 *   --help                 Show help message
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

interface LicenseConfig {
  approved: string[];
  conditionallyApproved: {
    license: string;
    conditions: string;
  }[];
  rejected: string[];
  customRules?: {
    package: string;
    allowedLicense: string;
    reason: string;
  }[];
}

interface PackageLicense {
  name: string;
  version: string;
  license: string;
  repository?: string;
  path: string;
  isDev: boolean;
  isApproved: boolean;
  isConditional: boolean;
  isRejected: boolean;
  notes?: string;
}

interface ComplianceReport {
  timestamp: string;
  totalPackages: number;
  approvedPackages: number;
  conditionalPackages: number;
  rejectedPackages: number;
  unknownPackages: number;
  packages: PackageLicense[];
  summary: {
    compliant: boolean;
    issues: string[];
  };
}

class LicenseChecker {
  private projectRoot: string;
  private configPath: string;
  private config: LicenseConfig;
  private format: string;
  private strict: boolean;
  private exclude: Set<string>;
  private outputPath?: string;

  constructor() {
    this.projectRoot = resolve(__dirname, '../..');
    this.configPath = join(__dirname, 'approved-licenses.json');
    this.format = 'markdown';
    this.strict = false;
    this.exclude = new Set();

    this.parseArguments();
    this.loadConfig();
  }

  private parseArguments(): void {
    const args = process.argv.slice(2);

    for (const arg of args) {
      if (arg.startsWith('--config=')) {
        this.configPath = arg.split('=')[1];
      } else if (arg.startsWith('--format=')) {
        this.format = arg.split('=')[1];
      } else if (arg === '--strict') {
        this.strict = true;
      } else if (arg.startsWith('--exclude=')) {
        const packages = arg.split('=')[1].split(',');
        packages.forEach((p) => this.exclude.add(p.trim()));
      } else if (arg.startsWith('--output=')) {
        this.outputPath = arg.split('=')[1];
      } else if (arg === '--help') {
        this.showHelp();
        process.exit(0);
      }
    }
  }

  private showHelp(): void {
    console.log(`
License Compliance Checker

Usage:
  ts-node check-licenses.ts [options]

Options:
  --config=<path>        Path to approved-licenses.json (default: ./approved-licenses.json)
  --format=<json|csv|markdown>  Output format (default: markdown)
  --strict               Fail on any non-approved license
  --exclude=<packages>   Comma-separated list of packages to exclude
  --output=<path>        Output file path
  --help                 Show help message

Examples:
  # Check licenses with default config
  ts-node check-licenses.ts

  # Check with strict mode and custom config
  ts-node check-licenses.ts --strict --config=./custom-licenses.json

  # Generate CSV report excluding specific packages
  ts-node check-licenses.ts --format=csv --exclude=test-pkg,dev-pkg --output=licenses.csv

  # Generate JSON report
  ts-node check-licenses.ts --format=json --output=licenses.json
    `);
  }

  private loadConfig(): void {
    if (!existsSync(this.configPath)) {
      console.error(`Config file not found: ${this.configPath}`);
      console.error('Creating default configuration...');
      this.createDefaultConfig();
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
    } catch (error) {
      console.error('Error loading config:', error);
      process.exit(1);
    }
  }

  private createDefaultConfig(): void {
    const defaultConfig: LicenseConfig = {
      approved: [
        'MIT',
        'Apache-2.0',
        'BSD-2-Clause',
        'BSD-3-Clause',
        'ISC',
        'CC0-1.0',
        'Unlicense',
        'Python-2.0',
      ],
      conditionallyApproved: [
        {
          license: 'GPL-3.0',
          conditions: 'Review required for GPL compatibility',
        },
        {
          license: 'LGPL-3.0',
          conditions: 'Acceptable for libraries, review for core dependencies',
        },
      ],
      rejected: ['AGPL-3.0', 'GPL-2.0', 'SSPL-1.0', 'Commons Clause'],
      customRules: [],
    };

    writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
    this.config = defaultConfig;
  }

  private getAllPackageLicenses(): PackageLicense[] {
    console.log('Scanning package licenses...');

    try {
      // Use license-checker or npm ls to get license info
      const npmLsOutput = execSync('npm ls --all --json --long 2>/dev/null || true', {
        cwd: this.projectRoot,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf-8',
      });

      const data = JSON.parse(npmLsOutput);
      const packages: PackageLicense[] = [];

      const traverseDependencies = (deps: any, isDev = false, path = '') => {
        if (!deps) {
          return;
        }

        for (const [name, info] of Object.entries<any>(deps)) {
          if (this.exclude.has(name)) {
            continue;
          }

          const license = this.normalizeLicense(info.license || 'UNKNOWN');
          const isApproved = this.config.approved.includes(license);
          const isConditional = this.config.conditionallyApproved.some(
            (c) => c.license === license
          );
          const isRejected = this.config.rejected.includes(license);

          // Check custom rules
          const customRule = this.config.customRules?.find((r) => r.package === name);

          packages.push({
            name,
            version: info.version || 'unknown',
            license,
            repository: info.repository?.url,
            path: path ? `${path} > ${name}` : name,
            isDev,
            isApproved: customRule ? true : isApproved,
            isConditional: customRule ? false : isConditional,
            isRejected: customRule ? false : isRejected,
            notes: customRule?.reason,
          });

          // Recursively traverse nested dependencies
          if (info.dependencies) {
            traverseDependencies(info.dependencies, isDev, path ? `${path} > ${name}` : name);
          }
        }
      };

      traverseDependencies(data.dependencies, false);
      if (data.devDependencies) {
        traverseDependencies(data.devDependencies, true);
      }

      return packages;
    } catch (error) {
      console.error('Error scanning packages:', error);
      return [];
    }
  }

  private normalizeLicense(license: string): string {
    if (!license || license === 'UNLICENSED') {
      return 'UNKNOWN';
    }

    // Handle SPDX expressions
    license = license
      .replace(/[()]/g, '')
      .split(/\s+(OR|AND)\s+/)[0]
      .trim();

    // Common variations
    const mapping: { [key: string]: string } = {
      'MIT License': 'MIT',
      'Apache License 2.0': 'Apache-2.0',
      BSD: 'BSD-3-Clause',
      'ISC License': 'ISC',
    };

    return mapping[license] || license;
  }

  private generateReport(): ComplianceReport {
    const packages = this.getAllPackageLicenses();

    const approved = packages.filter((p) => p.isApproved).length;
    const conditional = packages.filter((p) => p.isConditional).length;
    const rejected = packages.filter((p) => p.isRejected).length;
    const unknown = packages.filter(
      (p) => !p.isApproved && !p.isConditional && !p.isRejected
    ).length;

    const issues: string[] = [];

    if (rejected > 0) {
      issues.push(`${rejected} packages use rejected licenses`);
    }

    if (conditional > 0) {
      issues.push(`${conditional} packages require license review`);
    }

    if (unknown > 0) {
      issues.push(`${unknown} packages have unknown or unrecognized licenses`);
    }

    const compliant = this.strict ? rejected === 0 && unknown === 0 : rejected === 0;

    return {
      timestamp: new Date().toISOString(),
      totalPackages: packages.length,
      approvedPackages: approved,
      conditionalPackages: conditional,
      rejectedPackages: rejected,
      unknownPackages: unknown,
      packages,
      summary: {
        compliant,
        issues,
      },
    };
  }

  private formatMarkdown(report: ComplianceReport): string {
    let output = `# License Compliance Report\n\n`;
    output += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n`;
    output += `**Compliance Status:** ${report.summary.compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}\n\n`;

    output += `## Summary\n\n`;
    output += `- **Total Packages:** ${report.totalPackages}\n`;
    output += `- **Approved:** ${report.approvedPackages}\n`;
    output += `- **Conditional:** ${report.conditionalPackages}\n`;
    output += `- **Rejected:** ${report.rejectedPackages}\n`;
    output += `- **Unknown:** ${report.unknownPackages}\n\n`;

    if (report.summary.issues.length > 0) {
      output += `## Issues\n\n`;
      report.summary.issues.forEach((issue) => {
        output += `- ${issue}\n`;
      });
      output += `\n`;
    }

    // Rejected licenses
    const rejected = report.packages.filter((p) => p.isRejected);
    if (rejected.length > 0) {
      output += `## ❌ Rejected Licenses (${rejected.length})\n\n`;
      output += `| Package | Version | License | Path |\n`;
      output += `|---------|---------|---------|------|\n`;
      rejected.forEach((p) => {
        output += `| ${p.name} | ${p.version} | ${p.license} | ${p.path} |\n`;
      });
      output += `\n`;
    }

    // Conditional licenses
    const conditional = report.packages.filter((p) => p.isConditional);
    if (conditional.length > 0) {
      output += `## ⚠️  Conditional Licenses (${conditional.length})\n\n`;
      output += `| Package | Version | License | Conditions |\n`;
      output += `|---------|---------|---------|------------|\n`;
      conditional.forEach((p) => {
        const condition = this.config.conditionallyApproved.find((c) => c.license === p.license);
        output += `| ${p.name} | ${p.version} | ${p.license} | ${condition?.conditions || 'N/A'} |\n`;
      });
      output += `\n`;
    }

    // Unknown licenses
    const unknown = report.packages.filter(
      (p) => !p.isApproved && !p.isConditional && !p.isRejected
    );
    if (unknown.length > 0) {
      output += `## ❓ Unknown Licenses (${unknown.length})\n\n`;
      output += `| Package | Version | License |\n`;
      output += `|---------|---------|----------|\n`;
      unknown.forEach((p) => {
        output += `| ${p.name} | ${p.version} | ${p.license} |\n`;
      });
      output += `\n`;
    }

    return output;
  }

  private formatJson(report: ComplianceReport): string {
    return JSON.stringify(report, null, 2);
  }

  private formatCsv(report: ComplianceReport): string {
    let csv = 'Package,Version,License,Status,Is Dev,Notes\n';

    report.packages.forEach((p) => {
      const status = p.isRejected
        ? 'Rejected'
        : p.isConditional
          ? 'Conditional'
          : p.isApproved
            ? 'Approved'
            : 'Unknown';

      csv += `"${p.name}","${p.version}","${p.license}","${status}","${p.isDev}","${p.notes || ''}"\n`;
    });

    return csv;
  }

  public run(): void {
    console.log('Starting license compliance check...');
    console.log(`Configuration: ${this.configPath}`);
    console.log(`Strict mode: ${this.strict}`);

    const report = this.generateReport();

    let output: string;
    let extension: string;

    switch (this.format) {
      case 'json':
        output = this.formatJson(report);
        extension = 'json';
        break;
      case 'csv':
        output = this.formatCsv(report);
        extension = 'csv';
        break;
      case 'markdown':
      default:
        output = this.formatMarkdown(report);
        extension = 'md';
        break;
    }

    const defaultOutput = join(
      this.projectRoot,
      'logs',
      'compliance',
      `license-check-${Date.now()}.${extension}`
    );
    const outputPath = this.outputPath || defaultOutput;

    // Ensure directory exists
    const outputDir = join(this.projectRoot, 'logs', 'compliance');
    execSync(`mkdir -p "${outputDir}"`);

    writeFileSync(outputPath, output, 'utf-8');

    console.log(`\nReport generated: ${outputPath}`);
    console.log(`Total packages: ${report.totalPackages}`);
    console.log(`Compliant: ${report.summary.compliant ? 'YES' : 'NO'}`);

    if (report.summary.issues.length > 0) {
      console.log('\nIssues found:');
      report.summary.issues.forEach((issue) => console.log(`  - ${issue}`));
    }

    if (!report.summary.compliant && this.strict) {
      console.error('\n❌ License compliance check failed (strict mode)');
      process.exit(1);
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const checker = new LicenseChecker();
  checker.run();
}

export { LicenseChecker };
