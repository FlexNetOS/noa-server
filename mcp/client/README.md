# MCP Client - Python SDK

Python SDK for Model Context Protocol (MCP) - A comprehensive client library for connecting to and interacting with MCP servers.

## Features

- **Multiple Transport Protocols**: stdio, HTTP, WebSocket
- **Type-Safe**: Full type hints and dataclass support
- **Async/Await**: Built on asyncio for efficient async operations
- **Connection Management**: Auto-reconnect, retry logic, timeout handling
- **Tool Discovery & Invocation**: Easy-to-use API for MCP tools
- **Streaming Support**: Real-time bidirectional communication via WebSocket
- **Resource & Prompt Management**: Full support for MCP resources and prompts
- **Error Handling**: Comprehensive error types and handling
- **Event-Driven**: Callback-based architecture for flexibility

## Installation

```bash
pip install mcp-client
```

Or install from source:

```bash
cd /home/deflex/noa-server/mcp/client
pip install -e .
```

## Quick Start

### Stdio Transport (Local Process)

```python
import asyncio
from mcp.client import create_mcp_client, MCPClientConfig, MCPTransportConfig, MCPTransportType

async def main():
    config = MCPClientConfig(
        name="my-application",
        version="1.0.0",
        transport=MCPTransportConfig(
            type=MCPTransportType.STDIO,
            command="npx",
            args=["my-mcp-server"]
        )
    )

    client = create_mcp_client(config)

    # Connect to server
    server_info = await client.connect()
    print(f"Connected to: {server_info.name}")

    # List available tools
    tools = await client.tools.list_tools()
    print(f"Available tools: {[t.name for t in tools]}")

    # Call a tool
    from mcp.client import MCPToolCall
    result = await client.tools.call_tool(
        MCPToolCall(
            name="get_weather",
            arguments={"city": "San Francisco"}
        )
    )
    print(f"Result: {result}")

    # Disconnect
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
```

### HTTP Transport

```python
from mcp.client import create_mcp_client, MCPClientConfig, MCPTransportConfig, MCPTransportType

config = MCPClientConfig(
    name="my-application",
    version="1.0.0",
    transport=MCPTransportConfig(
        type=MCPTransportType.HTTP,
        endpoint="http://localhost:3000/mcp",
        headers={"Authorization": "Bearer your-token-here"}
    ),
    timeout=30000
)

client = create_mcp_client(config)
await client.connect()
```

### WebSocket Transport

```python
from mcp.client import create_mcp_client, MCPClientConfig, MCPTransportConfig, MCPTransportType

config = MCPClientConfig(
    name="my-application",
    version="1.0.0",
    transport=MCPTransportConfig(
        type=MCPTransportType.WEBSOCKET,
        endpoint="ws://localhost:3000/mcp",
        headers={"Authorization": "Bearer your-token-here"}
    )
)

client = create_mcp_client(config)

# Listen for notifications
def on_notification(notification):
    print(f"Received notification: {notification}")

client.on("notification", on_notification)

await client.connect()
```

## Working with Tools

### List Tools

```python
tools = await client.tools.list_tools()

for tool in tools:
    print(f"{tool.name}: {tool.description}")
    print(f"Schema: {tool.input_schema}")
```

### Call a Tool

```python
from mcp.client import MCPToolCall, MCPToolUtils

result = await client.tools.call_tool(
    MCPToolCall(
        name="calculate",
        arguments={
            "operation": "add",
            "numbers": [10, 20, 30]
        }
    )
)

# Extract text content
texts = MCPToolUtils.extract_text_content(result)
print("\n".join(texts))
```

### Call Multiple Tools

```python
from mcp.client import MCPToolCall

# Sequential execution (stops on error)
results = await client.tools.call_tools_sequence([
    MCPToolCall(name="tool1", arguments={"param": "value1"}),
    MCPToolCall(name="tool2", arguments={"param": "value2"}),
    MCPToolCall(name="tool3", arguments={"param": "value3"})
])

# Parallel execution
results = await client.tools.call_tools_parallel([
    MCPToolCall(name="tool1", arguments={"param": "value1"}),
    MCPToolCall(name="tool2", arguments={"param": "value2"}),
    MCPToolCall(name="tool3", arguments={"param": "value3"})
])
```

## Working with Resources

```python
# List available resources
resources = await client.list_resources()

# Read a resource
contents = await client.read_resource("file:///path/to/file.txt")

for content in contents:
    if isinstance(content, dict) and content.get("type") == "text":
        print(content["text"])
```

## Working with Prompts

```python
# List available prompts
prompts = await client.list_prompts()

# Get a prompt
prompt = await client.get_prompt(
    "code_review",
    {"language": "python", "file": "app.py"}
)

print(f"Prompt: {prompt.description}")
for msg in prompt.messages:
    print(f"{msg.role}: {msg.content}")
```

## Event Handling

```python
from mcp.client import ConnectionState

# Connection state changes
def on_state_change(state: ConnectionState):
    print(f"State changed to: {state}")

client.on("state_change", on_state_change)

# Connection events
client.on("connected", lambda: print("Connected to MCP server"))
client.on("disconnected", lambda: print("Disconnected from MCP server"))

# Error handling
def on_error(error):
    print(f"MCP Error: {error}")

client.on("error", on_error)

# Server notifications
def on_notification(notification):
    print(f"Notification: {notification.method}")

client.on("notification", on_notification)

# Dynamic tool/resource changes
async def on_tools_changed():
    print("Tools list changed, refreshing...")
    await client.tools.refresh()

client.on("tools_changed", on_tools_changed)
client.on("resources_changed", lambda: print("Resources list changed"))
client.on("prompts_changed", lambda: print("Prompts list changed"))
```

## Error Handling

```python
from mcp.client import (
    MCPError,
    MCPConnectionError,
    MCPTimeoutError,
    MCPToolError
)

try:
    await client.connect()
except MCPConnectionError as e:
    print(f"Connection failed: {e}")
except MCPTimeoutError as e:
    print(f"Connection timeout: {e}")
except MCPError as e:
    print(f"MCP Error: {e.code} - {e}")

try:
    result = await client.tools.call_tool(
        MCPToolCall(name="unknown_tool", arguments={})
    )
except MCPToolError as e:
    print(f"Tool error: {e}")
```

## Advanced Usage

### Custom Transport Implementation

```python
from mcp.client.transports.base import BaseTransport
from mcp.client.types import JSONRPCRequest

class CustomTransport(BaseTransport):
    async def connect(self):
        # Your custom connection logic
        pass

    async def disconnect(self):
        # Your custom disconnection logic
        pass

    async def send(self, message: JSONRPCRequest):
        # Your custom send logic
        pass
```

### Reconnection Strategy

```python
async def on_disconnected():
    print("Connection lost, attempting to reconnect...")

    try:
        await client.reconnect()
        print("Reconnected successfully")
    except Exception as e:
        print(f"Reconnection failed: {e}")

client.on("disconnected", on_disconnected)
```

### Tool Result Processing

```python
from mcp.client import MCPToolCall, MCPToolUtils

result = await client.tools.call_tool(
    MCPToolCall(
        name="analyze_image",
        arguments={"url": "https://example.com/image.jpg"}
    )
)

# Extract different content types
texts = MCPToolUtils.extract_text_content(result)
images = MCPToolUtils.extract_image_content(result)
resources = MCPToolUtils.extract_resource_content(result)

# Format as string
formatted = MCPToolUtils.format_result(result)
print(formatted)

# Check for errors
if MCPToolUtils.has_error(result):
    print("Tool execution failed")
```

## Testing

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run tests with coverage
pytest --cov=mcp.client --cov-report=html

# Type checking
mypy mcp/client

# Linting
pylint mcp/client
```

## API Reference

### MCPClient

Main client class for MCP communication.

#### Methods

- `connect() -> MCPServerInfo` - Connect to MCP server
- `disconnect() -> None` - Disconnect from server
- `reconnect() -> MCPServerInfo` - Reconnect to server
- `is_connected() -> bool` - Check connection status
- `get_state() -> ConnectionState` - Get current connection state
- `get_server_info() -> Optional[MCPServerInfo]` - Get server information
- `list_resources() -> List[MCPResource]` - List available resources
- `read_resource(uri: str) -> List[MCPContent]` - Read a resource
- `list_prompts() -> List[MCPPrompt]` - List available prompts
- `get_prompt(name: str, args: Optional[Dict[str, str]]) -> GetPromptResponse` - Get a prompt
- `on(event: str, handler: Callable) -> None` - Register event handler
- `off(event: str, handler: Callable) -> None` - Unregister event handler

#### Properties

- `tools: MCPToolManager` - Tool management interface

### MCPToolManager

Tool discovery and invocation manager.

#### Methods

- `list_tools() -> List[MCPTool]` - List all available tools
- `get_tool(name: str) -> Optional[MCPTool]` - Get specific tool
- `get_all_tools() -> List[MCPTool]` - Get all cached tools
- `has_tool(name: str) -> bool` - Check if tool exists
- `call_tool(call: MCPToolCall) -> MCPToolResult` - Call a tool
- `call_tools_sequence(calls: List[MCPToolCall]) -> List[MCPToolResult]` - Call tools sequentially
- `call_tools_parallel(calls: List[MCPToolCall]) -> List[MCPToolResult]` - Call tools in parallel
- `refresh() -> List[MCPTool]` - Refresh tool list from server

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

For issues and questions:
- GitHub Issues: https://github.com/noa-server/noa-server/issues
- Documentation: https://docs.noa-server.io/mcp-client
