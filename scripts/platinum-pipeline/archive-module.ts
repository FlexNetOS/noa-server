#!/usr/bin/env node
/**
 * Module-Level Archive Creator
 * Compresses entire directories/packages after consolidation
 */

import {execSync} from 'child_process';
import {readFileSync, writeFileSync, statSync, existsSync, mkdirSync, readdirSync} from 'fs';
import {createHash} from 'crypto';
import {basename, dirname, join, relative} from 'path';

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

interface ModuleArchiveOptions {
  moduleName: string;
  directoryPath: string;
  reason?: string;
  pipelineRunId?: string;
  policiesPassed?: string[];
}

class ModuleArchiver {
  private archiveDir = '.archives/modules';
  private manifestDir = '.archives/modules/manifests';
  private indexFile = '.archives/index.json';
  private statsFile = '.archives/stats.json';

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

  private recursivelyListFiles(dirPath: string, fileList: string[] = []): string[] {
    if (!existsSync(dirPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const stats = statSync(dirPath);
    if (!stats.isDirectory()) {
      // If it's a file, just add it
      fileList.push(dirPath);
      return fileList;
    }

    const entries = readdirSync(dirPath, {withFileTypes: true});

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      // Skip node_modules, .git, and other common excluded directories
      if (entry.isDirectory()) {
        if (['node_modules', '.git', '.archives', 'dist', 'build'].includes(entry.name)) {
          continue;
        }
        this.recursivelyListFiles(fullPath, fileList);
      } else {
        fileList.push(fullPath);
      }
    }

    return fileList;
  }

  private countLinesOfCode(filePath: string): number {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return content.split('\n').length;
    } catch {
      return 0;
    }
  }

  private getDirectoryStructure(dirPath: string, prefix = '', isLast = true): string[] {
    const structure: string[] = [];
    const entries = readdirSync(dirPath, {withFileTypes: true});

    entries.forEach((entry, index) => {
      const isLastEntry = index === entries.length - 1;
      const connector = isLastEntry ? '└── ' : '├── ';
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (['node_modules', '.git', '.archives', 'dist', 'build'].includes(entry.name)) {
          return;
        }
        structure.push(`${prefix}${connector}${entry.name}/`);
        const newPrefix = prefix + (isLastEntry ? '    ' : '│   ');
        structure.push(...this.getDirectoryStructure(fullPath, newPrefix, isLastEntry));
      } else {
        structure.push(`${prefix}${connector}${entry.name}`);
      }
    });

    return structure;
  }

  private loadPackageJson(dirPath: string): any | undefined {
    const packageJsonPath = join(dirPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        return JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  async archiveModule(options: ModuleArchiveOptions): Promise<string> {
    const timestamp = this.generateTimestamp();
    const archiveName = `${options.moduleName}-${timestamp}.MODULE.tar.gz`;
    const archivePath = join(this.archiveDir, archiveName);
    const manifestPath = join(this.manifestDir, `${options.moduleName}-${timestamp}.json`);

    console.log(`\n🗜️  Archiving module: ${options.moduleName}`);
    console.log(`📁 Directory: ${options.directoryPath}`);

    // Recursively collect all files
    const files = this.recursivelyListFiles(options.directoryPath);

    console.log(`📦 Files to compress: ${files.length}`);

    // Collect file metadata
    const fileMetadata = files.map(file => ({
      path: file,
      sha256_original: this.calculateSHA256(file),
      size_original: this.getFileSize(file)
    }));

    const originalSize = fileMetadata.reduce((sum, f) => sum + f.size_original, 0);

    // Calculate total LOC
    const totalLoc = files.reduce((sum, file) => sum + this.countLinesOfCode(file), 0);

    // Get directory structure
    const directoryStructure = this.getDirectoryStructure(options.directoryPath);

    // Load package.json if exists
    const packageJson = this.loadPackageJson(options.directoryPath);

    // Create archive with pigz (parallel gzip) if available
    const useParallel = this.checkPigzAvailable();
    const tarCommand = useParallel ? 'tar -I pigz' : 'tar -czf';

    const filesArg = files.join(' ');
    const transformArg = `--transform 's,^,${options.moduleName}-module/,'`;

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
      archive_type: 'module',
      created_at: new Date().toISOString(),
      created_by: 'platinum-pipeline/archive-module',
      files: fileMetadata,
      size_original_bytes: originalSize,
      size_compressed_bytes: compressedSize,
      compression_ratio: Math.round(compressionRatio * 100) / 100,
      compression_tool: useParallel ? 'pigz' : 'gzip',
      reason: options.reason || `Module '${options.moduleName}' consolidated and archived for space efficiency.`,
      module_metadata: {
        module_name: options.moduleName,
        package_json: packageJson,
        total_loc: totalLoc,
        file_count: files.length,
        directory_structure: directoryStructure
      },
      restore_command: `tar -xzf ${archivePath}`,
      restore_validation: `bash scripts/platinum-pipeline/verify-archives.sh ${archivePath}`,
      pipeline_run_id: options.pipelineRunId || `run-${timestamp}`,
      policy_checks_passed: options.policiesPassed || ['module-consolidation-validated'],
      tags: ['module', options.moduleName, 'consolidated', 'archived'],
      keywords: [options.moduleName, 'module', 'directory', 'consolidation']
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
    console.log(`   Files archived: ${files.length}`);
    console.log(`   Total LOC: ${totalLoc.toLocaleString()}`);
    if (packageJson) {
      console.log(`   Package: ${packageJson.name || 'unknown'}@${packageJson.version || 'unknown'}`);
    }
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
      module_metadata: manifest.module_metadata
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

    if (!stats.by_type.module) {
      stats.by_type.module = {
        count: 0,
        original_bytes: 0,
        compressed_bytes: 0,
        saved_bytes: 0,
        avg_ratio: 0,
        total_files: 0,
        total_loc: 0
      };
    }

    const moduleStats = stats.by_type.module;
    moduleStats.count++;
    moduleStats.original_bytes += manifest.size_original_bytes;
    moduleStats.compressed_bytes += manifest.size_compressed_bytes;
    moduleStats.saved_bytes = moduleStats.original_bytes - moduleStats.compressed_bytes;
    moduleStats.avg_ratio = (moduleStats.saved_bytes / moduleStats.original_bytes * 100);
    moduleStats.total_files += manifest.files.length;
    moduleStats.total_loc += manifest.module_metadata?.total_loc || 0;

    stats.timeline.push({
      timestamp: manifest.created_at,
      type: 'module',
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

  if (args.length < 2) {
    console.error('Usage: archive-module.ts <module-name> <directory-path> [--reason "description"]');
    console.error('');
    console.error('Example: npx tsx archive-module.ts my-package ./packages/my-package --reason "Deprecated legacy code"');
    process.exit(1);
  }

  const moduleName = args[0];
  const directoryPath = args[1];
  let reason: string | undefined;

  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--reason') {
      reason = args[++i];
    }
  }

  const archiver = new ModuleArchiver();
  archiver.archiveModule({
    moduleName,
    directoryPath,
    reason
  }).catch(error => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}

export {ModuleArchiver, ModuleArchiveOptions, ArchiveManifest};
