"""
MCP Client - Python SDK for Model Context Protocol

A comprehensive Python client library for connecting to and interacting
with MCP servers using multiple transport protocols.
"""

from .client import MCPClient
from .types import (
    # Client configuration
    MCPClientConfig,
    MCPClientInfo,
    MCPServerInfo,
    MCPCapabilities,

    # Transport
    MCPTransportType,
    MCPTransportConfig,

    # Connection
    ConnectionState,

    # Tools
    MCPTool,
    MCPToolCall,
    MCPToolResult,

    # Content
    MCPContent,
    MCPTextContent,
    MCPImageContent,
    MCPResourceContent,

    # Resources
    MCPResource,
    MCPPrompt,

    # Errors
    MCPError,
    MCPConnectionError,
    MCPTimeoutError,
    MCPToolError,
)

from .tools import MCPToolManager, MCPToolUtils

__version__ = "1.0.0"
__all__ = [
    "MCPClient",
    "MCPClientConfig",
    "MCPClientInfo",
    "MCPServerInfo",
    "MCPCapabilities",
    "MCPTransportType",
    "MCPTransportConfig",
    "ConnectionState",
    "MCPTool",
    "MCPToolCall",
    "MCPToolResult",
    "MCPContent",
    "MCPTextContent",
    "MCPImageContent",
    "MCPResourceContent",
    "MCPResource",
    "MCPPrompt",
    "MCPError",
    "MCPConnectionError",
    "MCPTimeoutError",
    "MCPToolError",
    "MCPToolManager",
    "MCPToolUtils",
]


def create_mcp_client(config: MCPClientConfig) -> MCPClient:
    """
    Create a new MCP client instance.

    Args:
        config: Client configuration

    Returns:
        MCPClient instance

    Example:
        >>> from mcp.client import create_mcp_client, MCPClientConfig, MCPTransportConfig
        >>> config = MCPClientConfig(
        ...     name="my-app",
        ...     version="1.0.0",
        ...     transport=MCPTransportConfig(
        ...         type="stdio",
        ...         command="npx",
        ...         args=["my-mcp-server"]
        ...     )
        ... )
        >>> client = create_mcp_client(config)
        >>> await client.connect()
    """
    return MCPClient(config)
