"""
Example: Using MCP Client with Stdio Transport

This example demonstrates connecting to a local MCP server
using the stdio transport (spawns a process).
"""

import asyncio
from mcp.client import (
    create_mcp_client,
    MCPClientConfig,
    MCPTransportConfig,
    MCPTransportType,
    MCPToolUtils,
)


async def main():
    # Create client with stdio transport
    config = MCPClientConfig(
        name="stdio-example",
        version="1.0.0",
        transport=MCPTransportConfig(
            type=MCPTransportType.STDIO,
            command="npx",
            args=["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
        ),
        timeout=30000,
        debug=True,
    )

    client = create_mcp_client(config)

    # Set up event listeners
    def on_connected():
        print("✓ Connected to MCP server")

    def on_disconnected():
        print("✓ Disconnected from MCP server")

    def on_error(error):
        print(f"✗ Error: {error}")

    def on_state_change(state):
        print(f"State changed to: {state}")

    client.on("connected", on_connected)
    client.on("disconnected", on_disconnected)
    client.on("error", on_error)
    client.on("state_change", on_state_change)

    try:
        # Connect to server
        print("Connecting to MCP server...")
        server_info = await client.connect()

        print("\nServer Information:")
        print(f"  Name: {server_info.name}")
        print(f"  Version: {server_info.version}")
        print(f"  Protocol: {server_info.protocol_version}")
        print(f"  Capabilities: {server_info.capabilities}")

        # List available tools
        print("\nListing available tools...")
        tools = await client.tools.list_tools()

        print(f"\nFound {len(tools)} tools:")
        for index, tool in enumerate(tools, 1):
            print(f"\n{index}. {tool.name}")
            if tool.description:
                print(f"   Description: {tool.description}")
            print(f"   Input Schema: {tool.input_schema}")

        # Example: Call a tool if available
        if tools:
            first_tool = tools[0]
            print(f"\nCalling tool: {first_tool.name}")

            try:
                from mcp.client import MCPToolCall

                result = await client.tools.call_tool(
                    MCPToolCall(
                        name=first_tool.name,
                        arguments={}  # Adjust based on actual tool requirements
                    )
                )

                print("\nTool Result:")
                formatted = MCPToolUtils.format_result(result)
                print(formatted)

                if MCPToolUtils.has_error(result):
                    print("⚠️  Tool execution returned an error")

            except Exception as e:
                print(f"✗ Failed to call tool: {e}")

        # List resources
        print("\nListing available resources...")
        resources = await client.list_resources()

        print(f"\nFound {len(resources)} resources:")
        for index, resource in enumerate(resources, 1):
            print(f"\n{index}. {resource.name}")
            print(f"   URI: {resource.uri}")
            if resource.description:
                print(f"   Description: {resource.description}")
            if resource.mime_type:
                print(f"   MIME Type: {resource.mime_type}")

    except Exception as e:
        print(f"✗ Error: {e}")

    finally:
        # Disconnect
        print("\nDisconnecting...")
        await client.disconnect()
        print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
