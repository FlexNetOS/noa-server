#!/usr/bin/env node

/**
 * License Report Generator
 *
 * Generates comprehensive license attribution reports for distribution,
 * including full license texts and attribution notices.
 *
 * Usage:
 *   ts-node license-report.ts [options]
 *
 * Options:
 *   --format=<html|markdown|text>  Output format (default: html)
 *   --output=<path>                 Output file path
 *   --include-dev                   Include development dependencies
 *   --include-text                  Include full license texts
 *   --template=<path>               Custom template file
 *   --help                          Show help message
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

interface PackageInfo {
  name: string;
  version: string;
  license: string;
  licenseText?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  description?: string;
}

interface LicenseReport {
  generated: string;
  project: {
    name: string;
    version: string;
    description?: string;
  };
  packages: PackageInfo[];
  licenseGroups: {
    [license: string]: PackageInfo[];
  };
}

class LicenseReportGenerator {
  private projectRoot: string;
  private format: string;
  private outputPath?: string;
  private includeDev: boolean;
  private includeText: boolean;
  private templatePath?: string;

  constructor() {
    this.projectRoot = resolve(__dirname, '../..');
    this.format = 'html';
    this.includeDev = false;
    this.includeText = false;

    this.parseArguments();
  }

  private parseArguments(): void {
    const args = process.argv.slice(2);

    for (const arg of args) {
      if (arg.startsWith('--format=')) {
        this.format = arg.split('=')[1];
      } else if (arg.startsWith('--output=')) {
        this.outputPath = arg.split('=')[1];
      } else if (arg === '--include-dev') {
        this.includeDev = true;
      } else if (arg === '--include-text') {
        this.includeText = true;
      } else if (arg.startsWith('--template=')) {
        this.templatePath = arg.split('=')[1];
      } else if (arg === '--help') {
        this.showHelp();
        process.exit(0);
      }
    }
  }

  private showHelp(): void {
    console.log(`
License Report Generator

Usage:
  ts-node license-report.ts [options]

Options:
  --format=<html|markdown|text>  Output format (default: html)
  --output=<path>                 Output file path
  --include-dev                   Include development dependencies
  --include-text                  Include full license texts
  --template=<path>               Custom template file
  --help                          Show help message

Examples:
  # Generate HTML report with license texts
  ts-node license-report.ts --format=html --include-text --output=LICENSES.html

  # Generate markdown report for production dependencies only
  ts-node license-report.ts --format=markdown --output=LICENSES.md

  # Generate text report including development dependencies
  ts-node license-report.ts --format=text --include-dev --output=LICENSES.txt
    `);
  }

  private getProjectInfo() {
    try {
      const packageJson = JSON.parse(readFileSync(join(this.projectRoot, 'package.json'), 'utf-8'));

      return {
        name: packageJson.name || 'noa-server',
        version: packageJson.version || '0.0.0',
        description: packageJson.description,
      };
    } catch (error) {
      return {
        name: 'noa-server',
        version: '0.0.0',
      };
    }
  }

  private collectPackageInfo(): PackageInfo[] {
    console.log('Collecting package information...');

    try {
      const npmLsOutput = execSync('npm ls --all --json --long 2>/dev/null || true', {
        cwd: this.projectRoot,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf-8',
      });

      const data = JSON.parse(npmLsOutput);
      const packages = new Map<string, PackageInfo>();

      const traverse = (deps: any, isDev = false) => {
        if (!deps) {
          return;
        }

        for (const [name, info] of Object.entries<any>(deps)) {
          if (packages.has(name)) {
            continue;
          }
          if (!this.includeDev && isDev) {
            continue;
          }

          const pkg: PackageInfo = {
            name,
            version: info.version || 'unknown',
            license: info.license || 'UNKNOWN',
            author: info.author,
            homepage: info.homepage,
            repository: info.repository?.url,
            description: info.description,
          };

          if (this.includeText) {
            pkg.licenseText = this.getLicenseText(name, info.path);
          }

          packages.set(name, pkg);

          if (info.dependencies) {
            traverse(info.dependencies, isDev);
          }
        }
      };

      traverse(data.dependencies, false);
      if (this.includeDev && data.devDependencies) {
        traverse(data.devDependencies, true);
      }

      return Array.from(packages.values()).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error collecting package info:', error);
      return [];
    }
  }

  private getLicenseText(packageName: string, packagePath?: string): string {
    if (!packagePath) {
      return '';
    }

    const possibleFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING'];

    for (const file of possibleFiles) {
      const licensePath = join(packagePath, file);
      if (existsSync(licensePath)) {
        try {
          return readFileSync(licensePath, 'utf-8');
        } catch (error) {
          // Continue to next file
        }
      }
    }

    return '';
  }

  private generateReport(): LicenseReport {
    const packages = this.collectPackageInfo();

    // Group by license
    const licenseGroups: { [license: string]: PackageInfo[] } = {};
    packages.forEach((pkg) => {
      if (!licenseGroups[pkg.license]) {
        licenseGroups[pkg.license] = [];
      }
      licenseGroups[pkg.license].push(pkg);
    });

    return {
      generated: new Date().toISOString(),
      project: this.getProjectInfo(),
      packages,
      licenseGroups,
    };
  }

  private formatHtml(report: LicenseReport): string {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>License Report - ${report.project.name}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .license-group {
            background: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .package {
            padding: 15px;
            margin: 10px 0;
            border-left: 3px solid #007acc;
            background: #f9f9f9;
        }
        .license-text {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
            max-height: 300px;
            overflow-y: auto;
            margin-top: 10px;
        }
        .toc {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .toc ul {
            list-style: none;
            padding-left: 0;
        }
        .toc li {
            padding: 5px 0;
        }
        a {
            color: #007acc;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>License Report</h1>
        <p><strong>Project:</strong> ${report.project.name} v${report.project.version}</p>
        ${report.project.description ? `<p>${report.project.description}</p>` : ''}
        <p><strong>Generated:</strong> ${new Date(report.generated).toLocaleString()}</p>
        <p><strong>Total Packages:</strong> ${report.packages.length}</p>
    </div>

    <div class="toc">
        <h2>Table of Contents</h2>
        <ul>
            ${Object.keys(report.licenseGroups)
              .sort()
              .map(
                (license) =>
                  `<li><a href="#${license.replace(/[^a-z0-9]/gi, '-')}">${license} (${report.licenseGroups[license].length})</a></li>`
              )
              .join('')}
        </ul>
    </div>
`;

    for (const [license, packages] of Object.entries(report.licenseGroups).sort()) {
      html += `
    <div class="license-group" id="${license.replace(/[^a-z0-9]/gi, '-')}">
        <h2>${license} (${packages.length} packages)</h2>
`;

      packages.forEach((pkg) => {
        html += `
        <div class="package">
            <h3>${pkg.name} v${pkg.version}</h3>
            ${pkg.description ? `<p>${pkg.description}</p>` : ''}
            ${pkg.author ? `<p><strong>Author:</strong> ${pkg.author}</p>` : ''}
            ${pkg.homepage ? `<p><strong>Homepage:</strong> <a href="${pkg.homepage}" target="_blank">${pkg.homepage}</a></p>` : ''}
            ${pkg.repository ? `<p><strong>Repository:</strong> <a href="${pkg.repository}" target="_blank">${pkg.repository}</a></p>` : ''}
            ${pkg.licenseText ? `<div class="license-text">${pkg.licenseText}</div>` : ''}
        </div>
`;
      });

      html += `    </div>\n`;
    }

    html += `
</body>
</html>`;

    return html;
  }

  private formatMarkdown(report: LicenseReport): string {
    let output = `# License Report\n\n`;
    output += `**Project:** ${report.project.name} v${report.project.version}\n`;
    output += `**Generated:** ${new Date(report.generated).toLocaleString()}\n`;
    output += `**Total Packages:** ${report.packages.length}\n\n`;

    output += `## Table of Contents\n\n`;
    Object.keys(report.licenseGroups)
      .sort()
      .forEach((license) => {
        output += `- [${license} (${report.licenseGroups[license].length})](#${license.toLowerCase().replace(/[^a-z0-9]/g, '-')})\n`;
      });
    output += `\n`;

    for (const [license, packages] of Object.entries(report.licenseGroups).sort()) {
      output += `## ${license} (${packages.length} packages)\n\n`;

      packages.forEach((pkg) => {
        output += `### ${pkg.name} v${pkg.version}\n\n`;
        if (pkg.description) {
          output += `${pkg.description}\n\n`;
        }
        if (pkg.author) {
          output += `**Author:** ${pkg.author}\n\n`;
        }
        if (pkg.homepage) {
          output += `**Homepage:** ${pkg.homepage}\n\n`;
        }
        if (pkg.repository) {
          output += `**Repository:** ${pkg.repository}\n\n`;
        }

        if (pkg.licenseText) {
          output += `**License Text:**\n\n\`\`\`\n${pkg.licenseText}\n\`\`\`\n\n`;
        }

        output += `---\n\n`;
      });
    }

    return output;
  }

  private formatText(report: LicenseReport): string {
    let output = `LICENSE REPORT\n`;
    output += `${'='.repeat(80)}\n\n`;
    output += `Project: ${report.project.name} v${report.project.version}\n`;
    output += `Generated: ${new Date(report.generated).toLocaleString()}\n`;
    output += `Total Packages: ${report.packages.length}\n\n`;

    for (const [license, packages] of Object.entries(report.licenseGroups).sort()) {
      output += `\n${license} (${packages.length} packages)\n`;
      output += `${'-'.repeat(80)}\n\n`;

      packages.forEach((pkg) => {
        output += `${pkg.name} v${pkg.version}\n`;
        if (pkg.description) {
          output += `  ${pkg.description}\n`;
        }
        if (pkg.author) {
          output += `  Author: ${pkg.author}\n`;
        }
        if (pkg.homepage) {
          output += `  Homepage: ${pkg.homepage}\n`;
        }
        if (pkg.repository) {
          output += `  Repository: ${pkg.repository}\n`;
        }

        if (pkg.licenseText) {
          output += `\n  License Text:\n`;
          output += `  ${pkg.licenseText.split('\n').join('\n  ')}\n`;
        }

        output += `\n`;
      });
    }

    return output;
  }

  public run(): void {
    console.log('Generating license report...');
    console.log(`Format: ${this.format}`);
    console.log(`Include dev dependencies: ${this.includeDev}`);
    console.log(`Include license texts: ${this.includeText}`);

    const report = this.generateReport();

    let output: string;
    let extension: string;

    switch (this.format) {
      case 'html':
        output = this.formatHtml(report);
        extension = 'html';
        break;
      case 'text':
        output = this.formatText(report);
        extension = 'txt';
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
      `license-report-${Date.now()}.${extension}`
    );
    const outputPath = this.outputPath || defaultOutput;

    // Ensure directory exists
    const outputDir = join(this.projectRoot, 'logs', 'compliance');
    execSync(`mkdir -p "${outputDir}"`);

    writeFileSync(outputPath, output, 'utf-8');

    console.log(`\nReport generated: ${outputPath}`);
    console.log(`Total packages: ${report.packages.length}`);
    console.log(`Unique licenses: ${Object.keys(report.licenseGroups).length}`);
  }
}

// Execute if run directly
if (require.main === module) {
  const generator = new LicenseReportGenerator();
  generator.run();
}

export { LicenseReportGenerator };
