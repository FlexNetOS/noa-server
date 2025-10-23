"""WebSocket transport for MCP communication"""

import asyncio
import json
from typing import Dict, Optional

import aiohttp

from .base import BaseTransport
from ..types import JSONRPCRequest


class WebSocketTransport(BaseTransport):
    """
    WebSocket transport for MCP communication.
    Supports bidirectional streaming and notifications.
    """

    def __init__(
        self,
        endpoint: str,
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 30000
    ):
        super().__init__(timeout)
        self.endpoint = endpoint
        self.headers = headers or {}
        self.session: Optional[aiohttp.ClientSession] = None
        self.ws: Optional[aiohttp.ClientWebSocketResponse] = None
        self._read_task: Optional[asyncio.Task] = None
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.reconnect_delay = 1.0
        self.should_reconnect = True

    async def connect(self) -> None:
        """Connect WebSocket"""
        if self.connected:
            raise Exception("Already connected")

        await self._create_timeout_promise(
            self._connect_websocket(),
            "WebSocket connection"
        )

    async def _connect_websocket(self) -> None:
        """Internal WebSocket connection logic"""
        try:
            self.session = aiohttp.ClientSession()
            self.ws = await self.session.ws_connect(
                self.endpoint,
                headers=self.headers,
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )

            self.connected = True
            self.reconnect_attempts = 0

            # Start reading messages
            self._read_task = asyncio.create_task(self._read_messages())

        except Exception as e:
            if self.session:
                await self.session.close()
                self.session = None
            raise e

    async def disconnect(self) -> None:
        """Disconnect WebSocket"""
        if not self.connected:
            return

        self.should_reconnect = False

        try:
            # Cancel read task
            if self._read_task:
                self._read_task.cancel()
                try:
                    await self._read_task
                except asyncio.CancelledError:
                    pass

            # Close WebSocket
            if self.ws and not self.ws.closed:
                await self.ws.close()

            # Close session
            if self.session:
                await self.session.close()

            self.connected = False

        except Exception:
            pass

    async def send(self, message: JSONRPCRequest) -> None:
        """Send message via WebSocket"""
        if not self.connected or not self.ws:
            raise Exception("Not connected")

        try:
            await self.ws.send_json(message.__dict__)
        except Exception as e:
            raise Exception(f"Failed to send message: {e}")

    async def _read_messages(self) -> None:
        """Read messages from WebSocket"""
        try:
            if not self.ws:
                return

            async for msg in self.ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    self._handle_message(msg.data)
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    self._handle_error(Exception(f"WebSocket error: {self.ws.exception()}"))
                    break
                elif msg.type == aiohttp.WSMsgType.CLOSED:
                    break

        except asyncio.CancelledError:
            pass
        except Exception as e:
            self._handle_error(e)
        finally:
            self.connected = False
            self._handle_close()

            if self.should_reconnect and self.reconnect_attempts < self.max_reconnect_attempts:
                await self._reconnect()

    async def _reconnect(self) -> None:
        """Attempt to reconnect"""
        self.reconnect_attempts += 1
        delay = self.reconnect_delay * (2 ** (self.reconnect_attempts - 1))

        print(f"Reconnecting to WebSocket (attempt {self.reconnect_attempts}/{self.max_reconnect_attempts}) in {delay}s...")

        await asyncio.sleep(delay)

        try:
            await self._connect_websocket()
        except Exception as e:
            if self.reconnect_attempts >= self.max_reconnect_attempts:
                self._handle_error(Exception(f"Failed to reconnect after {self.max_reconnect_attempts} attempts"))

    def set_reconnect_options(self, max_attempts: int, delay: float) -> None:
        """Configure reconnection behavior"""
        self.max_reconnect_attempts = max_attempts
        self.reconnect_delay = delay
