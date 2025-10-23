# Platinum Pipeline - Compression Archivers

Quick reference for the compression archiver tools.

## Available Archivers

### 1. archive-symbol.ts
Archives individual duplicate symbols after value extraction.
```bash
npx tsx archive-symbol.ts <symbol-name> <file1> [file2] ... --canonical <path> --value "desc"
```

### 2. archive-module.ts
Archives entire directories/packages after consolidation.
```bash
npx tsx archive-module.ts <module-name> <directory-path> --reason "description"
```

### 3. archive-chunk.ts
Archives related file groups (tests, docs, configs, examples, deprecated).
```bash
npx tsx archive-chunk.ts <chunk-type> <context> <file1> [file2] ... --reason "description"
```

## Quick Examples

### Archive a deprecated module
```bash
npx tsx archive-module.ts legacy-auth ./packages/auth-v1 --reason "Replaced by v2"
```

### Archive test files
```bash
npx tsx archive-chunk.ts tests api-v1 ./tests/api/v1/*.test.ts
```

### Archive documentation
```bash
npx tsx archive-chunk.ts docs old-guides ./docs/legacy/*.md --reason "Migrated to new system"
```

### Archive deprecated code
```bash
npx tsx archive-chunk.ts deprecated auth-v1 ./src/auth/v1/*.ts --reason "Superseded by v2"
```

## Archive Locations

- **Symbols**: `.archives/symbols/`
- **Modules**: `.archives/modules/`
- **Chunks**: `.archives/chunks/`
- **Index**: `.archives/index.json`
- **Stats**: `.archives/stats.json`

## Chunk Types

- `tests` - Test files, specs, fixtures
- `docs` - Documentation, markdown, guides
- `configs` - Configuration files
- `examples` - Example code, demos
- `deprecated` - Legacy code

## Verification

```bash
bash scripts/platinum-pipeline/verify-archives.sh <archive-path>
```

## Restore

```bash
tar -xzf .archives/modules/name-timestamp.MODULE.tar.gz
```

## Full Documentation

See `/home/deflex/noa-server/docs/platinum-pipeline-archivers.md` for complete documentation.
