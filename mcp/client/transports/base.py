"""Base transport interface for MCP communication"""

import asyncio
import json
from abc import ABC, abstractmethod
from typing import Callable, Dict, Optional, Union

from ..types import JSONRPCRequest, JSONRPCResponse, JSONRPCNotification


class MCPTransport(ABC):
    """Base transport interface for MCP communication"""

    @abstractmethod
    async def connect(self) -> None:
        """Connect to the MCP server"""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Disconnect from the MCP server"""
        pass

    @abstractmethod
    async def send(self, message: JSONRPCRequest) -> None:
        """Send a JSON-RPC request"""
        pass

    @abstractmethod
    def is_connected(self) -> bool:
        """Check if connected"""
        pass

    @abstractmethod
    def on_message(self, handler: Callable[[Union[JSONRPCResponse, JSONRPCNotification]], None]) -> None:
        """Register message handler"""
        pass

    @abstractmethod
    def on_error(self, handler: Callable[[Exception], None]) -> None:
        """Register error handler"""
        pass

    @abstractmethod
    def on_close(self, handler: Callable[[], None]) -> None:
        """Register close handler"""
        pass


class BaseTransport(MCPTransport):
    """Base transport implementation with common functionality"""

    def __init__(self, timeout: int = 30000):
        self.connected = False
        self.timeout = timeout / 1000.0  # Convert to seconds
        self._message_handlers: list = []
        self._error_handlers: list = []
        self._close_handlers: list = []

    def is_connected(self) -> bool:
        return self.connected

    def on_message(self, handler: Callable[[Union[JSONRPCResponse, JSONRPCNotification]], None]) -> None:
        self._message_handlers.append(handler)

    def on_error(self, handler: Callable[[Exception], None]) -> None:
        self._error_handlers.append(handler)

    def on_close(self, handler: Callable[[], None]) -> None:
        self._close_handlers.append(handler)

    def _handle_message(self, data: str) -> None:
        """Handle incoming message"""
        try:
            message_dict = json.loads(data)

            # Determine if it's a response or notification
            if "result" in message_dict or "error" in message_dict:
                message = JSONRPCResponse(**message_dict)
            else:
                message = JSONRPCNotification(**message_dict)

            for handler in self._message_handlers:
                try:
                    handler(message)
                except Exception as e:
                    self._handle_error(Exception(f"Message handler error: {e}"))
        except json.JSONDecodeError as e:
            self._handle_error(Exception(f"Failed to parse message: {e}"))

    def _handle_error(self, error: Exception) -> None:
        """Handle error"""
        for handler in self._error_handlers:
            try:
                handler(error)
            except Exception:
                pass  # Avoid infinite error loops

    def _handle_close(self) -> None:
        """Handle connection close"""
        self.connected = False
        for handler in self._close_handlers:
            try:
                handler()
            except Exception:
                pass

    async def _create_timeout_promise(self, coro, operation: str):
        """Create a coroutine with timeout"""
        try:
            return await asyncio.wait_for(coro, timeout=self.timeout)
        except asyncio.TimeoutError:
            raise TimeoutError(f"{operation} timeout after {self.timeout}s")
