"""HTTP transport for MCP communication"""

import json
from typing import Dict, Optional

import aiohttp

from .base import BaseTransport
from ..types import JSONRPCRequest


class HTTPTransport(BaseTransport):
    """
    HTTP transport for MCP communication.
    Uses HTTP POST for request/response pattern.
    """

    def __init__(
        self,
        endpoint: str,
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 30000
    ):
        super().__init__(timeout)
        self.endpoint = endpoint
        self.headers = {
            "Content-Type": "application/json",
            **(headers or {})
        }
        self.session: Optional[aiohttp.ClientSession] = None

    async def connect(self) -> None:
        """Test connection with a ping"""
        if self.connected:
            raise Exception("Already connected")

        try:
            self.session = aiohttp.ClientSession()

            # Test connection with a ping
            async with self.session.post(
                self.endpoint,
                headers=self.headers,
                json={
                    "jsonrpc": "2.0",
                    "id": "ping",
                    "method": "ping"
                },
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            ) as response:
                if response.status not in (200, 404):
                    raise Exception(f"HTTP {response.status}: {response.reason}")

            self.connected = True

        except Exception as e:
            if self.session:
                await self.session.close()
                self.session = None
            raise Exception(f"Failed to connect to {self.endpoint}: {e}")

    async def disconnect(self) -> None:
        """Close HTTP session"""
        if self.session:
            await self.session.close()
            self.session = None

        self.connected = False
        self._handle_close()

    async def send(self, message: JSONRPCRequest) -> None:
        """Send HTTP POST request"""
        if not self.connected or not self.session:
            raise Exception("Not connected")

        try:
            async with self.session.post(
                self.endpoint,
                headers=self.headers,
                json=message.__dict__,
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            ) as response:
                if not response.ok:
                    raise Exception(f"HTTP {response.status}: {response.reason}")

                data = await response.text()
                if data:
                    self._handle_message(data)

        except Exception as e:
            self._handle_error(Exception(f"Request failed: {e}"))
            raise
