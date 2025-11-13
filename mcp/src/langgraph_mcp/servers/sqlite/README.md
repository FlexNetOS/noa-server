# SQLite MCP Server

Secure SQLite database operations exposed through the Model Context Protocol
(MCP).

## Features

- **Query Validation**: Prevents dangerous SQL operations
- **Prepared Statements**: Supports parameterized queries for SQL injection
  prevention
- **Schema Inspection**: Tools to explore database structure
- **Safe DDL Operations**: Controlled table creation and modification

## Tools

### `execute_query`

Execute a SELECT query and return results.

**Parameters:**

- `query` (string, required): SQL SELECT query
- `params` (array, optional): Query parameters for prepared statements

**Example:**

```json
{
  "query": "SELECT * FROM users WHERE age > ?",
  "params": [18]
}
```

### `execute_update`

Execute INSERT, UPDATE, DELETE, or DDL statements.

**Parameters:**

- `query` (string, required): SQL modification query
- `params` (array, optional): Query parameters for prepared statements

**Example:**

```json
{
  "query": "INSERT INTO users (name, email) VALUES (?, ?)",
  "params": ["John Doe", "john@example.com"]
}
```

### `list_tables`

List all tables and views in the database.

**Example:**

```json
{}
```

### `describe_table`

Get schema information for a specific table.

**Parameters:**

- `table_name` (string, required): Name of the table

**Example:**

```json
{
  "table_name": "users"
}
```

### `create_table`

Create a new table with specified columns.

**Parameters:**

- `table_name` (string, required): Name of the table
- `columns` (array, required): Column definitions with name, type, and optional
  constraints

**Example:**

```json
{
  "table_name": "products",
  "columns": [
    {
      "name": "id",
      "type": "INTEGER",
      "constraints": "PRIMARY KEY AUTOINCREMENT"
    },
    { "name": "name", "type": "TEXT", "constraints": "NOT NULL" },
    { "name": "price", "type": "REAL", "constraints": "NOT NULL" },
    {
      "name": "created_at",
      "type": "TIMESTAMP",
      "constraints": "DEFAULT CURRENT_TIMESTAMP"
    }
  ]
}
```

## Configuration

Set the database path using the `SQLITE_DB_PATH` environment variable:

```bash
export SQLITE_DB_PATH=/path/to/database.db
```

## Security

- **Query Validation**: Dangerous operations (ATTACH, DETACH, LOAD_EXTENSION)
  are blocked
- **Prepared Statements**: Parameterized queries prevent SQL injection
- **Read-only Separation**: SELECT queries use `execute_query`, modifications
  use `execute_update`
- **No Arbitrary PRAGMA**: Only safe PRAGMA operations are allowed
