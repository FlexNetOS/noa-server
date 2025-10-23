#!/usr/bin/env node
/**
 * Platinum Pipeline Archive Search Tool
 * Searches and provides statistics for archived symbols, modules, and chunks
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { basename, join } from 'path';

interface ArchiveManifest {
  archive_file: string;
  archive_type: 'symbol' | 'module' | 'chunk' | 'workspace';
  created_at: string;
  created_by: string;
  files: {
    path: string;
    sha256_original: string;
    size_original: number;
  }[];
  size_original_bytes: number;
  size_compressed_bytes: number;
  compression_ratio: number;
  compression_tool: string;
  reason: string;
  chunk_metadata?: {
    chunk_type: string;
    context: string;
    file_types: {[ext: string]: number};
    total_loc: number;
    file_count: number;
    file_groups: {[group: string]: string[]};
  };
  module_metadata?: {
    module_name: string;
    package_json?: any;
    total_loc: number;
    file_count: number;
    directory_structure: string[];
  };
  restore_command: string;
  restore_validation: string;
  pipeline_run_id: string;
  policy_checks_passed: string[];
  tags: string[];
  keywords: string[];
}

class ArchiveSearch {
  private archiveBaseDir = '.archives';

  constructor() {
    if (!existsSync(this.archiveBaseDir)) {
      console.error(`Archive directory ${this.archiveBaseDir} does not exist`);
      process.exit(1);
    }
  }

  /**
   * Search for archives by symbol name or keyword
   */
  search(query: string): ArchiveManifest[] {
    const results: ArchiveManifest[] = [];
    const archiveTypes = ['symbols', 'modules', 'chunks', 'workspaces'];

    for (const type of archiveTypes) {
      const typeDir = join(this.archiveBaseDir, type);
      if (!existsSync(typeDir)) continue;

      const files = readdirSync(typeDir);
      for (const file of files) {
        if (!file.endsWith('.tar.gz')) continue;

        const archiveName = file.replace('.tar.gz', '');
        if (archiveName.toLowerCase().includes(query.toLowerCase())) {
          const manifest = this.extractManifest(join(typeDir, file));
          if (manifest) {
            results.push(manifest);
          }
        }
      }
    }

    return results;
  }

  /**
   * Get compression statistics
   */
  getStats(): void {
    const stats = {
      totalArchives: 0,
      totalSizeOriginal: 0,
      totalSizeCompressed: 0,
      archivesByType: {} as {[key: string]: number},
      compressionRatios: [] as number[],
      createdToday: 0,
      createdThisWeek: 0,
      topKeywords: [] as {keyword: string, count: number}[]
    };

    const archiveTypes = ['symbols', 'modules', 'chunks', 'workspaces'];
    const keywordCount: {[key: string]: number} = {};

    for (const type of archiveTypes) {
      const typeDir = join(this.archiveBaseDir, type);
      if (!existsSync(typeDir)) continue;

      const files = readdirSync(typeDir);
      stats.archivesByType[type] = files.length;
      stats.totalArchives += files.length;

      for (const file of files) {
        if (!file.endsWith('.tar.gz')) continue;

        const manifest = this.extractManifest(join(typeDir, file));
        if (manifest) {
          stats.totalSizeOriginal += manifest.size_original_bytes;
          stats.totalSizeCompressed += manifest.size_compressed_bytes;
          stats.compressionRatios.push(manifest.compression_ratio);

          // Count keywords
          manifest.keywords.forEach(keyword => {
            keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
          });

          // Check creation date
          const createdDate = new Date(manifest.created_at);
          const now = new Date();
          const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff === 0) stats.createdToday++;
          if (daysDiff <= 7) stats.createdThisWeek++;
        }
      }
    }

    // Calculate top keywords
    stats.topKeywords = Object.entries(keywordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({keyword, count}));

    this.displayStats(stats);
  }

  /**
   * Extract manifest from archive file
   */
  private extractManifest(archivePath: string): ArchiveManifest | null {
    try {
      // Try to extract manifest.json from the archive
      const manifestPath = archivePath.replace('.tar.gz', '.manifest.json');
      if (existsSync(manifestPath)) {
        return JSON.parse(readFileSync(manifestPath, 'utf8'));
      }

      // If no separate manifest, try to extract from archive
      const tempDir = `/tmp/archive-extract-${Date.now()}`;
      execSync(`mkdir -p ${tempDir}`);
      execSync(`tar -xzf ${archivePath} -C ${tempDir} manifest.json 2>/dev/null || true`);

      const extractedManifest = join(tempDir, 'manifest.json');
      if (existsSync(extractedManifest)) {
        const manifest = JSON.parse(readFileSync(extractedManifest, 'utf8'));
        execSync(`rm -rf ${tempDir}`);
        return manifest;
      }

      execSync(`rm -rf ${tempDir}`);

      // Fallback: create basic manifest from filename
      const filename = basename(archivePath, '.tar.gz');
      const stat = statSync(archivePath);
      const parts = filename.split('-');

      return {
        archive_file: archivePath,
        archive_type: 'symbol', // default assumption
        created_at: stat.mtime.toISOString(),
        created_by: 'unknown',
        files: [],
        size_original_bytes: 0,
        size_compressed_bytes: stat.size,
        compression_ratio: 0,
        compression_tool: 'unknown',
        reason: 'auto-detected',
        restore_command: `tar -xzf ${archivePath}`,
        restore_validation: 'manual',
        pipeline_run_id: 'unknown',
        policy_checks_passed: [],
        tags: [],
        keywords: parts.slice(0, -2) // filename parts as keywords
      };
    } catch (error) {
      console.warn(`Failed to extract manifest from ${archivePath}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Display statistics in a formatted way
   */
  private displayStats(stats: any): void {
    console.log('🔍 Platinum Pipeline Archive Statistics');
    console.log('=' .repeat(50));

    console.log(`📊 Total Archives: ${stats.totalArchives}`);
    console.log(`📅 Created Today: ${stats.createdToday}`);
    console.log(`📆 Created This Week: ${stats.createdThisWeek}`);
    console.log('');

    console.log('📂 Archives by Type:');
    Object.entries(stats.archivesByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    console.log('');

    if (stats.totalSizeOriginal > 0) {
      const avgRatio = stats.compressionRatios.reduce((a: number, b: number) => a + b, 0) / stats.compressionRatios.length;
      console.log('🗜️  Compression Stats:');
      console.log(`  Original Size: ${(stats.totalSizeOriginal / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Compressed Size: ${(stats.totalSizeCompressed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Average Ratio: ${avgRatio.toFixed(2)}x`);
      console.log('');
    }

    if (stats.topKeywords.length > 0) {
      console.log('🏷️  Top Keywords:');
      stats.topKeywords.slice(0, 5).forEach((item: any) => {
        console.log(`  ${item.keyword}: ${item.count}`);
      });
    }
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2);
  const search = new ArchiveSearch();

  if (args.includes('--stats')) {
    search.getStats();
  } else if (args.length > 0) {
    const query = args[0];
    const results = search.search(query);

    if (results.length === 0) {
      console.log(`No archives found matching "${query}"`);
    } else {
      console.log(`Found ${results.length} archive(s) matching "${query}":`);
      results.forEach((manifest, index) => {
        console.log(`${index + 1}. ${manifest.archive_file}`);
        console.log(`   Type: ${manifest.archive_type}`);
        console.log(`   Created: ${manifest.created_at}`);
        console.log(`   Ratio: ${manifest.compression_ratio.toFixed(2)}x`);
        console.log(`   Files: ${manifest.files.length}`);
        console.log('');
      });
    }
  } else {
    console.log('Usage:');
    console.log('  search-archives <query>    - Search archives by name/keyword');
    console.log('  search-archives --stats    - Show compression statistics');
  }
}

if (require.main === module) {
  main();
}

export { ArchiveManifest, ArchiveSearch };
