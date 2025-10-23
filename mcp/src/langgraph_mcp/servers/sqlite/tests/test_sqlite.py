"""Unit tests for SQLite MCP server."""

import pytest
import tempfile
import pathlib
import sqlite3
from ..tools import SQLiteTools


@pytest.fixture
def temp_db():
    """Create a temporary SQLite database for testing."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = pathlib.Path(tmp.name)

    yield str(db_path)

    # Cleanup
    if db_path.exists():
        db_path.unlink()


@pytest.fixture
def sqlite_tools(temp_db):
    """Create SQLiteTools instance with temp database."""
    tools = SQLiteTools(temp_db)
    yield tools
    tools.close()


@pytest.fixture
def populated_db(sqlite_tools):
    """Create a database with test data."""
    # Create test table
    sqlite_tools.create_table("users", [
        {"name": "id", "type": "INTEGER", "constraints": "PRIMARY KEY AUTOINCREMENT"},
        {"name": "name", "type": "TEXT", "constraints": "NOT NULL"},
        {"name": "email", "type": "TEXT", "constraints": "UNIQUE"},
        {"name": "age", "type": "INTEGER"}
    ])

    # Insert test data
    sqlite_tools.execute_update(
        "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
        ["Alice", "alice@example.com", 30]
    )
    sqlite_tools.execute_update(
        "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
        ["Bob", "bob@example.com", 25]
    )

    return sqlite_tools


class TestExecuteQuery:
    """Tests for execute_query tool."""

    def test_select_all(self, populated_db):
        """Test SELECT * query."""
        result = populated_db.execute_query("SELECT * FROM users")

        assert result["success"] is True
        assert result["row_count"] == 2
        assert len(result["rows"]) == 2
        assert "name" in result["columns"]

    def test_select_with_where_clause(self, populated_db):
        """Test SELECT with WHERE clause."""
        result = populated_db.execute_query(
            "SELECT name, age FROM users WHERE age > ?",
            [26]
        )

        assert result["success"] is True
        assert result["row_count"] == 1
        assert result["rows"][0]["name"] == "Alice"

    def test_select_empty_result(self, populated_db):
        """Test SELECT with no matching rows."""
        result = populated_db.execute_query(
            "SELECT * FROM users WHERE age > 100"
        )

        assert result["success"] is True
        assert result["row_count"] == 0
        assert result["rows"] == []

    def test_non_select_query_rejected(self, populated_db):
        """Test that non-SELECT queries are rejected."""
        result = populated_db.execute_query(
            "DELETE FROM users WHERE id = 1"
        )

        assert result["success"] is False
        assert "only select" in result["error"].lower()

    def test_invalid_sql(self, populated_db):
        """Test handling of invalid SQL."""
        result = populated_db.execute_query("INVALID SQL QUERY")

        assert result["success"] is False
        assert "error" in result


class TestExecuteUpdate:
    """Tests for execute_update tool."""

    def test_insert(self, populated_db):
        """Test INSERT statement."""
        result = populated_db.execute_update(
            "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
            ["Charlie", "charlie@example.com", 35]
        )

        assert result["success"] is True
        assert result["affected_rows"] == 1
        assert result["last_row_id"] is not None

        # Verify insertion
        query_result = populated_db.execute_query(
            "SELECT * FROM users WHERE name = 'Charlie'"
        )
        assert query_result["row_count"] == 1

    def test_update(self, populated_db):
        """Test UPDATE statement."""
        result = populated_db.execute_update(
            "UPDATE users SET age = ? WHERE name = ?",
            [31, "Alice"]
        )

        assert result["success"] is True
        assert result["affected_rows"] == 1

        # Verify update
        query_result = populated_db.execute_query(
            "SELECT age FROM users WHERE name = 'Alice'"
        )
        assert query_result["rows"][0]["age"] == 31

    def test_delete(self, populated_db):
        """Test DELETE statement."""
        result = populated_db.execute_update(
            "DELETE FROM users WHERE name = ?",
            ["Bob"]
        )

        assert result["success"] is True
        assert result["affected_rows"] == 1

        # Verify deletion
        query_result = populated_db.execute_query(
            "SELECT * FROM users WHERE name = 'Bob'"
        )
        assert query_result["row_count"] == 0

    def test_constraint_violation(self, populated_db):
        """Test handling of constraint violations."""
        result = populated_db.execute_update(
            "INSERT INTO users (name, email) VALUES (?, ?)",
            ["Duplicate", "alice@example.com"]  # Duplicate email
        )

        assert result["success"] is False
        assert "error" in result

    def test_rollback_on_error(self, populated_db):
        """Test that errors trigger rollback."""
        # Get initial count
        initial_result = populated_db.execute_query("SELECT COUNT(*) as cnt FROM users")
        initial_count = initial_result["rows"][0]["cnt"]

        # Attempt invalid insert
        populated_db.execute_update("INSERT INTO invalid_table VALUES (1)")

        # Verify count unchanged
        final_result = populated_db.execute_query("SELECT COUNT(*) as cnt FROM users")
        final_count = final_result["rows"][0]["cnt"]

        assert final_count == initial_count


class TestListTables:
    """Tests for list_tables tool."""

    def test_list_empty_database(self, sqlite_tools):
        """Test listing tables in empty database."""
        result = sqlite_tools.list_tables()

        assert result["success"] is True
        assert result["count"] == 0
        assert result["tables"] == []

    def test_list_tables_with_data(self, populated_db):
        """Test listing tables in populated database."""
        result = populated_db.list_tables()

        assert result["success"] is True
        assert result["count"] == 1
        assert any(t["name"] == "users" for t in result["tables"])

    def test_list_includes_views(self, populated_db):
        """Test that views are included in listing."""
        # Create a view
        populated_db.execute_update(
            "CREATE VIEW adult_users AS SELECT * FROM users WHERE age >= 18"
        )

        result = populated_db.list_tables()

        assert result["success"] is True
        assert result["count"] == 2
        assert any(t["name"] == "adult_users" and t["type"] == "view" for t in result["tables"])


class TestDescribeTable:
    """Tests for describe_table tool."""

    def test_describe_existing_table(self, populated_db):
        """Test describing an existing table."""
        result = populated_db.describe_table("users")

        assert result["success"] is True
        assert result["table_name"] == "users"
        assert result["column_count"] == 4

        # Check columns
        column_names = [c["name"] for c in result["columns"]]
        assert "id" in column_names
        assert "name" in column_names
        assert "email" in column_names
        assert "age" in column_names

        # Check constraints
        id_column = next(c for c in result["columns"] if c["name"] == "id")
        assert id_column["primary_key"] is True

        name_column = next(c for c in result["columns"] if c["name"] == "name")
        assert name_column["not_null"] is True

    def test_describe_nonexistent_table(self, sqlite_tools):
        """Test describing a non-existent table."""
        result = sqlite_tools.describe_table("nonexistent_table")

        assert result["success"] is False
        assert "error" in result


class TestCreateTable:
    """Tests for create_table tool."""

    def test_create_simple_table(self, sqlite_tools):
        """Test creating a simple table."""
        result = sqlite_tools.create_table("products", [
            {"name": "id", "type": "INTEGER", "constraints": "PRIMARY KEY"},
            {"name": "name", "type": "TEXT", "constraints": "NOT NULL"},
            {"name": "price", "type": "REAL"}
        ])

        assert result["success"] is True
        assert result["table_name"] == "products"
        assert result["columns"] == 3

        # Verify table was created
        tables_result = sqlite_tools.list_tables()
        assert any(t["name"] == "products" for t in tables_result["tables"])

    def test_create_table_with_defaults(self, sqlite_tools):
        """Test creating a table with default values."""
        result = sqlite_tools.create_table("events", [
            {"name": "id", "type": "INTEGER", "constraints": "PRIMARY KEY AUTOINCREMENT"},
            {"name": "event_name", "type": "TEXT", "constraints": "NOT NULL"},
            {"name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT CURRENT_TIMESTAMP"}
        ])

        assert result["success"] is True

        # Insert without timestamp and verify default is used
        sqlite_tools.execute_update(
            "INSERT INTO events (event_name) VALUES (?)",
            ["Test Event"]
        )

        query_result = sqlite_tools.execute_query("SELECT * FROM events")
        assert query_result["rows"][0]["created_at"] is not None

    def test_create_duplicate_table(self, populated_db):
        """Test creating a table that already exists."""
        result = populated_db.create_table("users", [
            {"name": "id", "type": "INTEGER"}
        ])

        assert result["success"] is False
        assert "error" in result


class TestQueryValidation:
    """Tests for SQL query validation."""

    def test_block_attach_database(self, sqlite_tools):
        """Test that ATTACH DATABASE is blocked."""
        result = sqlite_tools.execute_query("ATTACH DATABASE 'other.db' AS other")

        assert result["success"] is False
        assert "forbidden" in result["error"].lower()

    def test_block_pragma_except_table_info(self, sqlite_tools):
        """Test that dangerous PRAGMA statements are blocked."""
        result = sqlite_tools.execute_update("PRAGMA case_sensitive_like = ON")

        assert result["success"] is False
        assert "forbidden" in result["error"].lower()

    def test_allow_pragma_table_info(self, populated_db):
        """Test that PRAGMA table_info is allowed."""
        # This is used internally in describe_table
        result = populated_db.describe_table("users")

        assert result["success"] is True
