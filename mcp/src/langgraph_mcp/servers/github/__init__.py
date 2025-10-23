"""GitHub MCP Server

Provides GitHub API operations through the Model Context Protocol.
"""

from .server import create_github_server

__all__ = ["create_github_server"]
