#!/usr/bin/env node
/**
 * Bundle Analysis Script
 * Analyzes production build bundle sizes and generates optimization reports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BundleStats {
  file: string;
  size: number;
  gzipSize: number;
  brotliSize?: number;
  percentage: number;
}

interface BundleReport {
  totalSize: number;
  totalGzipSize: number;
  totalBrotliSize: number;
  chunks: BundleStats[];
  warnings: string[];
  recommendations: string[];
  timestamp: string;
}

const BUNDLE_SIZE_LIMITS = {
  total: 500 * 1024, // 500KB gzipped
  initial: 200 * 1024, // 200KB initial chunk
  vendor: 150 * 1024, // 150KB per vendor chunk
  route: 50 * 1024, // 50KB per route chunk
};

/**
 * Get file size
 */
function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Get gzipped size
 */
function getGzipSize(filePath: string): number {
  try {
    const output = execSync(`gzip -c "${filePath}" | wc -c`, { encoding: 'utf-8' });
    return parseInt(output.trim(), 10);
  } catch (error) {
    return 0;
  }
}

/**
 * Get brotli compressed size
 */
function getBrotliSize(filePath: string): number {
  try {
    const output = execSync(`brotli -c "${filePath}" | wc -c`, { encoding: 'utf-8' });
    return parseInt(output.trim(), 10);
  } catch (error) {
    return 0;
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Analyze bundle directory
 */
function analyzeBundles(distDir: string): BundleReport {
  const assetsDir = path.join(distDir, 'assets');
  const chunks: BundleStats[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  let totalSize = 0;
  let totalGzipSize = 0;
  let totalBrotliSize = 0;

  // Scan all JS files
  const jsFiles = fs
    .readdirSync(path.join(assetsDir, 'js'))
    .filter((file) => file.endsWith('.js'));

  for (const file of jsFiles) {
    const filePath = path.join(assetsDir, 'js', file);
    const size = getFileSize(filePath);
    const gzipSize = getGzipSize(filePath);
    const brotliSize = getBrotliSize(filePath);

    totalSize += size;
    totalGzipSize += gzipSize;
    totalBrotliSize += brotliSize;

    chunks.push({
      file,
      size,
      gzipSize,
      brotliSize,
      percentage: 0, // Will calculate after total
    });

    // Check size limits
    if (file.includes('index') && gzipSize > BUNDLE_SIZE_LIMITS.initial) {
      warnings.push(
        `Initial chunk "${file}" exceeds limit: ${formatBytes(gzipSize)} > ${formatBytes(BUNDLE_SIZE_LIMITS.initial)}`
      );
      recommendations.push('Consider lazy loading more routes and components');
    }

    if (file.includes('vendor') && gzipSize > BUNDLE_SIZE_LIMITS.vendor) {
      warnings.push(
        `Vendor chunk "${file}" exceeds limit: ${formatBytes(gzipSize)} > ${formatBytes(BUNDLE_SIZE_LIMITS.vendor)}`
      );
      recommendations.push(`Consider splitting "${file}" into smaller chunks`);
    }

    if (file.includes('route') && gzipSize > BUNDLE_SIZE_LIMITS.route) {
      warnings.push(
        `Route chunk "${file}" exceeds limit: ${formatBytes(gzipSize)} > ${formatBytes(BUNDLE_SIZE_LIMITS.route)}`
      );
      recommendations.push(`Optimize "${file}" by removing unused dependencies`);
    }
  }

  // Calculate percentages
  chunks.forEach((chunk) => {
    chunk.percentage = (chunk.gzipSize / totalGzipSize) * 100;
  });

  // Sort by size
  chunks.sort((a, b) => b.gzipSize - a.gzipSize);

  // Check total size
  if (totalGzipSize > BUNDLE_SIZE_LIMITS.total) {
    warnings.push(
      `Total bundle size exceeds limit: ${formatBytes(totalGzipSize)} > ${formatBytes(BUNDLE_SIZE_LIMITS.total)}`
    );
    recommendations.push('Consider implementing more aggressive code splitting');
    recommendations.push('Review and remove unused dependencies');
    recommendations.push('Enable tree shaking for all vendor libraries');
  }

  // Additional recommendations
  if (chunks.length > 20) {
    recommendations.push(`High chunk count (${chunks.length}). Consider consolidating smaller chunks`);
  }

  const largeChunks = chunks.filter((c) => c.gzipSize > 100 * 1024);
  if (largeChunks.length > 3) {
    recommendations.push(`Found ${largeChunks.length} chunks > 100KB. Consider further splitting`);
  }

  return {
    totalSize,
    totalGzipSize,
    totalBrotliSize,
    chunks,
    warnings,
    recommendations,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate report
 */
function generateReport(report: BundleReport): string {
  let output = '\n';
  output += '═══════════════════════════════════════════════════════════\n';
  output += '                   BUNDLE ANALYSIS REPORT                  \n';
  output += '═══════════════════════════════════════════════════════════\n';
  output += `Generated: ${new Date(report.timestamp).toLocaleString()}\n\n`;

  output += '📊 BUNDLE SIZE SUMMARY\n';
  output += '───────────────────────────────────────────────────────────\n';
  output += `Total Size:         ${formatBytes(report.totalSize).padStart(12)}\n`;
  output += `Gzipped:            ${formatBytes(report.totalGzipSize).padStart(12)}\n`;
  output += `Brotli:             ${formatBytes(report.totalBrotliSize).padStart(12)}\n`;
  output += `Compression Ratio:  ${((1 - report.totalGzipSize / report.totalSize) * 100).toFixed(1)}%\n`;
  output += `Target (Gzipped):   ${formatBytes(BUNDLE_SIZE_LIMITS.total).padStart(12)}\n`;

  const targetPercentage = (report.totalGzipSize / BUNDLE_SIZE_LIMITS.total) * 100;
  const status = targetPercentage <= 100 ? '✅ PASS' : '❌ FAIL';
  output += `Status:             ${status} (${targetPercentage.toFixed(1)}% of target)\n\n`;

  output += '📦 CHUNK BREAKDOWN (Top 10)\n';
  output += '───────────────────────────────────────────────────────────\n';
  output += 'File                            Original    Gzipped   %\n';
  output += '───────────────────────────────────────────────────────────\n';

  report.chunks.slice(0, 10).forEach((chunk) => {
    const fileName = chunk.file.substring(0, 28).padEnd(28);
    const original = formatBytes(chunk.size).padStart(10);
    const gzipped = formatBytes(chunk.gzipSize).padStart(10);
    const percentage = `${chunk.percentage.toFixed(1)}%`.padStart(6);
    output += `${fileName} ${original} ${gzipped} ${percentage}\n`;
  });

  if (report.warnings.length > 0) {
    output += '\n⚠️  WARNINGS\n';
    output += '───────────────────────────────────────────────────────────\n';
    report.warnings.forEach((warning) => {
      output += `• ${warning}\n`;
    });
  }

  if (report.recommendations.length > 0) {
    output += '\n💡 RECOMMENDATIONS\n';
    output += '───────────────────────────────────────────────────────────\n';
    report.recommendations.forEach((rec) => {
      output += `• ${rec}\n`;
    });
  }

  output += '\n═══════════════════════════════════════════════════════════\n';

  return output;
}

/**
 * Main execution
 */
function main() {
  const distDir = path.resolve(__dirname, '../dist');
  const docsDir = path.resolve(__dirname, '../docs');

  console.log('🔍 Analyzing production bundle...\n');

  if (!fs.existsSync(distDir)) {
    console.error('❌ Distribution directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Ensure docs directory exists
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Analyze bundles
  const report = analyzeBundles(distDir);

  // Generate and display report
  const reportText = generateReport(report);
  console.log(reportText);

  // Save JSON report
  const jsonReportPath = path.join(docsDir, 'bundle-report.json');
  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed JSON report saved to: ${jsonReportPath}`);

  // Save text report
  const textReportPath = path.join(docsDir, 'bundle-report.txt');
  fs.writeFileSync(textReportPath, reportText);
  console.log(`📄 Text report saved to: ${textReportPath}`);

  // Exit with error if warnings exist
  if (report.warnings.length > 0) {
    console.log('\n❌ Build completed with warnings. Review recommendations above.');
    process.exit(1);
  }

  console.log('\n✅ Bundle analysis complete. All targets met!');
  process.exit(0);
}

main();
