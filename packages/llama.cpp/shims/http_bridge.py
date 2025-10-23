#!/usr/bin/env python3
"""
HTTP Bridge API for llama.cpp Neural Processing Layer
Provides REST API endpoints for chat, streaming, and model management
Also supports MCP (Model Context Protocol) server mode for Claude Code integration
"""

import os
import sys
import json
import time
import subprocess
import threading
import queue
from typing import Dict, Any, Optional, List
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MCP Server imports (optional)
try:
    import asyncio
    from mcp import Tool
    from mcp.server import Server
    from mcp.types import TextContent, PromptMessage, Resource, ResourceTemplate
    import mcp.server.stdio
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False
    logger.warning("MCP server libraries not available. Install with: pip install mcp")

class LlamaBridge:
    """HTTP Bridge for llama.cpp neural processing"""

    def __init__(self, llama_cpp_dir: str = None):
        self.llama_cpp_dir = Path(llama_cpp_dir or os.path.dirname(os.path.dirname(__file__)))
        self.build_dir = self.llama_cpp_dir / "build"
        self.bin_dir = self.build_dir / "bin"
        self.llama_cli = self.bin_dir / "llama-cli"
        self.shims_dir = self.llama_cpp_dir / "shims"
        self.gguf_loader = self.shims_dir / "gguf_loader.sh"

        # Environment configuration
        self.model_path = os.getenv("LLM_MODEL_PATH", "")
        self.cuda_enabled = os.getenv("LLAMA_CUDA", "false").lower() == "true"

        # Validate setup
        self._validate_setup()

    def _validate_setup(self):
        """Validate that llama.cpp is properly built and configured"""
        if not self.llama_cli.exists():
            raise FileNotFoundError(f"llama-cli not found at {self.llama_cli}")

        if not self.gguf_loader.exists():
            raise FileNotFoundError(f"GGUF loader not found at {self.gguf_loader}")

        if not os.access(self.llama_cli, os.X_OK):
            raise PermissionError(f"llama-cli is not executable: {self.llama_cli}")

        if not os.access(self.gguf_loader, os.X_OK):
            raise PermissionError(f"GGUF loader is not executable: {self.gguf_loader}")

        logger.info(f"LlamaBridge initialized with CUDA={'enabled' if self.cuda_enabled else 'disabled'}")

    def _run_llama_command(self, command: str, *args, **kwargs) -> subprocess.Popen:
        """Run a llama.cpp command and return the process"""
        cmd = [str(self.gguf_loader), command] + list(args)

        # Add environment variables
        env = os.environ.copy()
        if self.model_path:
            env["LLM_MODEL_PATH"] = self.model_path
        if self.cuda_enabled:
            env["LLAMA_CUDA"] = "true"

        # Merge with any additional env vars
        env.update(kwargs.get("env", {}))

        logger.debug(f"Running command: {' '.join(cmd)}")

        return subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
            **{k: v for k, v in kwargs.items() if k != "env"}
        )

    def chat(self, prompt: str, model_path: str = None, context_size: int = 4096,
             temperature: float = 0.8, max_tokens: int = 256) -> Dict[str, Any]:
        """
        Synchronous chat completion

        Args:
            prompt: Input prompt
            model_path: Path to GGUF model (optional, uses LLM_MODEL_PATH)
            context_size: Context window size
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate

        Returns:
            Dict with response and metadata
        """
        start_time = time.time()

        try:
            # For now, use the shim script
            # TODO: Implement direct llama.cpp API integration
            cmd = [str(self.gguf_loader), "chat", prompt]

            if model_path:
                cmd.append(model_path)

            cmd.extend([str(context_size), str(os.cpu_count() or 4)])

            env = {}
            if self.cuda_enabled:
                env["LLAMA_CUDA"] = "true"

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                env={**os.environ, **env},
                timeout=300  # 5 minute timeout
            )

            end_time = time.time()

            if result.returncode != 0:
                raise RuntimeError(f"llama-cli failed: {result.stderr}")

            return {
                "response": result.stdout.strip(),
                "model": model_path or self.model_path,
                "usage": {
                    "prompt_tokens": len(prompt.split()),  # Rough estimate
                    "completion_tokens": len(result.stdout.split()),  # Rough estimate
                    "total_tokens": len(prompt.split()) + len(result.stdout.split())
                },
                "timing": {
                    "start_time": start_time,
                    "end_time": end_time,
                    "duration": end_time - start_time
                },
                "cuda_enabled": self.cuda_enabled
            }

        except subprocess.TimeoutExpired:
            raise RuntimeError("Chat request timed out")
        except Exception as e:
            logger.error(f"Chat error: {e}")
            raise

    def stream_chat(self, prompt: str, model_path: str = None, context_size: int = 4096,
                   temperature: float = 0.8) -> str:
        """
        Streaming chat completion

        Args:
            prompt: Input prompt
            model_path: Path to GGUF model
            context_size: Context window size
            temperature: Sampling temperature

        Yields:
            Text chunks as they are generated
        """
        try:
            cmd = [str(self.gguf_loader), "stream", prompt]

            if model_path:
                cmd.append(model_path)

            cmd.extend([str(context_size), str(os.cpu_count() or 4)])

            env = {}
            if self.cuda_enabled:
                env["LLAMA_CUDA"] = "true"

            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env={**os.environ, **env}
            )

            # Read output line by line
            for line in iter(process.stdout.readline, ''):
                if line.strip():
                    yield line.strip()

            process.wait()

            if process.returncode != 0:
                error_output = process.stderr.read()
                raise RuntimeError(f"Streaming failed: {error_output}")

        except Exception as e:
            logger.error(f"Stream chat error: {e}")
            raise

    def benchmark(self, model_path: str = None, prompt: str = "Hello, how are you?",
                 n_predict: int = 128) -> Dict[str, Any]:
        """
        Benchmark model performance

        Args:
            model_path: Path to GGUF model
            prompt: Test prompt
            n_predict: Number of tokens to predict

        Returns:
            Benchmark results
        """
        try:
            cmd = [str(self.gguf_loader), "benchmark"]

            if model_path:
                cmd.append(model_path)

            cmd.extend([prompt, str(n_predict)])

            env = {}
            if self.cuda_enabled:
                env["LLAMA_CUDA"] = "true"

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                env={**os.environ, **env},
                timeout=600  # 10 minute timeout for benchmarks
            )

            if result.returncode != 0:
                raise RuntimeError(f"Benchmark failed: {result.stderr}")

            # Parse timing from output
            timing_match = result.stdout.strip().split()[-1] if result.stdout.strip() else "0"
            duration = float(timing_match.replace("s", "")) if "s" in timing_match else 0.0

            return {
                "model": model_path or self.model_path,
                "prompt": prompt,
                "n_predict": n_predict,
                "duration_seconds": duration,
                "tokens_per_second": n_predict / duration if duration > 0 else 0,
                "cuda_enabled": self.cuda_enabled
            }

        except Exception as e:
            logger.error(f"Benchmark error: {e}")
            raise

    def validate_model(self, model_path: str) -> Dict[str, Any]:
        """
        Validate GGUF model file

        Args:
            model_path: Path to GGUF model

        Returns:
            Validation results
        """
        if not os.path.exists(model_path):
            return {"valid": False, "error": "Model file not found"}

        try:
            # Basic GGUF header check
            with open(model_path, 'rb') as f:
                header = f.read(4)
                if header != b'GGUF':
                    return {"valid": False, "error": "Invalid GGUF header"}

            # Try to load with llama-cli
            result = subprocess.run(
                [str(self.gguf_loader), "load", model_path],
                capture_output=True,
                text=True,
                timeout=30
            )

            return {
                "valid": result.returncode == 0,
                "model_path": model_path,
                "error": result.stderr if result.returncode != 0 else None
            }

        except Exception as e:
            return {"valid": False, "error": str(e)}

    def get_system_info(self) -> Dict[str, Any]:
        """Get system and llama.cpp information"""
        return {
            "llama_cpp_version": "built-from-source",
            "cuda_enabled": self.cuda_enabled,
            "model_path": self.model_path,
            "cpu_count": os.cpu_count(),
            "system": sys.platform,
            "python_version": sys.version
        }


# Flask HTTP API (optional, for when flask is available)
try:
    from flask import Flask, request, jsonify, Response

    class LlamaHTTPBridge:
        """Flask-based HTTP API for llama.cpp"""

        def __init__(self, llama_bridge: LlamaBridge, host: str = "localhost", port: int = 8081):
            self.bridge = llama_bridge
            self.app = Flask(__name__)
            self.host = host
            self.port = port

            self._setup_routes()

        def _setup_routes(self):
            @self.app.route("/health", methods=["GET"])
            def health():
                return jsonify({"status": "healthy", "service": "llama-bridge"})

            @self.app.route("/chat", methods=["POST"])
            def chat():
                try:
                    data = request.get_json()
                    if not data or "prompt" not in data:
                        return jsonify({"error": "Missing 'prompt' field"}), 400

                    result = self.bridge.chat(
                        prompt=data["prompt"],
                        model_path=data.get("model_path"),
                        context_size=data.get("context_size", 4096),
                        temperature=data.get("temperature", 0.8),
                        max_tokens=data.get("max_tokens", 256)
                    )

                    return jsonify(result)

                except Exception as e:
                    logger.error(f"Chat API error: {e}")
                    return jsonify({"error": str(e)}), 500

            @self.app.route("/chat/stream", methods=["POST"])
            def chat_stream():
                try:
                    data = request.get_json()
                    if not data or "prompt" not in data:
                        return jsonify({"error": "Missing 'prompt' field"}), 400

                    def generate():
                        for chunk in self.bridge.stream_chat(
                            prompt=data["prompt"],
                            model_path=data.get("model_path"),
                            context_size=data.get("context_size", 4096),
                            temperature=data.get("temperature", 0.8)
                        ):
                            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                        yield "data: [DONE]\n\n"

                    return Response(generate(), mimetype="text/event-stream")

                except Exception as e:
                    logger.error(f"Stream API error: {e}")
                    return jsonify({"error": str(e)}), 500

            @self.app.route("/benchmark", methods=["POST"])
            def benchmark():
                try:
                    data = request.get_json() or {}
                    result = self.bridge.benchmark(
                        model_path=data.get("model_path"),
                        prompt=data.get("prompt", "Hello, how are you?"),
                        n_predict=data.get("n_predict", 128)
                    )
                    return jsonify(result)

                except Exception as e:
                    logger.error(f"Benchmark API error: {e}")
                    return jsonify({"error": str(e)}), 500

            @self.app.route("/validate", methods=["POST"])
            def validate():
                try:
                    data = request.get_json()
                    if not data or "model_path" not in data:
                        return jsonify({"error": "Missing 'model_path' field"}), 400

                    result = self.bridge.validate_model(data["model_path"])
                    return jsonify(result)

                except Exception as e:
                    logger.error(f"Validate API error: {e}")
                    return jsonify({"error": str(e)}), 500

            @self.app.route("/info", methods=["GET"])
            def info():
                return jsonify(self.bridge.get_system_info())

        def run(self):
            """Start the HTTP server"""
            logger.info(f"Starting LlamaHTTPBridge on {self.host}:{self.port}")
            self.app.run(host=self.host, port=self.port, debug=False, threaded=True)

except ImportError:
    logger.warning("Flask not available, HTTP API disabled")
    LlamaHTTPBridge = None


# MCP Server (optional, for Claude Code integration)
if MCP_AVAILABLE:
    class LlamaMCPServer:
        """MCP Server for llama.cpp neural processing tools"""

        def __init__(self, llama_bridge: LlamaBridge):
            self.bridge = llama_bridge
            self.server = Server("llama-neural-processing")

        async def handle_chat_completion(self, arguments: dict) -> List[TextContent]:
            """Handle chat completion requests"""
            try:
                prompt = arguments.get("prompt", "")
                model_path = arguments.get("model_path")
                context_size = arguments.get("context_size", 4096)
                temperature = arguments.get("temperature", 0.8)
                max_tokens = arguments.get("max_tokens", 256)

                result = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self.bridge.chat,
                    prompt, model_path, context_size, temperature, max_tokens
                )

                return [TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )]
            except Exception as e:
                return [TextContent(
                    type="text",
                    text=f"Error: {str(e)}"
                )]

        async def handle_stream_chat(self, arguments: dict) -> List[TextContent]:
            """Handle streaming chat requests"""
            try:
                prompt = arguments.get("prompt", "")
                model_path = arguments.get("model_path")
                context_size = arguments.get("context_size", 4096)
                temperature = arguments.get("temperature", 0.8)

                chunks = []
                async for chunk in self._stream_generator(prompt, model_path, context_size, temperature):
                    chunks.append(chunk)

                return [TextContent(
                    type="text",
                    text="".join(chunks)
                )]
            except Exception as e:
                return [TextContent(
                    type="text",
                    text=f"Error: {str(e)}"
                )]

        async def _stream_generator(self, prompt: str, model_path: str, context_size: int, temperature: float):
            """Async generator for streaming chat"""
            loop = asyncio.get_event_loop()
            for chunk in await loop.run_in_executor(
                None,
                lambda: list(self.bridge.stream_chat(prompt, model_path, context_size, temperature))
            ):
                yield chunk

        async def handle_benchmark(self, arguments: dict) -> List[TextContent]:
            """Handle benchmark requests"""
            try:
                model_path = arguments.get("model_path")
                prompt = arguments.get("prompt", "Hello, how are you?")
                n_predict = arguments.get("n_predict", 128)

                result = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self.bridge.benchmark,
                    model_path, prompt, n_predict
                )

                return [TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )]
            except Exception as e:
                return [TextContent(
                    type="text",
                    text=f"Error: {str(e)}"
                )]

        async def handle_validate_model(self, arguments: dict) -> List[TextContent]:
            """Handle model validation requests"""
            try:
                model_path = arguments.get("model_path", "")
                if not model_path:
                    return [TextContent(
                        type="text",
                        text="Error: model_path is required"
                    )]

                result = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self.bridge.validate_model,
                    model_path
                )

                return [TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )]
            except Exception as e:
                return [TextContent(
                    type="text",
                    text=f"Error: {str(e)}"
                )]

        async def handle_get_system_info(self, arguments: dict) -> List[TextContent]:
            """Handle system info requests"""
            try:
                result = self.bridge.get_system_info()
                return [TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )]
            except Exception as e:
                return [TextContent(
                    type="text",
                    text=f"Error: {str(e)}"
                )]

        async def handle_list_models(self, arguments: dict) -> List[TextContent]:
            """Handle list available models"""
            try:
                models_dir = Path(self.bridge.model_path) if self.bridge.model_path else Path(self.bridge.llama_cpp_dir) / "models"
                if not models_dir.exists():
                    return [TextContent(
                        type="text",
                        text=json.dumps({"models": [], "message": "Models directory not found"})
                    )]

                models = []
                for file in models_dir.glob("*.gguf"):
                    models.append({
                        "name": file.name,
                        "path": str(file),
                        "size_mb": file.stat().st_size / (1024 * 1024)
                    })

                return [TextContent(
                    type="text",
                    text=json.dumps({"models": models})
                )]
            except Exception as e:
                return [TextContent(
                    type="text",
                    text=f"Error: {str(e)}"
                )]

        async def setup_tools(self):
            """Setup MCP tools"""
            @self.server.list_tools()
            async def handle_list_tools() -> List[Tool]:
                return [
                    Tool(
                        name="chat_completion",
                        description="Generate chat completion using llama.cpp neural processing",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "prompt": {"type": "string", "description": "Input prompt for chat completion"},
                                "model_path": {"type": "string", "description": "Path to GGUF model file (optional)"},
                                "context_size": {"type": "integer", "description": "Context window size", "default": 4096},
                                "temperature": {"type": "number", "description": "Sampling temperature", "default": 0.8},
                                "max_tokens": {"type": "integer", "description": "Maximum tokens to generate", "default": 256}
                            },
                            "required": ["prompt"]
                        }
                    ),
                    Tool(
                        name="stream_chat",
                        description="Generate streaming chat completion using llama.cpp",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "prompt": {"type": "string", "description": "Input prompt for streaming chat"},
                                "model_path": {"type": "string", "description": "Path to GGUF model file (optional)"},
                                "context_size": {"type": "integer", "description": "Context window size", "default": 4096},
                                "temperature": {"type": "number", "description": "Sampling temperature", "default": 0.8}
                            },
                            "required": ["prompt"]
                        }
                    ),
                    Tool(
                        name="benchmark_model",
                        description="Benchmark model performance using llama.cpp",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "model_path": {"type": "string", "description": "Path to GGUF model file (optional)"},
                                "prompt": {"type": "string", "description": "Test prompt", "default": "Hello, how are you?"},
                                "n_predict": {"type": "integer", "description": "Number of tokens to predict", "default": 128}
                            }
                        }
                    ),
                    Tool(
                        name="validate_model",
                        description="Validate GGUF model file integrity",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "model_path": {"type": "string", "description": "Path to GGUF model file"}
                            },
                            "required": ["model_path"]
                        }
                    ),
                    Tool(
                        name="get_system_info",
                        description="Get system and llama.cpp configuration information",
                        inputSchema={
                            "type": "object",
                            "properties": {}
                        }
                    ),
                    Tool(
                        name="list_available_models",
                        description="List available GGUF models in the models directory",
                        inputSchema={
                            "type": "object",
                            "properties": {}
                        }
                    )
                ]

            @self.server.call_tool()
            async def handle_call_tool(name: str, arguments: dict) -> List[TextContent]:
                if name == "chat_completion":
                    return await self.handle_chat_completion(arguments)
                elif name == "stream_chat":
                    return await self.handle_stream_chat(arguments)
                elif name == "benchmark_model":
                    return await self.handle_benchmark(arguments)
                elif name == "validate_model":
                    return await self.handle_validate_model(arguments)
                elif name == "get_system_info":
                    return await self.handle_get_system_info(arguments)
                elif name == "list_available_models":
                    return await self.handle_list_models(arguments)
                else:
                    return [TextContent(
                        type="text",
                        text=f"Unknown tool: {name}"
                    )]

        async def run(self):
            """Run the MCP server"""
            await self.setup_tools()
            async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
                await self.server.run(
                    read_stream,
                    write_stream,
                    self.server.create_initialization_options()
                )

else:
    LlamaMCPServer = None


def main():
    """CLI interface"""
    import argparse

    parser = argparse.ArgumentParser(description="llama.cpp Neural Processing Bridge")
    parser.add_argument("command", choices=["chat", "stream", "benchmark", "validate", "info", "serve", "mcp"])
    parser.add_argument("--model", help="Path to GGUF model")
    parser.add_argument("--prompt", default="Hello, how are you?", help="Input prompt")
    parser.add_argument("--context-size", type=int, default=4096, help="Context window size")
    parser.add_argument("--temperature", type=float, default=0.8, help="Sampling temperature")
    parser.add_argument("--max-tokens", type=int, default=256, help="Maximum tokens to generate")
    parser.add_argument("--host", default="localhost", help="HTTP server host")
    parser.add_argument("--port", type=int, default=8081, help="HTTP server port")

    args = parser.parse_args()

    # Initialize bridge
    llama_cpp_dir = os.path.dirname(os.path.dirname(__file__))
    bridge = LlamaBridge(llama_cpp_dir)

    if args.command == "chat":
        result = bridge.chat(
            prompt=args.prompt,
            model_path=args.model,
            context_size=args.context_size,
            temperature=args.temperature,
            max_tokens=args.max_tokens
        )
        print(json.dumps(result, indent=2))

    elif args.command == "stream":
        for chunk in bridge.stream_chat(
            prompt=args.prompt,
            model_path=args.model,
            context_size=args.context_size,
            temperature=args.temperature
        ):
            print(chunk, end="", flush=True)
        print()

    elif args.command == "benchmark":
        result = bridge.benchmark(
            model_path=args.model,
            prompt=args.prompt
        )
        print(json.dumps(result, indent=2))

    elif args.command == "validate":
        if not args.model:
            print("Error: --model required for validate command")
            sys.exit(1)
        result = bridge.validate_model(args.model)
        print(json.dumps(result, indent=2))

    elif args.command == "info":
        result = bridge.get_system_info()
        print(json.dumps(result, indent=2))

    elif args.command == "serve":
        if LlamaHTTPBridge is None:
            print("Error: Flask required for HTTP server. Install with: pip install flask")
            sys.exit(1)

        http_bridge = LlamaHTTPBridge(bridge, args.host, args.port)
        http_bridge.run()

    elif args.command == "mcp":
        if LlamaMCPServer is None:
            print("Error: MCP server libraries required. Install with: pip install mcp")
            sys.exit(1)

        mcp_server = LlamaMCPServer(bridge)
        asyncio.run(mcp_server.run())


if __name__ == "__main__":
    main()
