"""SQLite MCP Server

Provides secure SQLite database operations through the Model Context Protocol.
"""

from .server import create_sqlite_server

__all__ = ["create_sqlite_server"]
