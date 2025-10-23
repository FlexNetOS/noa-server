# Platinum Pipeline Compression Archivers

Complete implementation of two compression archivers following the SymbolArchiver pattern.

## Overview

Both archivers follow the exact pattern from `/home/deflex/noa-server/scripts/platinum-pipeline/archive-symbol.ts`:
- SHA-256 cryptographic verification
- Parallel compression with pigz (when available)
- Manifest generation with full metadata
- Automatic index and stats updates
- Type-safe TypeScript implementation

## 1. Module Archiver

**File**: `/home/deflex/noa-server/scripts/platinum-pipeline/archive-module.ts`

### Purpose
Compress entire directories/packages after consolidation. Ideal for archiving:
- Deprecated packages
- Consolidated modules
- Legacy codebases
- Refactored directories

### Features
- **Recursive directory scanning** - Automatically finds all files in directory tree
- **Smart exclusions** - Skips node_modules, .git, .archives, dist, build
- **Package.json integration** - Reads and stores package metadata
- **LOC counting** - Calculates total lines of code
- **Directory structure** - Captures tree structure in manifest
- **SHA-256 verification** - Every file hashed before compression

### CLI Usage

```bash
# Basic usage
npx tsx archive-module.ts <module-name> <directory-path>

# With reason
npx tsx archive-module.ts <module-name> <directory-path> --reason "description"

# Examples
npx tsx archive-module.ts legacy-auth ./packages/auth-v1 --reason "Replaced by auth v2"
npx tsx archive-module.ts old-api ./src/api/v1 --reason "Deprecated API version"
npx tsx archive-module.ts test-pkg ./packages/test-package
```

### Archive Naming
```
{module-name}-{timestamp}.MODULE.tar.gz
```
Example: `legacy-auth-2025-10-23T08-30-15.MODULE.tar.gz`

### Module Metadata

The manifest includes rich metadata:

```json
{
  "module_metadata": {
    "module_name": "legacy-auth",
    "package_json": {
      "name": "auth-v1",
      "version": "1.2.3",
      "dependencies": {...}
    },
    "total_loc": 12500,
    "file_count": 89,
    "directory_structure": [
      "├── src/",
      "│   ├── index.ts",
      "│   ├── auth.ts",
      "│   └── utils/",
      "│       └── helpers.ts",
      "├── tests/",
      "│   └── auth.test.ts",
      "└── package.json"
    ]
  }
}
```

### Output Location
- **Archives**: `.archives/modules/{name}-{timestamp}.MODULE.tar.gz`
- **Manifests**: `.archives/modules/manifests/{name}-{timestamp}.json`

## 2. Chunk Archiver

**File**: `/home/deflex/noa-server/scripts/platinum-pipeline/archive-chunk.ts`

### Purpose
Compress related file groups by type. Ideal for archiving:
- Test suites after validation
- Documentation after migration
- Configuration files after consolidation
- Example code after integration
- Deprecated code after replacement

### Chunk Types

1. **tests** - Test files, specs, fixtures
2. **docs** - Documentation, markdown, guides
3. **configs** - Configuration files, env files
4. **examples** - Example code, samples, demos
5. **deprecated** - Legacy code, old implementations

### Features
- **Type validation** - Ensures valid chunk type
- **File type analysis** - Counts files by extension
- **Directory grouping** - Groups files by parent directory
- **Context tracking** - Associates files with specific context
- **Smart defaults** - Automatic reason generation per chunk type
- **SHA-256 verification** - Every file hashed before compression

### CLI Usage

```bash
# Basic usage
npx tsx archive-chunk.ts <chunk-type> <context> <file1> [file2] ...

# With reason
npx tsx archive-chunk.ts <chunk-type> <context> <files...> --reason "description"

# Examples - Tests
npx tsx archive-chunk.ts tests api-v1 \
  ./tests/api/v1/*.test.ts \
  ./tests/fixtures/v1/*.json

# Examples - Documentation
npx tsx archive-chunk.ts docs legacy \
  ./docs/old/*.md \
  --reason "Migrated to new documentation system"

# Examples - Configs
npx tsx archive-chunk.ts configs production \
  ./config/prod/*.json \
  ./config/prod/*.yaml

# Examples - Examples
npx tsx archive-chunk.ts examples auth-demo \
  ./examples/auth/*.ts \
  --reason "Integrated into main tutorials"

# Examples - Deprecated
npx tsx archive-chunk.ts deprecated auth-v1 \
  ./src/auth/v1/*.ts \
  ./src/auth/v1/*.js \
  --reason "Replaced by auth v2 implementation"
```

### Archive Naming
```
{chunk-type}-{context}-{timestamp}.CHUNK.tar.gz
```
Examples:
- `tests-api-v1-2025-10-23T08-30-15.CHUNK.tar.gz`
- `docs-legacy-2025-10-23T08-30-15.CHUNK.tar.gz`
- `deprecated-auth-v1-2025-10-23T08-30-15.CHUNK.tar.gz`

### Chunk Metadata

The manifest includes detailed chunk analysis:

```json
{
  "chunk_metadata": {
    "chunk_type": "tests",
    "context": "api-v1",
    "file_types": {
      ".ts": 45,
      ".json": 12,
      ".md": 3
    },
    "total_loc": 8500,
    "file_count": 60,
    "file_groups": {
      "./tests/api": ["v1.test.ts", "auth.test.ts"],
      "./tests/fixtures": ["users.json", "posts.json"]
    }
  }
}
```

### Output Location
- **Archives**: `.archives/chunks/{type}-{context}-{timestamp}.CHUNK.tar.gz`
- **Manifests**: `.archives/chunks/manifests/{type}-{context}-{timestamp}.json`

## Shared Architecture

### Compression

Both archivers use the same compression strategy:

```typescript
// Detect pigz availability
const useParallel = this.checkPigzAvailable();
const tarCommand = useParallel ? 'tar -I pigz' : 'tar -czf';

// Create archive with proper path transformation
execSync(`${tarCommand} -cf ${archivePath} ${transformArg} ${filesArg}`);
```

**Benefits**:
- **Parallel compression** - Up to 4x faster with pigz
- **Graceful fallback** - Uses gzip if pigz unavailable
- **Path transformation** - Organizes files in archive directory

### Manifest Structure

Both generate comprehensive manifests:

```json
{
  "archive_file": "name-timestamp.TYPE.tar.gz",
  "archive_type": "module" | "chunk",
  "created_at": "2025-10-23T08:30:15.000Z",
  "created_by": "platinum-pipeline/archive-{module|chunk}",
  "files": [
    {
      "path": "./src/index.ts",
      "sha256_original": "a1b2c3d4...",
      "size_original": 1024
    }
  ],
  "size_original_bytes": 50000,
  "size_compressed_bytes": 15000,
  "compression_ratio": 70.0,
  "compression_tool": "pigz",
  "reason": "Descriptive reason for archival",
  "restore_command": "tar -xzf .archives/...tar.gz",
  "restore_validation": "bash scripts/platinum-pipeline/verify-archives.sh ...",
  "pipeline_run_id": "run-2025-10-23T08-30-15",
  "policy_checks_passed": ["validation-passed"],
  "tags": ["tag1", "tag2"],
  "keywords": ["keyword1", "keyword2"]
}
```

### Index Updates

Both update `.archives/index.json`:

```json
{
  "version": "1.0.0",
  "archives": [
    {
      "archive_file": "name-timestamp.TYPE.tar.gz",
      "type": "module" | "chunk",
      "created_at": "2025-10-23T08:30:15.000Z",
      "size_compressed": 15000,
      "compression_ratio": 70.0,
      "files_count": 89,
      "keywords": ["legacy", "auth"],
      "manifest_path": ".archives/.../manifest.json"
    }
  ],
  "total_archives": 150,
  "total_original_size_bytes": 50000000,
  "total_compressed_size_bytes": 15000000,
  "total_space_saved_bytes": 35000000,
  "average_compression_ratio": 70.0,
  "generated": "2025-10-23T08:30:15.000Z"
}
```

### Stats Updates

Both update `.archives/stats.json`:

```json
{
  "version": "1.0.0",
  "by_type": {
    "module": {
      "count": 25,
      "original_bytes": 25000000,
      "compressed_bytes": 7500000,
      "saved_bytes": 17500000,
      "avg_ratio": 70.0,
      "total_files": 2250,
      "total_loc": 250000
    },
    "chunk": {
      "count": 125,
      "original_bytes": 25000000,
      "compressed_bytes": 7500000,
      "saved_bytes": 17500000,
      "avg_ratio": 70.0,
      "total_files": 3750,
      "total_loc": 150000,
      "by_chunk_type": {
        "tests": {
          "count": 45,
          "saved_bytes": 8000000,
          "total_files": 1500
        },
        "docs": {
          "count": 30,
          "saved_bytes": 4000000,
          "total_files": 900
        }
      }
    }
  },
  "timeline": [
    {
      "timestamp": "2025-10-23T08:30:15.000Z",
      "type": "module",
      "archive": "name.MODULE.tar.gz",
      "saved_bytes": 35000
    }
  ],
  "last_updated": "2025-10-23T08:30:15.000Z"
}
```

## Programmatic Usage

Both archivers export classes for programmatic use:

### Module Archiver

```typescript
import {ModuleArchiver} from './archive-module';

const archiver = new ModuleArchiver();

const archivePath = await archiver.archiveModule({
  moduleName: 'legacy-auth',
  directoryPath: './packages/auth-v1',
  reason: 'Replaced by auth v2',
  pipelineRunId: 'platinum-run-001',
  policiesPassed: ['security-audit', 'code-review']
});

console.log(`Archived to: ${archivePath}`);
```

### Chunk Archiver

```typescript
import {ChunkArchiver} from './archive-chunk';

const archiver = new ChunkArchiver();

const archivePath = await archiver.archiveChunk({
  chunkType: 'tests',
  context: 'api-v1',
  files: ['./tests/api/*.test.ts', './tests/fixtures/*.json'],
  reason: 'Test suite archived after validation',
  pipelineRunId: 'platinum-run-001',
  policiesPassed: ['tests-passed', 'coverage-validated']
});

console.log(`Archived to: ${archivePath}`);
```

## Verification

Both archivers support verification via:

```bash
bash scripts/platinum-pipeline/verify-archives.sh <archive-path>
```

This validates:
- Archive integrity
- SHA-256 checksums
- Manifest consistency
- Restore capability

## Restore

To restore archived files:

```bash
# Extract to current directory
tar -xzf .archives/modules/name-timestamp.MODULE.tar.gz

# Extract to specific location
tar -xzf .archives/chunks/type-context-timestamp.CHUNK.tar.gz -C /target/path

# List contents without extracting
tar -tzf .archives/modules/name-timestamp.MODULE.tar.gz
```

## Best Practices

### Module Archiver
1. **Archive entire packages** - Use for complete directory trees
2. **Include context** - Use descriptive module names
3. **Document reason** - Always provide --reason flag
4. **Verify package.json** - Ensure package metadata is accurate
5. **Check exclusions** - Verify node_modules are excluded

### Chunk Archiver
1. **Group related files** - Archive files with common purpose
2. **Use appropriate type** - Choose correct chunk type
3. **Meaningful context** - Use descriptive context identifiers
4. **Glob patterns** - Use shell globs to match multiple files
5. **Verify file list** - Check all intended files are included

### General
1. **Test pigz installation** - Install pigz for faster compression
2. **Monitor disk space** - Archives saved to `.archives/` directory
3. **Regular cleanup** - Periodically review and clean old archives
4. **Backup manifests** - Manifests contain critical metadata
5. **Version control** - Consider committing `.archives/index.json`

## Performance

### Compression Ratios

Typical compression ratios by file type:

| Type | Ratio | Example |
|------|-------|---------|
| JavaScript/TypeScript | 70-80% | 100KB → 20-30KB |
| JSON | 75-85% | 50KB → 7-12KB |
| Markdown | 60-70% | 20KB → 6-8KB |
| YAML | 65-75% | 10KB → 2-3KB |
| Binary files | 0-10% | 100KB → 90-100KB |

### Speed Comparison

| Tool | Speed | CPU Usage | Availability |
|------|-------|-----------|--------------|
| gzip | 1x | Single core | Universal |
| pigz | 2-4x | Multi-core | Install required |

Install pigz for optimal performance:
```bash
# Ubuntu/Debian
sudo apt-get install pigz

# macOS
brew install pigz

# RHEL/CentOS
sudo yum install pigz
```

## Integration with Platinum Pipeline

Both archivers integrate seamlessly with the Platinum Pipeline:

1. **Symbol consolidation** → `archive-symbol.ts`
2. **Module consolidation** → `archive-module.ts`
3. **Chunk consolidation** → `archive-chunk.ts`
4. **Verification** → `verify-archives.sh`
5. **Search** → `search-archives.ts`
6. **Restore** → `restore-from-archive.ts`

## Troubleshooting

### Common Issues

**Issue**: Permission denied
```bash
chmod +x scripts/platinum-pipeline/archive-module.ts
chmod +x scripts/platinum-pipeline/archive-chunk.ts
```

**Issue**: File not found
- Use absolute paths or correct relative paths
- Verify files exist before archiving

**Issue**: pigz not found
- Archives will fall back to gzip automatically
- Install pigz for better performance

**Issue**: Archive larger than original
- Normal for very small files due to compression overhead
- Archive groups of small files together for efficiency

## Files Created

### Implementation Files
- `/home/deflex/noa-server/scripts/platinum-pipeline/archive-module.ts` (13KB)
- `/home/deflex/noa-server/scripts/platinum-pipeline/archive-chunk.ts` (14KB)

### Runtime Files (Auto-generated)
- `.archives/modules/{name}-{timestamp}.MODULE.tar.gz`
- `.archives/modules/manifests/{name}-{timestamp}.json`
- `.archives/chunks/{type}-{context}-{timestamp}.CHUNK.tar.gz`
- `.archives/chunks/manifests/{type}-{context}-{timestamp}.json`
- `.archives/index.json`
- `.archives/stats.json`

## Summary

Both archivers provide enterprise-grade compression with:
- SHA-256 cryptographic verification
- Parallel compression support
- Comprehensive metadata tracking
- Automatic index/stats updates
- Type-safe TypeScript implementation
- CLI and programmatic interfaces
- Seamless Platinum Pipeline integration

Use `archive-module.ts` for directories and `archive-chunk.ts` for file groups.
