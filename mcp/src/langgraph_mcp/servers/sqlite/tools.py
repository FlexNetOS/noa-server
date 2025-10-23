"""SQLite tools for MCP server."""

import sqlite3
import pathlib
from typing import Any, Dict, List
import re


class SQLiteTools:
    """Secure SQLite database operations with query validation."""

    # Dangerous SQL patterns that should be blocked
    DANGEROUS_PATTERNS = [
        r'\bATTACH\b',
        r'\bDETACH\b',
        r'\bPRAGMA\b(?!\s+table_info)',  # Allow only PRAGMA table_info
        r'\bLOAD_EXTENSION\b',
    ]

    def __init__(self, db_path: str):
        """Initialize SQLite tools with a database path.

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = pathlib.Path(db_path).resolve()
        self.connection = None

    def _get_connection(self) -> sqlite3.Connection:
        """Get or create database connection.

        Returns:
            SQLite connection
        """
        if self.connection is None:
            self.connection = sqlite3.connect(str(self.db_path))
            self.connection.row_factory = sqlite3.Row
        return self.connection

    def _validate_query(self, query: str) -> tuple[bool, str | None]:
        """Validate SQL query for security issues.

        Args:
            query: SQL query to validate

        Returns:
            Tuple of (is_valid, error_message)
        """
        query_upper = query.upper()

        # Check for dangerous patterns
        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, query_upper):
                return False, f"Query contains forbidden operation: {pattern}"

        return True, None

    def execute_query(self, query: str, params: List[Any] | None = None) -> Dict[str, Any]:
        """Execute a SELECT query and return results.

        Args:
            query: SQL SELECT query
            params: Optional query parameters

        Returns:
            Dictionary with query results
        """
        # Validate query
        is_valid, error = self._validate_query(query)
        if not is_valid:
            return {"error": error, "success": False}

        # Ensure it's a SELECT query
        if not query.strip().upper().startswith("SELECT"):
            return {"error": "Only SELECT queries are allowed in execute_query", "success": False}

        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)

            rows = cursor.fetchall()

            # Convert rows to dictionaries
            results = []
            if rows:
                columns = [description[0] for description in cursor.description]
                results = [dict(zip(columns, row)) for row in rows]

            return {
                "success": True,
                "rows": results,
                "row_count": len(results),
                "columns": columns if rows else [],
            }
        except Exception as e:
            return {"error": str(e), "success": False}

    def execute_update(self, query: str, params: List[Any] | None = None) -> Dict[str, Any]:
        """Execute an INSERT, UPDATE, or DELETE query.

        Args:
            query: SQL modification query
            params: Optional query parameters

        Returns:
            Dictionary with operation result
        """
        # Validate query
        is_valid, error = self._validate_query(query)
        if not is_valid:
            return {"error": error, "success": False}

        # Ensure it's a modification query
        query_upper = query.strip().upper()
        allowed_statements = ["INSERT", "UPDATE", "DELETE", "CREATE", "ALTER", "DROP"]
        if not any(query_upper.startswith(stmt) for stmt in allowed_statements):
            return {
                "error": f"Query must start with one of: {', '.join(allowed_statements)}",
                "success": False
            }

        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)

            conn.commit()

            return {
                "success": True,
                "affected_rows": cursor.rowcount,
                "last_row_id": cursor.lastrowid if cursor.lastrowid != 0 else None,
                "message": "Query executed successfully",
            }
        except Exception as e:
            conn.rollback()
            return {"error": str(e), "success": False}

    def list_tables(self) -> Dict[str, Any]:
        """List all tables in the database.

        Returns:
            Dictionary with list of tables
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT name, type
                FROM sqlite_master
                WHERE type IN ('table', 'view')
                ORDER BY name
            """)

            tables = []
            for row in cursor.fetchall():
                tables.append({
                    "name": row["name"],
                    "type": row["type"],
                })

            return {
                "success": True,
                "tables": tables,
                "count": len(tables),
            }
        except Exception as e:
            return {"error": str(e), "success": False}

    def describe_table(self, table_name: str) -> Dict[str, Any]:
        """Get schema information for a table.

        Args:
            table_name: Name of the table

        Returns:
            Dictionary with table schema
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            # Get column information
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = []

            for row in cursor.fetchall():
                columns.append({
                    "name": row["name"],
                    "type": row["type"],
                    "not_null": bool(row["notnull"]),
                    "default_value": row["dflt_value"],
                    "primary_key": bool(row["pk"]),
                })

            if not columns:
                return {"error": f"Table '{table_name}' not found", "success": False}

            # Get index information
            cursor.execute(f"PRAGMA index_list({table_name})")
            indexes = []

            for row in cursor.fetchall():
                indexes.append({
                    "name": row["name"],
                    "unique": bool(row["unique"]),
                })

            return {
                "success": True,
                "table_name": table_name,
                "columns": columns,
                "indexes": indexes,
                "column_count": len(columns),
            }
        except Exception as e:
            return {"error": str(e), "success": False}

    def create_table(self, table_name: str, columns: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create a new table.

        Args:
            table_name: Name of the table to create
            columns: List of column definitions, each with 'name', 'type', and optional 'constraints'

        Returns:
            Dictionary with operation result
        """
        try:
            # Build CREATE TABLE statement
            column_defs = []
            for col in columns:
                name = col["name"]
                col_type = col["type"]
                constraints = col.get("constraints", "")

                column_defs.append(f"{name} {col_type} {constraints}".strip())

            create_sql = f"CREATE TABLE {table_name} ({', '.join(column_defs)})"

            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(create_sql)
            conn.commit()

            return {
                "success": True,
                "table_name": table_name,
                "message": f"Table '{table_name}' created successfully",
                "columns": len(columns),
            }
        except Exception as e:
            if self.connection:
                self.connection.rollback()
            return {"error": str(e), "success": False}

    def close(self):
        """Close database connection."""
        if self.connection:
            self.connection.close()
            self.connection = None

    def __del__(self):
        """Cleanup connection on deletion."""
        self.close()
