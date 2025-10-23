"""Tests for MCP client"""

import pytest
import asyncio
from mcp.client import (
    create_mcp_client,
    MCPClient,
    MCPClientConfig,
    MCPTransportConfig,
    MCPTransportType,
    ConnectionState,
)


@pytest.fixture
def client_config():
    """Create a test client configuration"""
    return MCPClientConfig(
        name="test-client",
        version="1.0.0",
        transport=MCPTransportConfig(
            type=MCPTransportType.STDIO,
            command="echo",
            args=["test"]
        ),
        timeout=5000,
        retry_attempts=1,
    )


@pytest.fixture
def client(client_config):
    """Create a test client"""
    return create_mcp_client(client_config)


class TestMCPClient:
    """Test MCP client functionality"""

    def test_client_creation(self, client_config):
        """Test client can be created"""
        client = create_mcp_client(client_config)
        assert client is not None
        assert isinstance(client, MCPClient)

    def test_initial_state(self, client):
        """Test client starts in disconnected state"""
        assert client.get_state() == ConnectionState.DISCONNECTED
        assert not client.is_connected()

    @pytest.mark.asyncio
    async def test_connection_state_changes(self, client):
        """Test connection state changes"""
        states = []

        def on_state_change(state):
            states.append(state)

        client.on("state_change", on_state_change)

        # This will fail with echo command but should change states
        try:
            await client.connect()
        except Exception:
            pass

        assert ConnectionState.CONNECTING in states

    @pytest.mark.asyncio
    async def test_double_connection_prevented(self, client):
        """Test that double connection is prevented"""
        # Start first connection
        connect_task = asyncio.create_task(client.connect())

        # Try second connection
        with pytest.raises(Exception, match="Already connected or connecting"):
            await client.connect()

        # Cancel first connection
        connect_task.cancel()
        try:
            await connect_task
        except asyncio.CancelledError:
            pass

    def test_tools_manager_exists(self, client):
        """Test that tools manager is available"""
        assert client.tools is not None

    @pytest.mark.asyncio
    async def test_tools_require_connection(self, client):
        """Test that tools require connection"""
        from mcp.client import MCPToolCall

        with pytest.raises(Exception):
            await client.tools.call_tool(
                MCPToolCall(name="test")
            )

    def test_event_handlers(self, client):
        """Test event handler registration"""
        handler_called = []

        def handler():
            handler_called.append(True)

        client.on("connected", handler)
        client._emit("connected")

        assert len(handler_called) == 1

    def test_event_handler_removal(self, client):
        """Test event handler removal"""
        handler_called = []

        def handler():
            handler_called.append(True)

        client.on("connected", handler)
        client.off("connected", handler)
        client._emit("connected")

        assert len(handler_called) == 0


class TestClientConfiguration:
    """Test client configuration"""

    def test_default_values(self):
        """Test default configuration values"""
        config = MCPClientConfig(
            name="test",
            version="1.0.0",
            transport=MCPTransportConfig(
                type=MCPTransportType.STDIO,
                command="echo"
            )
        )

        assert config.timeout == 30000
        assert config.retry_attempts == 3
        assert config.retry_delay == 1000
        assert config.debug is False

    def test_custom_values(self):
        """Test custom configuration values"""
        config = MCPClientConfig(
            name="test",
            version="1.0.0",
            transport=MCPTransportConfig(
                type=MCPTransportType.HTTP,
                endpoint="http://localhost:3000"
            ),
            timeout=10000,
            retry_attempts=5,
            debug=True
        )

        assert config.timeout == 10000
        assert config.retry_attempts == 5
        assert config.debug is True
