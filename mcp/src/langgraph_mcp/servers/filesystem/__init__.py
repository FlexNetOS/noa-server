"""Filesystem MCP Server

Provides secure filesystem operations through the Model Context Protocol.
"""

from .server import create_filesystem_server

__all__ = ["create_filesystem_server"]
