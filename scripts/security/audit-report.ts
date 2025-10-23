#!/usr/bin/env node

/**
 * Security Audit Report Generator
 *
 * Generates comprehensive security audit reports by aggregating data from
 * multiple security scanning tools and producing actionable insights.
 *
 * Usage:
 *   ts-node audit-report.ts [options]
 *
 * Options:
 *   --format=<html|json|markdown|pdf>  Output format (default: markdown)
 *   --output=<path>                     Output file path
 *   --severity=<level>                  Minimum severity (low, moderate, high, critical)
 *   --include-fixed                     Include already fixed vulnerabilities
 *   --help                              Show help message
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

interface Vulnerability {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  package: string;
  version: string;
  patchedVersion?: string;
  description: string;
  cves: string[];
  cvss?: number;
  references: string[];
  fixAvailable: boolean;
}

interface AuditReport {
  timestamp: string;
  projectName: string;
  totalVulnerabilities: number;
  vulnerabilitiesBySeverity: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  vulnerabilities: Vulnerability[];
  recommendations: string[];
  metadata: {
    scanDuration: number;
    toolsUsed: string[];
    scannedPackages: number;
  };
}

class AuditReportGenerator {
  private projectRoot: string;
  private reportsDir: string;
  private format: string;
  private outputPath?: string;
  private minSeverity: string;
  private includeFixed: boolean;

  constructor() {
    this.projectRoot = resolve(__dirname, '../..');
    this.reportsDir = join(this.projectRoot, 'logs', 'security');
    this.format = 'markdown';
    this.minSeverity = 'low';
    this.includeFixed = false;

    this.parseArguments();
  }

  private parseArguments(): void {
    const args = process.argv.slice(2);

    for (const arg of args) {
      if (arg.startsWith('--format=')) {
        this.format = arg.split('=')[1];
      } else if (arg.startsWith('--output=')) {
        this.outputPath = arg.split('=')[1];
      } else if (arg.startsWith('--severity=')) {
        this.minSeverity = arg.split('=')[1];
      } else if (arg === '--include-fixed') {
        this.includeFixed = true;
      } else if (arg === '--help') {
        this.showHelp();
        process.exit(0);
      }
    }
  }

  private showHelp(): void {
    console.log(`
Security Audit Report Generator

Usage:
  ts-node audit-report.ts [options]

Options:
  --format=<html|json|markdown|pdf>  Output format (default: markdown)
  --output=<path>                     Output file path
  --severity=<level>                  Minimum severity (low, moderate, high, critical)
  --include-fixed                     Include already fixed vulnerabilities
  --help                              Show help message

Examples:
  # Generate markdown report
  ts-node audit-report.ts --format=markdown --output=security-report.md

  # Generate JSON report with only high/critical issues
  ts-node audit-report.ts --format=json --severity=high

  # Generate HTML report including fixed vulnerabilities
  ts-node audit-report.ts --format=html --include-fixed
    `);
  }

  private findLatestScanReports(): string[] {
    if (!existsSync(this.reportsDir)) {
      console.error(`Reports directory not found: ${this.reportsDir}`);
      console.error('Run scan-deps.sh first to generate security scan data.');
      return [];
    }

    const files = readdirSync(this.reportsDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();

    return files.map((f) => join(this.reportsDir, f));
  }

  private parseNpmAudit(content: string): Vulnerability[] {
    try {
      const data = JSON.parse(content);
      const vulnerabilities: Vulnerability[] = [];

      if (data.vulnerabilities) {
        for (const [pkg, vuln] of Object.entries<any>(data.vulnerabilities)) {
          vulnerabilities.push({
            id: vuln.via?.[0]?.source?.toString() || `${pkg}-${vuln.severity}`,
            name: vuln.via?.[0]?.title || 'Unknown vulnerability',
            severity: vuln.severity,
            package: pkg,
            version: vuln.range || 'unknown',
            patchedVersion: vuln.fixAvailable?.version,
            description: vuln.via?.[0]?.url || '',
            cves: vuln.via?.filter((v: any) => typeof v === 'string') || [],
            references: vuln.via?.[0]?.url ? [vuln.via[0].url] : [],
            fixAvailable: Boolean(vuln.fixAvailable),
          });
        }
      }

      return vulnerabilities;
    } catch (error) {
      console.error('Error parsing npm audit data:', error);
      return [];
    }
  }

  private generateReport(): AuditReport {
    const scanFiles = this.findLatestScanReports();
    const allVulnerabilities: Vulnerability[] = [];
    const toolsUsed = new Set<string>();

    for (const file of scanFiles.slice(0, 3)) {
      // Last 3 scans
      try {
        const content = readFileSync(file, 'utf-8');

        if (file.includes('dependency-scan')) {
          const vulns = this.parseNpmAudit(content);
          allVulnerabilities.push(...vulns);
          toolsUsed.add('npm audit');
        }
      } catch (error) {
        console.error(`Error reading ${file}:`, error);
      }
    }

    // Filter by severity
    const severityOrder = ['low', 'moderate', 'high', 'critical'];
    const minSeverityIndex = severityOrder.indexOf(this.minSeverity);
    const filteredVulns = allVulnerabilities.filter(
      (v) => severityOrder.indexOf(v.severity) >= minSeverityIndex
    );

    // Count by severity
    const bySeverity = {
      critical: filteredVulns.filter((v) => v.severity === 'critical').length,
      high: filteredVulns.filter((v) => v.severity === 'high').length,
      moderate: filteredVulns.filter((v) => v.severity === 'moderate').length,
      low: filteredVulns.filter((v) => v.severity === 'low').length,
    };

    const report: AuditReport = {
      timestamp: new Date().toISOString(),
      projectName: 'noa-server',
      totalVulnerabilities: filteredVulns.length,
      vulnerabilitiesBySeverity: bySeverity,
      vulnerabilities: filteredVulns,
      recommendations: this.generateRecommendations(filteredVulns),
      metadata: {
        scanDuration: 0,
        toolsUsed: Array.from(toolsUsed),
        scannedPackages: new Set(filteredVulns.map((v) => v.package)).size,
      },
    };

    return report;
  }

  private generateRecommendations(vulnerabilities: Vulnerability[]): string[] {
    const recommendations: string[] = [];

    const criticalCount = vulnerabilities.filter((v) => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter((v) => v.severity === 'high').length;

    if (criticalCount > 0) {
      recommendations.push(`URGENT: Address ${criticalCount} critical vulnerabilities immediately`);
    }

    if (highCount > 0) {
      recommendations.push(`High priority: Fix ${highCount} high severity vulnerabilities`);
    }

    const fixableCount = vulnerabilities.filter((v) => v.fixAvailable).length;
    if (fixableCount > 0) {
      recommendations.push(
        `${fixableCount} vulnerabilities can be auto-fixed with 'npm audit fix'`
      );
    }

    recommendations.push('Review and update all dependencies regularly');
    recommendations.push('Enable automated security scanning in CI/CD pipeline');
    recommendations.push('Subscribe to security advisories for critical packages');

    return recommendations;
  }

  private formatMarkdown(report: AuditReport): string {
    let output = `# Security Audit Report\n\n`;
    output += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n`;
    output += `**Project:** ${report.projectName}\n\n`;

    output += `## Executive Summary\n\n`;
    output += `- **Total Vulnerabilities:** ${report.totalVulnerabilities}\n`;
    output += `- **Critical:** ${report.vulnerabilitiesBySeverity.critical}\n`;
    output += `- **High:** ${report.vulnerabilitiesBySeverity.high}\n`;
    output += `- **Moderate:** ${report.vulnerabilitiesBySeverity.moderate}\n`;
    output += `- **Low:** ${report.vulnerabilitiesBySeverity.low}\n\n`;

    output += `## Recommendations\n\n`;
    report.recommendations.forEach((rec, i) => {
      output += `${i + 1}. ${rec}\n`;
    });
    output += `\n`;

    output += `## Detailed Vulnerabilities\n\n`;

    const bySeverity = {
      critical: [] as Vulnerability[],
      high: [] as Vulnerability[],
      moderate: [] as Vulnerability[],
      low: [] as Vulnerability[],
    };

    report.vulnerabilities.forEach((v) => {
      bySeverity[v.severity].push(v);
    });

    for (const [severity, vulns] of Object.entries(bySeverity)) {
      if (vulns.length === 0) {
        continue;
      }

      output += `### ${severity.toUpperCase()} (${vulns.length})\n\n`;

      vulns.forEach((v) => {
        output += `#### ${v.name}\n\n`;
        output += `- **Package:** ${v.package}@${v.version}\n`;
        output += `- **ID:** ${v.id}\n`;
        output += `- **Fix Available:** ${v.fixAvailable ? 'Yes' : 'No'}${v.patchedVersion ? ` (${v.patchedVersion})` : ''}\n`;

        if (v.cves.length > 0) {
          output += `- **CVEs:** ${v.cves.join(', ')}\n`;
        }

        if (v.references.length > 0) {
          output += `- **References:** ${v.references.join(', ')}\n`;
        }

        output += `\n`;
      });
    }

    output += `## Metadata\n\n`;
    output += `- **Tools Used:** ${report.metadata.toolsUsed.join(', ')}\n`;
    output += `- **Packages Scanned:** ${report.metadata.scannedPackages}\n`;

    return output;
  }

  private formatJson(report: AuditReport): string {
    return JSON.stringify(report, null, 2);
  }

  private formatHtml(report: AuditReport): string {
    const severityColors = {
      critical: '#d32f2f',
      high: '#f57c00',
      moderate: '#fbc02d',
      low: '#388e3c',
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Audit Report - ${report.projectName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
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
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid;
        }
        .critical { border-left-color: ${severityColors.critical}; }
        .high { border-left-color: ${severityColors.high}; }
        .moderate { border-left-color: ${severityColors.moderate}; }
        .low { border-left-color: ${severityColors.low}; }
        .vulnerability {
            background: white;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .severity-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            color: white;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .recommendations {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Audit Report</h1>
        <p><strong>Project:</strong> ${report.projectName}</p>
        <p><strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="summary-card critical">
            <h3>Critical</h3>
            <p style="font-size: 2em; margin: 0; color: ${severityColors.critical}">${report.vulnerabilitiesBySeverity.critical}</p>
        </div>
        <div class="summary-card high">
            <h3>High</h3>
            <p style="font-size: 2em; margin: 0; color: ${severityColors.high}">${report.vulnerabilitiesBySeverity.high}</p>
        </div>
        <div class="summary-card moderate">
            <h3>Moderate</h3>
            <p style="font-size: 2em; margin: 0; color: ${severityColors.moderate}">${report.vulnerabilitiesBySeverity.moderate}</p>
        </div>
        <div class="summary-card low">
            <h3>Low</h3>
            <p style="font-size: 2em; margin: 0; color: ${severityColors.low}">${report.vulnerabilitiesBySeverity.low}</p>
        </div>
    </div>

    <div class="recommendations">
        <h2>Recommendations</h2>
        <ol>
            ${report.recommendations.map((r) => `<li>${r}</li>`).join('')}
        </ol>
    </div>

    <h2>Vulnerabilities</h2>
    ${report.vulnerabilities
      .map(
        (v) => `
        <div class="vulnerability">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0;">${v.name}</h3>
                <span class="severity-badge" style="background-color: ${severityColors[v.severity]}">${v.severity}</span>
            </div>
            <p><strong>Package:</strong> ${v.package}@${v.version}</p>
            <p><strong>ID:</strong> ${v.id}</p>
            ${v.patchedVersion ? `<p><strong>Patched Version:</strong> ${v.patchedVersion}</p>` : ''}
            ${v.cves.length > 0 ? `<p><strong>CVEs:</strong> ${v.cves.join(', ')}</p>` : ''}
            <p><strong>Fix Available:</strong> ${v.fixAvailable ? 'Yes' : 'No'}</p>
        </div>
    `
      )
      .join('')}
</body>
</html>`;

    return html;
  }

  public run(): void {
    console.log('Generating security audit report...');

    const report = this.generateReport();

    let output: string;
    let extension: string;

    switch (this.format) {
      case 'json':
        output = this.formatJson(report);
        extension = 'json';
        break;
      case 'html':
        output = this.formatHtml(report);
        extension = 'html';
        break;
      case 'markdown':
      default:
        output = this.formatMarkdown(report);
        extension = 'md';
        break;
    }

    const outputPath =
      this.outputPath || join(this.reportsDir, `security-audit-${Date.now()}.${extension}`);

    writeFileSync(outputPath, output, 'utf-8');

    console.log(`\nReport generated successfully: ${outputPath}`);
    console.log(`Total vulnerabilities: ${report.totalVulnerabilities}`);
    console.log(
      `Critical: ${report.vulnerabilitiesBySeverity.critical}, High: ${report.vulnerabilitiesBySeverity.high}`
    );
  }
}

// Execute if run directly
if (require.main === module) {
  const generator = new AuditReportGenerator();
  generator.run();
}

export { AuditReportGenerator };
