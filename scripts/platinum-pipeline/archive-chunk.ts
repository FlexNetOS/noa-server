#!/usr/bin/env node
/**
 * Chunk-Level Archive Creator
 * Compresses related file groups (tests, docs, configs, examples, deprecated)
 */

import {execSync} from 'child_process';
import {readFileSync, writeFileSync, statSync, existsSync, mkdirSync} from 'fs';
import {createHash} from 'crypto';
import {basename, dirname, join, extname} from 'path';

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
    chunk_type: ChunkType;
    context: string;
    file_types: {[ext: string]: number};
    total_loc: number;
    file_count: number;
    file_groups: {[group: string]: string[]};
  };
  restore_command: string;
  restore_validation: string;
  pipeline_run_id: string;
  policy_checks_passed: string[];
  tags: string[];
  keywords: string[];
}

type ChunkType = 'tests' | 'docs' | 'configs' | 'examples' | 'deprecated';

interface ChunkArchiveOptions {
  chunkType: ChunkType;
  context: string;
  files: string[];
  reason?: string;
  pipelineRunId?: string;
  policiesPassed?: string[];
}

class ChunkArchiver {
  private archiveDir = '.archives/chunks';
  private manifestDir = '.archives/chunks/manifests';
  private indexFile = '.archives/index.json';
  private statsFile = '.archives/stats.json';

  private readonly validChunkTypes: ChunkType[] = ['tests', 'docs', 'configs', 'examples', 'deprecated'];

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    [this.archiveDir, this.manifestDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, {recursive: true});
      }
    });
  }

  private validateChunkType(type: string): ChunkType {
    if (!this.validChunkTypes.includes(type as ChunkType)) {
      throw new Error(`Invalid chunk type: ${type}. Valid types: ${this.validChunkTypes.join(', ')}`);
    }
    return type as ChunkType;
  }

  private calculateSHA256(filePath: string): string {
    const content = readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex');
  }

  private getFileSize(filePath: string): number {
    return statSync(filePath).size;
  }

  private generateTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }

  private countLinesOfCode(filePath: string): number {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return content.split('\n').length;
    } catch {
      return 0;
    }
  }

  private getFileTypeDistribution(files: string[]): {[ext: string]: number} {
    const distribution: {[ext: string]: number} = {};

    files.forEach(file => {
      const ext = extname(file) || 'no-extension';
      distribution[ext] = (distribution[ext] || 0) + 1;
    });

    return distribution;
  }

  private groupFilesByDirectory(files: string[]): {[group: string]: string[]} {
    const groups: {[group: string]: string[]} = {};

    files.forEach(file => {
      const dir = dirname(file);
      if (!groups[dir]) {
        groups[dir] = [];
      }
      groups[dir].push(basename(file));
    });

    return groups;
  }

  private getDefaultReason(chunkType: ChunkType, context: string): string {
    const reasons: {[key in ChunkType]: string} = {
      tests: `Test files for '${context}' archived after validation suite completion.`,
      docs: `Documentation files for '${context}' archived for reference preservation.`,
      configs: `Configuration files for '${context}' archived after consolidation.`,
      examples: `Example files for '${context}' archived for reference.`,
      deprecated: `Deprecated files for '${context}' archived after migration.`
    };

    return reasons[chunkType];
  }

  async archiveChunk(options: ChunkArchiveOptions): Promise<string> {
    const chunkType = this.validateChunkType(options.chunkType);
    const timestamp = this.generateTimestamp();
    const archiveName = `${chunkType}-${options.context}-${timestamp}.CHUNK.tar.gz`;
    const archivePath = join(this.archiveDir, archiveName);
    const manifestPath = join(this.manifestDir, `${chunkType}-${options.context}-${timestamp}.json`);

    console.log(`\n🗜️  Archiving chunk: ${chunkType}`);
    console.log(`📝 Context: ${options.context}`);
    console.log(`📦 Files to compress: ${options.files.length}`);

    // Validate files exist
    options.files.forEach(file => {
      if (!existsSync(file)) {
        throw new Error(`File not found: ${file}`);
      }
    });

    // Collect file metadata
    const fileMetadata = options.files.map(file => ({
      path: file,
      sha256_original: this.calculateSHA256(file),
      size_original: this.getFileSize(file)
    }));

    const originalSize = fileMetadata.reduce((sum, f) => sum + f.size_original, 0);

    // Calculate total LOC
    const totalLoc = options.files.reduce((sum, file) => sum + this.countLinesOfCode(file), 0);

    // Get file type distribution
    const fileTypes = this.getFileTypeDistribution(options.files);

    // Group files by directory
    const fileGroups = this.groupFilesByDirectory(options.files);

    // Create archive with pigz (parallel gzip) if available
    const useParallel = this.checkPigzAvailable();
    const tarCommand = useParallel ? 'tar -I pigz' : 'tar -czf';

    const filesArg = options.files.join(' ');
    const transformArg = `--transform 's,^,${chunkType}-${options.context}/,'`;

    try {
      execSync(`${tarCommand} -cf ${archivePath} ${transformArg} ${filesArg}`, {
        stdio: 'pipe'
      });
    } catch (error) {
      throw new Error(`Failed to create archive: ${error}`);
    }

    const compressedSize = this.getFileSize(archivePath);
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100);

    // Create manifest
    const manifest: ArchiveManifest = {
      archive_file: archiveName,
      archive_type: 'chunk',
      created_at: new Date().toISOString(),
      created_by: 'platinum-pipeline/archive-chunk',
      files: fileMetadata,
      size_original_bytes: originalSize,
      size_compressed_bytes: compressedSize,
      compression_ratio: Math.round(compressionRatio * 100) / 100,
      compression_tool: useParallel ? 'pigz' : 'gzip',
      reason: options.reason || this.getDefaultReason(chunkType, options.context),
      chunk_metadata: {
        chunk_type: chunkType,
        context: options.context,
        file_types: fileTypes,
        total_loc: totalLoc,
        file_count: options.files.length,
        file_groups: fileGroups
      },
      restore_command: `tar -xzf ${archivePath}`,
      restore_validation: `bash scripts/platinum-pipeline/verify-archives.sh ${archivePath}`,
      pipeline_run_id: options.pipelineRunId || `run-${timestamp}`,
      policy_checks_passed: options.policiesPassed || ['chunk-archival-validated'],
      tags: ['chunk', chunkType, options.context, 'archived'],
      keywords: [chunkType, options.context, 'chunk', 'consolidation']
    };

    // Save manifest
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // Update index
    this.updateIndex(manifest);

    // Update stats
    this.updateStats(manifest);

    // Print summary
    const saved = originalSize - compressedSize;
    console.log(`\n✅ Archive created: ${archiveName}`);
    console.log(`   Chunk type: ${chunkType}`);
    console.log(`   Files archived: ${options.files.length}`);
    console.log(`   Total LOC: ${totalLoc.toLocaleString()}`);
    console.log(`   File types: ${Object.entries(fileTypes).map(([ext, count]) => `${ext}(${count})`).join(', ')}`);
    console.log(`   Original size: ${this.formatBytes(originalSize)}`);
    console.log(`   Compressed: ${this.formatBytes(compressedSize)}`);
    if (saved >= 0) {
      console.log(`   Saved: ${this.formatBytes(saved)} (${compressionRatio.toFixed(1)}% compression)`);
    } else {
      console.log(`   Expanded: ${this.formatBytes(-saved)} (${Math.abs(compressionRatio).toFixed(1)}% larger - normal for small files)`);
    }
    console.log(`   Manifest: ${basename(manifestPath)}`);

    return archivePath;
  }

  private checkPigzAvailable(): boolean {
    try {
      execSync('which pigz', {stdio: 'pipe'});
      return true;
    } catch {
      return false;
    }
  }

  private updateIndex(manifest: ArchiveManifest) {
    let index: any = {version: '1.0.0', archives: []};

    if (existsSync(this.indexFile)) {
      index = JSON.parse(readFileSync(this.indexFile, 'utf-8'));
    }

    index.archives.push({
      archive_file: manifest.archive_file,
      type: manifest.archive_type,
      created_at: manifest.created_at,
      size_compressed: manifest.size_compressed_bytes,
      compression_ratio: manifest.compression_ratio,
      files_count: manifest.files.length,
      keywords: manifest.keywords,
      manifest_path: join(this.manifestDir, manifest.archive_file.replace('.tar.gz', '.json')),
      chunk_metadata: manifest.chunk_metadata
    });

    index.total_archives = index.archives.length;
    index.total_original_size_bytes = index.archives.reduce((sum: number, a: any) =>
      sum + (a.size_original || 0), 0);
    index.total_compressed_size_bytes = index.archives.reduce((sum: number, a: any) =>
      sum + a.size_compressed, 0);
    index.total_space_saved_bytes = index.total_original_size_bytes - index.total_compressed_size_bytes;
    index.average_compression_ratio = index.archives.reduce((sum: number, a: any) =>
      sum + a.compression_ratio, 0) / index.archives.length;
    index.generated = new Date().toISOString();

    writeFileSync(this.indexFile, JSON.stringify(index, null, 2));
  }

  private updateStats(manifest: ArchiveManifest) {
    let stats: any = {version: '1.0.0', by_type: {}, timeline: []};

    if (existsSync(this.statsFile)) {
      stats = JSON.parse(readFileSync(this.statsFile, 'utf-8'));
    }

    if (!stats.by_type.chunk) {
      stats.by_type.chunk = {
        count: 0,
        original_bytes: 0,
        compressed_bytes: 0,
        saved_bytes: 0,
        avg_ratio: 0,
        total_files: 0,
        total_loc: 0,
        by_chunk_type: {}
      };
    }

    const chunkStats = stats.by_type.chunk;
    chunkStats.count++;
    chunkStats.original_bytes += manifest.size_original_bytes;
    chunkStats.compressed_bytes += manifest.size_compressed_bytes;
    chunkStats.saved_bytes = chunkStats.original_bytes - chunkStats.compressed_bytes;
    chunkStats.avg_ratio = (chunkStats.saved_bytes / chunkStats.original_bytes * 100);
    chunkStats.total_files += manifest.files.length;
    chunkStats.total_loc += manifest.chunk_metadata?.total_loc || 0;

    // Track stats by chunk type
    const chunkType = manifest.chunk_metadata?.chunk_type || 'unknown';
    if (!chunkStats.by_chunk_type[chunkType]) {
      chunkStats.by_chunk_type[chunkType] = {
        count: 0,
        saved_bytes: 0,
        total_files: 0
      };
    }
    chunkStats.by_chunk_type[chunkType].count++;
    chunkStats.by_chunk_type[chunkType].saved_bytes += manifest.size_original_bytes - manifest.size_compressed_bytes;
    chunkStats.by_chunk_type[chunkType].total_files += manifest.files.length;

    stats.timeline.push({
      timestamp: manifest.created_at,
      type: 'chunk',
      chunk_type: chunkType,
      archive: manifest.archive_file,
      saved_bytes: manifest.size_original_bytes - manifest.size_compressed_bytes
    });

    stats.last_updated = new Date().toISOString();

    writeFileSync(this.statsFile, JSON.stringify(stats, null, 2));
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const abs = Math.abs(bytes);
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(abs) / Math.log(k));
    const value = Math.round((abs / Math.pow(k, i)) * 100) / 100;
    const sign = bytes < 0 ? '-' : '';
    return sign + value + ' ' + sizes[i];
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: archive-chunk.ts <chunk-type> <context> <file1> [file2] ... [--reason "description"]');
    console.error('');
    console.error('Chunk types: tests, docs, configs, examples, deprecated');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx archive-chunk.ts tests api-v1 ./tests/**/*.test.ts');
    console.error('  npx tsx archive-chunk.ts docs legacy ./docs/old/*.md --reason "Migrated to new docs"');
    console.error('  npx tsx archive-chunk.ts configs production ./config/prod/*.json');
    console.error('  npx tsx archive-chunk.ts deprecated auth-v1 ./src/auth/v1/*.ts --reason "Replaced by v2"');
    process.exit(1);
  }

  const chunkType = args[0];
  const context = args[1];
  const files: string[] = [];
  let reason: string | undefined;

  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--reason') {
      reason = args[++i];
    } else if (!args[i].startsWith('--')) {
      files.push(args[i]);
    }
  }

  if (files.length === 0) {
    console.error('Error: No files specified');
    process.exit(1);
  }

  const archiver = new ChunkArchiver();
  archiver.archiveChunk({
    chunkType: chunkType as ChunkType,
    context,
    files,
    reason
  }).catch(error => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}

export {ChunkArchiver, ChunkArchiveOptions, ArchiveManifest, ChunkType};
