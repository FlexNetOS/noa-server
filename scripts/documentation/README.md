# Documentation Automation Scripts

> Scripts for managing and maintaining NOA Server documentation

## Available Scripts

### 1. scan-docs-fast.sh

Fast documentation scanner optimized for large codebases.

**Usage:**

```bash
bash scripts/documentation/scan-docs-fast.sh
```

**Output:** `docs/.catalog.json`

**Features:**

- Scans 8000+ markdown files efficiently
- Generates metadata (title, category, lines, words)
- Streaming JSON generation
- Progress indicators

### 2. update-readmes.sh

Update all README files with consistent structure.

**Usage:**

```bash
bash scripts/documentation/update-readmes.sh
```

**Features:**

- Adds master index links
- Updates timestamps
- Validates internal links
- Creates missing READMEs

### 3. add-toc.sh

Generate table of contents for large files.

**Usage:**

```bash
bash scripts/documentation/add-toc.sh
```

**Features:**

- Adds TOC to files >500 lines
- Generates markdown anchor links
- Updates existing TOCs
- Automatic heading extraction

### 4. validate-links.sh

Validate all internal documentation links.

**Usage:**

```bash
bash scripts/documentation/validate-links.sh
```

**Output:** `docs/LINK_VALIDATION_REPORT.md`

**Features:**

- Checks internal links
- Identifies broken links
- Generates detailed report
- Supports relative and absolute paths

### 5. validate-code-examples.sh

Validate code examples in documentation.

**Usage:**

```bash
bash scripts/documentation/validate-code-examples.sh
```

**Output:** `docs/CODE_VALIDATION_REPORT.md`

**Features:**

- Validates TypeScript/JavaScript syntax
- Validates Bash syntax
- Checks language labels
- Generates validation report

### 6. build-search-index.sh

Build searchable documentation index.

**Usage:**

```bash
bash scripts/documentation/build-search-index.sh
```

**Output:** `docs/.search-index.json`

**Features:**

- Extracts keywords
- Extracts headings
- Generates summaries
- Lunr.js compatible format

### 7. generate-dependency-graph.sh

Generate documentation dependency graph.

**Usage:**

```bash
bash scripts/documentation/generate-dependency-graph.sh
```

**Output:** `docs/DEPENDENCY_GRAPH.md`

**Features:**

- Analyzes documentation relationships
- Generates Mermaid diagrams
- Identifies orphaned docs
- Finds hub documentation

## Workflow

### Initial Setup

```bash
# Scan all documentation
bash scripts/documentation/scan-docs-fast.sh

# Validate links
bash scripts/documentation/validate-links.sh

# Validate code examples
bash scripts/documentation/validate-code-examples.sh

# Generate dependency graph
bash scripts/documentation/generate-dependency-graph.sh

# Build search index
bash scripts/documentation/build-search-index.sh
```

### Regular Maintenance

```bash
# Weekly: Validate links and code
bash scripts/documentation/validate-links.sh
bash scripts/documentation/validate-code-examples.sh

# Monthly: Re-scan and update statistics
bash scripts/documentation/scan-docs-fast.sh

# As needed: Update READMEs
bash scripts/documentation/update-readmes.sh
```

## Requirements

- `bash` >= 4.0
- `jq` for JSON processing
- `grep`, `sed`, `awk` for text processing
- `node` for JavaScript validation (optional)

## Exit Codes

- `0` - Success
- `1` - Error or validation failures

## Environment Variables

None required. All scripts use relative paths from project root.

## License

MIT
