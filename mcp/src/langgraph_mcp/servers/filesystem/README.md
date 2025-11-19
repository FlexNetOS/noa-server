# Filesystem MCP Server

Secure filesystem operations exposed through the Model Context Protocol (MCP).

## Features

- **Sandboxed Operations**: All operations are restricted to a base directory
- **Path Validation**: Prevents path traversal attacks
- **Comprehensive Tools**: Read, write, list, create, delete, and search files

## Tools

### `read_file`

Read the contents of a file.

**Parameters:**

- `path` (string, required): Relative path to the file
- `encoding` (string, optional): File encoding (default: utf-8)

**Example:**

```json
{
  "path": "docs/README.md",
  "encoding": "utf-8"
}
```

### `write_file`

Write content to a file.

**Parameters:**

- `path` (string, required): Relative path to the file
- `content` (string, required): Content to write
- `encoding` (string, optional): File encoding (default: utf-8)
- `create_dirs` (boolean, optional): Create parent directories (default: true)

**Example:**

```json
{
  "path": "output/result.txt",
  "content": "Hello, World!",
  "create_dirs": true
}
```

### `list_directory`

List contents of a directory.

**Parameters:**

- `path` (string, optional): Relative path to directory (default: ".")
- `pattern` (string, optional): Glob pattern to filter results

**Example:**

```json
{
  "path": "src",
  "pattern": "*.py"
}
```

### `create_directory`

Create a new directory.

**Parameters:**

- `path` (string, required): Relative path to directory
- `parents` (boolean, optional): Create parent directories (default: true)

**Example:**

```json
{
  "path": "new/nested/directory",
  "parents": true
}
```

### `delete_file`

Delete a file or directory.

**Parameters:**

- `path` (string, required): Relative path to file/directory
- `recursive` (boolean, optional): Delete directories recursively (default:
  false)

**Example:**

```json
{
  "path": "temp/old-file.txt",
  "recursive": false
}
```

### `search_files`

Search for files matching a glob pattern.

**Parameters:**

- `pattern` (string, required): Glob pattern (e.g., "_.py", "\*\*/_.txt")
- `path` (string, optional): Starting directory (default: ".")
- `recursive` (boolean, optional): Search recursively (default: true)

**Example:**

```json
{
  "pattern": "*.md",
  "path": "docs",
  "recursive": true
}
```

## Configuration

Set the base directory using the `FILESYSTEM_BASE_PATH` environment variable:

```bash
export FILESYSTEM_BASE_PATH=/path/to/sandbox
```

If not set, the current working directory is used.

## Security

- All paths are validated to prevent path traversal attacks
- Operations are restricted to the configured base directory
- Symbolic links are resolved and validated
- No execution of files is permitted
