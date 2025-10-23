"""
Example: Using MCP Client with WebSocket Transport

This example demonstrates real-time bidirectional communication
with an MCP server using WebSocket.
"""

import asyncio
import signal
from mcp.client import (
    create_mcp_client,
    MCPClientConfig,
    MCPTransportConfig,
    MCPTransportType,
    ConnectionState,
)


async def main():
    # Create client with WebSocket transport
    config = MCPClientConfig(
        name="websocket-example",
        version="1.0.0",
        transport=MCPTransportConfig(
            type=MCPTransportType.WEBSOCKET,
            endpoint="ws://localhost:3000/mcp",
            headers={
                "Authorization": "Bearer your-api-key-here",
            }
        ),
        timeout=30000,
    )

    client = create_mcp_client(config)

    # Set up comprehensive event handling
    def on_connected():
        print("✓ WebSocket connected")

    def on_disconnected():
        print("✓ WebSocket disconnected")

    def on_error(error):
        print(f"✗ WebSocket error: {error}")

    def on_state_change(state: ConnectionState):
        print(f"State: {state}")

    # Handle server notifications
    def on_notification(notification):
        print("\n📬 Server notification:")
        print(f"  Method: {notification.method}")
        print(f"  Params: {notification.params}")

    # Handle dynamic tool changes
    async def on_tools_changed():
        print("\n🔄 Tools list changed, refreshing...")
        tools = await client.tools.list_tools()
        tool_names = [t.name for t in tools]
        print(f"  Updated tools: {', '.join(tool_names)}")

    def on_resources_changed():
        print("\n🔄 Resources list changed")

    def on_prompts_changed():
        print("\n🔄 Prompts list changed")

    client.on("connected", on_connected)
    client.on("disconnected", on_disconnected)
    client.on("error", on_error)
    client.on("state_change", on_state_change)
    client.on("notification", on_notification)
    client.on("tools_changed", on_tools_changed)
    client.on("resources_changed", on_resources_changed)
    client.on("prompts_changed", on_prompts_changed)

    # Set up graceful shutdown
    shutdown_event = asyncio.Event()

    def signal_handler(sig, frame):
        print("\n\n🛑 Shutting down...")
        shutdown_event.set()

    signal.signal(signal.SIGINT, signal_handler)

    try:
        print("Connecting to WebSocket MCP server...")
        await client.connect()

        # Keep connection open and listen for events
        print("\n⏳ Listening for events (press Ctrl+C to exit)...\n")

        # Example: Send periodic requests
        async def heartbeat():
            while not shutdown_event.is_set():
                try:
                    await asyncio.sleep(10)  # Every 10 seconds

                    if client.is_connected():
                        tools = await client.tools.list_tools()
                        print(f"\n📊 Heartbeat: {len(tools)} tools available")
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    print(f"Heartbeat error: {e}")

        # Start heartbeat task
        heartbeat_task = asyncio.create_task(heartbeat())

        # Wait for shutdown signal
        await shutdown_event.wait()

        # Cancel heartbeat
        heartbeat_task.cancel()
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass

    except Exception as e:
        print(f"Error: {e}")

    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
