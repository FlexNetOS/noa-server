"""
MCP Protocol Type Definitions for Python
Based on Model Context Protocol Specification
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union


# JSON-RPC Types
@dataclass
class JSONRPCRequest:
    """JSON-RPC 2.0 request"""
    jsonrpc: str = "2.0"
    id: Union[str, int] = ""
    method: str = ""
    params: Optional[Dict[str, Any]] = None


@dataclass
class JSONRPCError:
    """JSON-RPC error object"""
    code: int
    message: str
    data: Optional[Any] = None


@dataclass
class JSONRPCResponse:
    """JSON-RPC 2.0 response"""
    jsonrpc: str = "2.0"
    id: Union[str, int] = ""
    result: Optional[Any] = None
    error: Optional[JSONRPCError] = None


@dataclass
class JSONRPCNotification:
    """JSON-RPC 2.0 notification"""
    jsonrpc: str = "2.0"
    method: str = ""
    params: Optional[Dict[str, Any]] = None


# MCP Protocol Types
@dataclass
class MCPCapabilities:
    """MCP server/client capabilities"""
    tools: Optional[Dict[str, Any]] = None
    resources: Optional[Dict[str, Any]] = None
    prompts: Optional[Dict[str, Any]] = None
    logging: Optional[Dict[str, Any]] = None
    experimental: Optional[Dict[str, Any]] = None


@dataclass
class MCPClientInfo:
    """MCP client information"""
    name: str
    version: str


@dataclass
class MCPServerInfo:
    """MCP server information"""
    name: str
    version: str
    protocol_version: str
    capabilities: MCPCapabilities


# Tool Types
@dataclass
class MCPToolInputSchema:
    """JSON Schema for tool input"""
    type: str = "object"
    properties: Optional[Dict[str, Any]] = None
    required: Optional[List[str]] = None
    additional_properties: Optional[bool] = None


@dataclass
class MCPTool:
    """MCP tool definition"""
    name: str
    input_schema: MCPToolInputSchema
    description: Optional[str] = None


@dataclass
class MCPToolCall:
    """Tool invocation request"""
    name: str
    arguments: Optional[Dict[str, Any]] = None


# Content Types
@dataclass
class MCPTextContent:
    """Text content"""
    type: Literal["text"] = "text"
    text: str = ""


@dataclass
class MCPImageContent:
    """Image content"""
    type: Literal["image"] = "image"
    data: str = ""
    mime_type: str = ""


@dataclass
class MCPResourceReference:
    """Resource reference"""
    uri: str
    mime_type: Optional[str] = None
    text: Optional[str] = None
    blob: Optional[str] = None


@dataclass
class MCPResourceContent:
    """Resource content"""
    type: Literal["resource"] = "resource"
    resource: MCPResourceReference = field(default_factory=lambda: MCPResourceReference(uri=""))


MCPContent = Union[MCPTextContent, MCPImageContent, MCPResourceContent]


@dataclass
class MCPToolResult:
    """Tool execution result"""
    content: List[MCPContent] = field(default_factory=list)
    is_error: bool = False


# Resource Types
@dataclass
class MCPResource:
    """MCP resource definition"""
    uri: str
    name: str
    description: Optional[str] = None
    mime_type: Optional[str] = None


# Prompt Types
@dataclass
class MCPPromptArgument:
    """Prompt argument definition"""
    name: str
    description: Optional[str] = None
    required: Optional[bool] = None


@dataclass
class MCPPrompt:
    """MCP prompt definition"""
    name: str
    description: Optional[str] = None
    arguments: Optional[List[MCPPromptArgument]] = None


@dataclass
class MCPPromptMessage:
    """Prompt message"""
    role: Literal["user", "assistant"]
    content: MCPContent


# Transport Types
class MCPTransportType(str, Enum):
    """Transport protocol type"""
    STDIO = "stdio"
    HTTP = "http"
    WEBSOCKET = "websocket"


@dataclass
class MCPTransportConfig:
    """Transport configuration"""
    type: MCPTransportType
    endpoint: Optional[str] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None
    headers: Optional[Dict[str, str]] = None
    timeout: Optional[int] = None


# Client Configuration
@dataclass
class MCPClientConfig:
    """MCP client configuration"""
    name: str
    version: str
    transport: MCPTransportConfig
    capabilities: Optional[MCPCapabilities] = None
    timeout: int = 30000
    retry_attempts: int = 3
    retry_delay: int = 1000
    debug: bool = False


# Connection States
class ConnectionState(str, Enum):
    """Connection state enum"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTING = "disconnecting"
    ERROR = "error"


# Error Types
class MCPError(Exception):
    """Base MCP error"""

    def __init__(self, message: str, code: int = -32000, data: Any = None):
        super().__init__(message)
        self.code = code
        self.data = data


class MCPConnectionError(MCPError):
    """MCP connection error"""

    def __init__(self, message: str, data: Any = None):
        super().__init__(message, -32000, data)


class MCPTimeoutError(MCPError):
    """MCP timeout error"""

    def __init__(self, message: str, data: Any = None):
        super().__init__(message, -32001, data)


class MCPToolError(MCPError):
    """MCP tool error"""

    def __init__(self, message: str, data: Any = None):
        super().__init__(message, -32002, data)


# Request/Response Types
@dataclass
class ListToolsResponse:
    """List tools response"""
    tools: List[MCPTool] = field(default_factory=list)


@dataclass
class ListResourcesResponse:
    """List resources response"""
    resources: List[MCPResource] = field(default_factory=list)


@dataclass
class ListPromptsResponse:
    """List prompts response"""
    prompts: List[MCPPrompt] = field(default_factory=list)


@dataclass
class ReadResourceRequest:
    """Read resource request"""
    uri: str


@dataclass
class ReadResourceResponse:
    """Read resource response"""
    contents: List[MCPContent] = field(default_factory=list)


@dataclass
class GetPromptRequest:
    """Get prompt request"""
    name: str
    arguments: Optional[Dict[str, str]] = None


@dataclass
class GetPromptResponse:
    """Get prompt response"""
    messages: List[MCPPromptMessage] = field(default_factory=list)
    description: Optional[str] = None


@dataclass
class CallToolRequest:
    """Call tool request"""
    name: str
    arguments: Optional[Dict[str, Any]] = None


@dataclass
class CallToolResponse:
    """Call tool response"""
    content: List[MCPContent] = field(default_factory=list)
    is_error: bool = False
