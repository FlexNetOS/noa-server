"""
Example: Using MCP Client with HTTP Transport

This example demonstrates connecting to a remote MCP server
using HTTP POST requests.
"""

import asyncio
from mcp.client import (
    create_mcp_client,
    MCPClientConfig,
    MCPTransportConfig,
    MCPTransportType,
    MCPToolCall,
)


async def main():
    # Create client with HTTP transport
    config = MCPClientConfig(
        name="http-example",
        version="1.0.0",
        transport=MCPTransportConfig(
            type=MCPTransportType.HTTP,
            endpoint="http://localhost:3000/mcp",
            headers={
                "Authorization": "Bearer your-api-key-here",
                "X-Client-ID": "example-client",
            }
        ),
        timeout=30000,
        retry_attempts=3,
        retry_delay=1000,
    )

    client = create_mcp_client(config)

    try:
        print("Connecting to HTTP MCP server...")
        server_info = await client.connect()

        print(f"✓ Connected to {server_info.name} v{server_info.version}")

        # List and call tools
        tools = await client.tools.list_tools()
        tool_names = [t.name for t in tools]
        print(f"\nAvailable tools: {', '.join(tool_names)}")

        # Example: Call weather tool
        if client.tools.has_tool("get_weather"):
            print("\nGetting weather information...")

            result = await client.tools.call_tool(
                MCPToolCall(
                    name="get_weather",
                    arguments={
                        "city": "San Francisco",
                        "units": "celsius",
                    }
                )
            )

            print(f"Weather: {result}")

        # Example: Call multiple tools in parallel
        print("\nCalling multiple tools in parallel...")

        calls = [
            MCPToolCall(name="tool1", arguments={"param": "value1"}),
            MCPToolCall(name="tool2", arguments={"param": "value2"}),
            MCPToolCall(name="tool3", arguments={"param": "value3"}),
        ]

        results = await client.tools.call_tools_parallel(calls)

        for index, result in enumerate(results, 1):
            print(f"\nResult {index}: {result}")

    except Exception as e:
        print(f"Error: {e}")

    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
