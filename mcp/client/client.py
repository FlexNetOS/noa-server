"""MCP Client - Main entry point for MCP protocol communication"""

import asyncio
from typing import Any, Callable, Dict, List, Optional, Union

from .types import (
    MCPClientConfig,
    MCPClientInfo,
    MCPServerInfo,
    ConnectionState,
    JSONRPCRequest,
    JSONRPCResponse,
    JSONRPCNotification,
    JSONRPCError,
    MCPConnectionError,
    MCPTimeoutError,
    MCPError,
    MCPResource,
    MCPPrompt,
    MCPContent,
    MCPCapabilities,
    ListResourcesResponse,
    ListPromptsResponse,
    ReadResourceRequest,
    ReadResourceResponse,
    GetPromptRequest,
    GetPromptResponse,
)
from .transports import StdioTransport, HTTPTransport, WebSocketTransport
from .transports.base import MCPTransport
from .tools import MCPToolManager


class MCPClient:
    """MCP Client - Main entry point for MCP protocol communication"""

    def __init__(self, config: MCPClientConfig):
        self.config = config
        self.transport: Optional[MCPTransport] = None
        self.state = ConnectionState.DISCONNECTED
        self.server_info: Optional[MCPServerInfo] = None
        self.request_id = 0
        self.pending_requests: Dict[Union[str, int], Dict[str, Any]] = {}

        # Event handlers
        self._event_handlers: Dict[str, List[Callable]] = {
            "connected": [],
            "disconnected": [],
            "error": [],
            "state_change": [],
            "notification": [],
            "tools_changed": [],
            "resources_changed": [],
            "prompts_changed": [],
        }

        # Tool manager
        self.tools = MCPToolManager(self._send_request)

    async def connect(self) -> MCPServerInfo:
        """Connect to the MCP server"""
        if self.state != ConnectionState.DISCONNECTED:
            raise MCPConnectionError("Already connected or connecting")

        self._set_state(ConnectionState.CONNECTING)

        try:
            # Create transport
            self.transport = self._create_transport()

            # Set up transport event handlers
            self.transport.on_message(self._handle_message)
            self.transport.on_error(self._handle_transport_error)
            self.transport.on_close(self._handle_transport_close)

            # Connect transport
            await self._retry_operation(
                self.transport.connect(),
                "connect"
            )

            # Perform MCP handshake
            self.server_info = await self._initialize()

            self._set_state(ConnectionState.CONNECTED)
            self._emit("connected")

            # Load initial tools
            await self.tools.list_tools()

            return self.server_info

        except Exception as e:
            self._set_state(ConnectionState.ERROR)
            await self._cleanup()
            raise MCPConnectionError(f"Connection failed: {e}")

    async def disconnect(self) -> None:
        """Disconnect from the MCP server"""
        if self.state == ConnectionState.DISCONNECTED:
            return

        self._set_state(ConnectionState.DISCONNECTING)

        try:
            # Reject all pending requests
            for request_id, pending in list(self.pending_requests.items()):
                if "timeout_handle" in pending:
                    pending["timeout_handle"].cancel()
                if "reject" in pending:
                    pending["reject"](Exception("Disconnecting"))
                del self.pending_requests[request_id]

            # Disconnect transport
            if self.transport:
                await self.transport.disconnect()

            await self._cleanup()
            self._set_state(ConnectionState.DISCONNECTED)
            self._emit("disconnected")

        except Exception as e:
            self._set_state(ConnectionState.ERROR)
            raise MCPConnectionError(f"Disconnect failed: {e}")

    async def reconnect(self) -> MCPServerInfo:
        """Reconnect to the MCP server"""
        await self.disconnect()
        return await self.connect()

    def get_state(self) -> ConnectionState:
        """Get current connection state"""
        return self.state

    def is_connected(self) -> bool:
        """Check if connected"""
        return self.state == ConnectionState.CONNECTED

    def get_server_info(self) -> Optional[MCPServerInfo]:
        """Get server information"""
        return self.server_info

    async def list_resources(self) -> List[MCPResource]:
        """List available resources"""
        response = await self._send_request("resources/list")
        if isinstance(response, dict) and "resources" in response:
            return [MCPResource(**r) for r in response["resources"]]
        return []

    async def read_resource(self, uri: str) -> List[MCPContent]:
        """Read a resource"""
        request = ReadResourceRequest(uri=uri)
        response = await self._send_request("resources/read", request.__dict__)
        if isinstance(response, dict) and "contents" in response:
            return response["contents"]
        return []

    async def list_prompts(self) -> List[MCPPrompt]:
        """List available prompts"""
        response = await self._send_request("prompts/list")
        if isinstance(response, dict) and "prompts" in response:
            return [MCPPrompt(**p) for p in response["prompts"]]
        return []

    async def get_prompt(self, name: str, args: Optional[Dict[str, str]] = None) -> GetPromptResponse:
        """Get a prompt"""
        request = GetPromptRequest(name=name, arguments=args)
        response = await self._send_request("prompts/get", request.__dict__)
        if isinstance(response, dict):
            return GetPromptResponse(**response)
        raise MCPError("Invalid response format", -32000)

    def on(self, event: str, handler: Callable) -> None:
        """Register event handler"""
        if event in self._event_handlers:
            self._event_handlers[event].append(handler)

    def off(self, event: str, handler: Callable) -> None:
        """Unregister event handler"""
        if event in self._event_handlers and handler in self._event_handlers[event]:
            self._event_handlers[event].remove(handler)

    def _emit(self, event: str, *args) -> None:
        """Emit an event"""
        if event in self._event_handlers:
            for handler in self._event_handlers[event]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        asyncio.create_task(handler(*args))
                    else:
                        handler(*args)
                except Exception as e:
                    print(f"Error in event handler: {e}")

    async def _send_request(self, method: str, params: Optional[Any] = None) -> Any:
        """Send a custom JSON-RPC request"""
        if not self.is_connected() or not self.transport:
            raise MCPConnectionError("Not connected")

        self.request_id += 1
        request_id = self.request_id

        request = JSONRPCRequest(
            jsonrpc="2.0",
            id=request_id,
            method=method,
            params=params
        )

        # Create promise for response
        future = asyncio.Future()

        def timeout_handler():
            if request_id in self.pending_requests:
                del self.pending_requests[request_id]
                if not future.done():
                    future.set_exception(MCPTimeoutError(f"Request timeout: {method}"))

        timeout_handle = asyncio.get_event_loop().call_later(
            self.config.timeout / 1000.0,
            timeout_handler
        )

        self.pending_requests[request_id] = {
            "future": future,
            "timeout_handle": timeout_handle,
        }

        try:
            await self.transport.send(request)
            return await future
        except Exception as e:
            if request_id in self.pending_requests:
                timeout_handle.cancel()
                del self.pending_requests[request_id]
            raise

    def _create_transport(self) -> MCPTransport:
        """Create transport based on configuration"""
        transport_config = self.config.transport

        if transport_config.type.value == "stdio":
            if not transport_config.command:
                raise Exception("stdio transport requires command")
            return StdioTransport(
                transport_config.command,
                transport_config.args,
                transport_config.timeout or self.config.timeout
            )

        elif transport_config.type.value == "http":
            if not transport_config.endpoint:
                raise Exception("http transport requires endpoint")
            return HTTPTransport(
                transport_config.endpoint,
                transport_config.headers,
                transport_config.timeout or self.config.timeout
            )

        elif transport_config.type.value == "websocket":
            if not transport_config.endpoint:
                raise Exception("websocket transport requires endpoint")
            return WebSocketTransport(
                transport_config.endpoint,
                transport_config.headers,
                transport_config.timeout or self.config.timeout
            )

        else:
            raise Exception(f"Unsupported transport type: {transport_config.type}")

    async def _initialize(self) -> MCPServerInfo:
        """Perform MCP initialization handshake"""
        client_info = MCPClientInfo(
            name=self.config.name,
            version=self.config.version
        )

        response = await self._send_request("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": self.config.capabilities.__dict__ if self.config.capabilities else {},
            "clientInfo": client_info.__dict__,
        })

        # Send initialized notification
        await self._send_notification("notifications/initialized")

        if isinstance(response, dict):
            server_info_dict = response.get("serverInfo", {})
            return MCPServerInfo(
                name=server_info_dict.get("name", "unknown"),
                version=server_info_dict.get("version", "unknown"),
                protocol_version=response.get("protocolVersion", "unknown"),
                capabilities=MCPCapabilities(**response.get("capabilities", {}))
            )

        raise MCPError("Invalid initialization response", -32000)

    async def _send_notification(self, method: str, params: Optional[Any] = None) -> None:
        """Send a notification (no response expected)"""
        if not self.transport:
            raise MCPConnectionError("Not connected")

        notification = JSONRPCRequest(
            jsonrpc="2.0",
            id=0,  # Notifications don't have meaningful IDs
            method=method,
            params=params
        )

        await self.transport.send(notification)

    def _handle_message(self, message: Union[JSONRPCResponse, JSONRPCNotification]) -> None:
        """Handle incoming messages"""
        if self.config.debug:
            print(f"Received message: {message}")

        # Check if it's a response to a pending request
        if isinstance(message, JSONRPCResponse) and message.id in self.pending_requests:
            pending = self.pending_requests[message.id]
            pending["timeout_handle"].cancel()
            del self.pending_requests[message.id]

            future = pending["future"]
            if message.error:
                future.set_exception(
                    MCPError(message.error.message, message.error.code, message.error.data)
                )
            else:
                future.set_result(message.result)
            return

        # Handle notifications
        if isinstance(message, JSONRPCNotification):
            self._handle_notification(message)

    def _handle_notification(self, notification: JSONRPCNotification) -> None:
        """Handle incoming notifications"""
        self._emit("notification", notification)

        # Handle specific notifications
        if notification.method == "notifications/tools/list_changed":
            asyncio.create_task(self.tools.refresh())
            self._emit("tools_changed")
        elif notification.method == "notifications/resources/list_changed":
            self._emit("resources_changed")
        elif notification.method == "notifications/prompts/list_changed":
            self._emit("prompts_changed")
        elif notification.method == "notifications/message":
            if self.config.debug:
                print(f"Server log: {notification.params}")

    def _handle_transport_error(self, error: Exception) -> None:
        """Handle transport errors"""
        self._emit("error", error)

        if self.state == ConnectionState.CONNECTED:
            self._set_state(ConnectionState.ERROR)

    def _handle_transport_close(self) -> None:
        """Handle transport close"""
        if self.state == ConnectionState.CONNECTED:
            self._set_state(ConnectionState.DISCONNECTED)
            self._emit("disconnected")

    def _set_state(self, state: ConnectionState) -> None:
        """Update connection state and emit event"""
        if self.state != state:
            self.state = state
            self._emit("state_change", state)

    async def _retry_operation(self, coro, operation_name: str) -> Any:
        """Retry an operation with exponential backoff"""
        last_error = None

        for attempt in range(self.config.retry_attempts):
            try:
                return await coro
            except Exception as e:
                last_error = e

                if attempt < self.config.retry_attempts - 1:
                    delay = (self.config.retry_delay / 1000.0) * (2 ** attempt)
                    if self.config.debug:
                        print(f"{operation_name} failed, retrying in {delay}s...")
                    await asyncio.sleep(delay)

        raise MCPError(
            f"{operation_name} failed after {self.config.retry_attempts} attempts: {last_error}",
            -32000
        )

    async def _cleanup(self) -> None:
        """Cleanup resources"""
        self.transport = None
        self.tools.clear()
        self.server_info = None
