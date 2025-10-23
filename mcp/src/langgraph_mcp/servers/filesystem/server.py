"""Filesystem MCP Server implementation."""

import os
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import json
from .tools import FilesystemTools


def create_filesystem_server(base_path: str | None = None) -> Server:
    """Create and configure the Filesystem MCP server.

    Args:
        base_path: Base directory for filesystem operations.
                   If None, uses FILESYSTEM_BASE_PATH env var or current directory.

    Returns:
        Configured MCP Server instance
    """
    server = Server("filesystem")

    # Get base path from env or parameter
    if base_path is None:
        base_path = os.getenv("FILESYSTEM_BASE_PATH", os.getcwd())

    fs_tools = FilesystemTools(base_path)

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        """List available filesystem tools."""
        return [
            Tool(
                name="read_file",
                description="Read the contents of a file",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Relative path to the file to read"
                        },
                        "encoding": {
                            "type": "string",
                            "description": "File encoding (default: utf-8)",
                            "default": "utf-8"
                        }
                    },
                    "required": ["path"]
                }
            ),
            Tool(
                name="write_file",
                description="Write content to a file",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Relative path to the file to write"
                        },
                        "content": {
                            "type": "string",
                            "description": "Content to write to the file"
                        },
                        "encoding": {
                            "type": "string",
                            "description": "File encoding (default: utf-8)",
                            "default": "utf-8"
                        },
                        "create_dirs": {
                            "type": "boolean",
                            "description": "Create parent directories if they don't exist",
                            "default": True
                        }
                    },
                    "required": ["path", "content"]
                }
            ),
            Tool(
                name="list_directory",
                description="List contents of a directory",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Relative path to directory (default: current)",
                            "default": "."
                        },
                        "pattern": {
                            "type": "string",
                            "description": "Optional glob pattern to filter results"
                        }
                    }
                }
            ),
            Tool(
                name="create_directory",
                description="Create a new directory",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Relative path to directory to create"
                        },
                        "parents": {
                            "type": "boolean",
                            "description": "Create parent directories if needed",
                            "default": True
                        }
                    },
                    "required": ["path"]
                }
            ),
            Tool(
                name="delete_file",
                description="Delete a file or directory",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Relative path to file/directory to delete"
                        },
                        "recursive": {
                            "type": "boolean",
                            "description": "Delete directories recursively",
                            "default": False
                        }
                    },
                    "required": ["path"]
                }
            ),
            Tool(
                name="search_files",
                description="Search for files matching a glob pattern",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "pattern": {
                            "type": "string",
                            "description": "Glob pattern (e.g., '*.py', '**/*.txt')"
                        },
                        "path": {
                            "type": "string",
                            "description": "Starting directory for search",
                            "default": "."
                        },
                        "recursive": {
                            "type": "boolean",
                            "description": "Search recursively in subdirectories",
                            "default": True
                        }
                    },
                    "required": ["pattern"]
                }
            )
        ]

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[TextContent]:
        """Execute a filesystem tool."""
        tool_methods = {
            "read_file": fs_tools.read_file,
            "write_file": fs_tools.write_file,
            "list_directory": fs_tools.list_directory,
            "create_directory": fs_tools.create_directory,
            "delete_file": fs_tools.delete_file,
            "search_files": fs_tools.search_files,
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
    """Run the Filesystem MCP server."""
    server = create_filesystem_server()
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
