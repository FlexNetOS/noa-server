"""SQLite MCP Server implementation."""

import os
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import json
from .tools import SQLiteTools


def create_sqlite_server(db_path: str | None = None) -> Server:
    """Create and configure the SQLite MCP server.

    Args:
        db_path: Path to SQLite database file.
                 If None, uses SQLITE_DB_PATH env var.

    Returns:
        Configured MCP Server instance
    """
    server = Server("sqlite")

    # Get database path from env or parameter
    if db_path is None:
        db_path = os.getenv("SQLITE_DB_PATH")
        if not db_path:
            raise ValueError("SQLITE_DB_PATH environment variable must be set")

    sqlite_tools = SQLiteTools(db_path)

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        """List available SQLite tools."""
        return [
            Tool(
                name="execute_query",
                description="Execute a SELECT query and return results",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "SQL SELECT query to execute"
                        },
                        "params": {
                            "type": "array",
                            "description": "Optional query parameters for prepared statements",
                            "items": {"type": ["string", "number", "null"]}
                        }
                    },
                    "required": ["query"]
                }
            ),
            Tool(
                name="execute_update",
                description="Execute INSERT, UPDATE, DELETE, or DDL statements",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "SQL modification query to execute"
                        },
                        "params": {
                            "type": "array",
                            "description": "Optional query parameters for prepared statements",
                            "items": {"type": ["string", "number", "null"]}
                        }
                    },
                    "required": ["query"]
                }
            ),
            Tool(
                name="list_tables",
                description="List all tables and views in the database",
                inputSchema={
                    "type": "object",
                    "properties": {}
                }
            ),
            Tool(
                name="describe_table",
                description="Get schema information for a specific table",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "table_name": {
                            "type": "string",
                            "description": "Name of the table to describe"
                        }
                    },
                    "required": ["table_name"]
                }
            ),
            Tool(
                name="create_table",
                description="Create a new table with specified columns",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "table_name": {
                            "type": "string",
                            "description": "Name of the table to create"
                        },
                        "columns": {
                            "type": "array",
                            "description": "Column definitions",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "type": {"type": "string"},
                                    "constraints": {"type": "string"}
                                },
                                "required": ["name", "type"]
                            }
                        }
                    },
                    "required": ["table_name", "columns"]
                }
            )
        ]

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[TextContent]:
        """Execute a SQLite tool."""
        tool_methods = {
            "execute_query": sqlite_tools.execute_query,
            "execute_update": sqlite_tools.execute_update,
            "list_tables": sqlite_tools.list_tables,
            "describe_table": sqlite_tools.describe_table,
            "create_table": sqlite_tools.create_table,
        }

        if name not in tool_methods:
            return [TextContent(
                type="text",
                text=json.dumps({"error": f"Unknown tool: {name}", "success": False})
            )]

        try:
            result = tool_methods[name](**arguments)
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        except Exception as e:
            return [TextContent(
                type="text",
                text=json.dumps({"error": str(e), "success": False}, indent=2)
            )]

    return server


async def main():
    """Run the SQLite MCP server."""
    server = create_sqlite_server()
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
