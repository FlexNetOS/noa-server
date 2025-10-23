"""Standard I/O transport for MCP communication"""

import asyncio
import json
from typing import List, Optional

from .base import BaseTransport
from ..types import JSONRPCRequest


class StdioTransport(BaseTransport):
    """
    Standard I/O transport for MCP communication.
    Used for local process-based MCP servers.
    """

    def __init__(self, command: str, args: Optional[List[str]] = None, timeout: int = 30000):
        super().__init__(timeout)
        self.command = command
        self.args = args or []
        self.process: Optional[asyncio.subprocess.Process] = None
        self.buffer = ""
        self._read_task: Optional[asyncio.Task] = None

    async def connect(self) -> None:
        """Connect by spawning the process"""
        if self.connected:
            raise Exception("Already connected")

        try:
            self.process = await asyncio.create_subprocess_exec(
                self.command,
                *self.args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            # Start reading stdout
            self._read_task = asyncio.create_task(self._read_stdout())

            # Start reading stderr (for logging)
            asyncio.create_task(self._read_stderr())

            # Wait a bit for process to be ready
            await asyncio.sleep(0.1)
            self.connected = True

        except Exception as e:
            raise Exception(f"Failed to start process: {e}")

    async def disconnect(self) -> None:
        """Disconnect by terminating the process"""
        if not self.connected or not self.process:
            return

        try:
            # Cancel read task
            if self._read_task:
                self._read_task.cancel()
                try:
                    await self._read_task
                except asyncio.CancelledError:
                    pass

            # Terminate process
            self.process.terminate()

            try:
                await asyncio.wait_for(self.process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                self.process.kill()
                await self.process.wait()

            self.connected = False

        except Exception:
            pass

    async def send(self, message: JSONRPCRequest) -> None:
        """Send message to process stdin"""
        if not self.connected or not self.process or not self.process.stdin:
            raise Exception("Not connected")

        data = json.dumps(message.__dict__) + "\n"

        try:
            self.process.stdin.write(data.encode())
            await self.process.stdin.drain()
        except Exception as e:
            raise Exception(f"Failed to write to stdin: {e}")

    async def _read_stdout(self) -> None:
        """Read from process stdout"""
        if not self.process or not self.process.stdout:
            return

        try:
            while self.connected:
                data = await self.process.stdout.read(1024)
                if not data:
                    break

                self._handle_data(data.decode())
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self._handle_error(e)
        finally:
            self._handle_close()

    async def _read_stderr(self) -> None:
        """Read from process stderr (for logging)"""
        if not self.process or not self.process.stderr:
            return

        try:
            while self.connected:
                data = await self.process.stderr.read(1024)
                if not data:
                    break

                # Log stderr but don't treat as error
                print(f"MCP Server stderr: {data.decode()}", end="")
        except asyncio.CancelledError:
            pass
        except Exception:
            pass

    def _handle_data(self, data: str) -> None:
        """Handle incoming data with buffering"""
        self.buffer += data

        # Process complete JSON-RPC messages (newline-delimited)
        lines = self.buffer.split("\n")
        self.buffer = lines.pop()

        for line in lines:
            if line.strip():
                self._handle_message(line)
