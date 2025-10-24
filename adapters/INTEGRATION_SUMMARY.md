# LangChain MCP Adapters – Integration Summary

## Repository

- Source: https://github.com/langchain-ai/langchain-mcp-adapters
- Local clone: `~/noa-server/adapters`
- Installed editable package: `langchain-mcp-adapters==0.1.10`
- Virtual environment: `~/noa-server/noa/venv`

## Feature Coverage

### Adapters & Conversion Utilities

- **Tool conversion**
  - `load_mcp_tools` converts MCP tools into LangChain `StructuredTool`s with
    pagination, annotations, and metadata propagation.
  - `convert_mcp_tool_to_langchain_tool` supports callbacks, hooks,
    runtime-aware headers, and on-demand session creation.
  - `to_fastmcp` converts LangChain tools back into `FastMCP` tool objects
    (async-only, rejects injected args).
- **Prompt conversion**
  - `load_mcp_prompt` + `convert_mcp_prompt_message_to_langchain_message`
    translate MCP prompt messages into LangChain `HumanMessage`/`AIMessage`
    instances.
- **Resource conversion**
  - `load_mcp_resources` and `get_mcp_resource` pull MCP resources (text +
    binary) and expose them as LangChain `Blob`s.

### Client & Session Management

- `MultiServerMCPClient`
  - Manages many MCP servers simultaneously.
  - Supports per-server and aggregate tool loading.
  - Provides convenience helpers for prompts and resources.
  - Accepts callbacks (`Callbacks`) and lifecycle hooks (`Hooks`) for
    instrumentation and header injection.
- `sessions.py`
  - Transport coverage: `stdio`, `sse`, `streamable_http`, `websocket`.
  - Shared `create_session` orchestrator with timeout/encoding controls.
  - Optional custom `httpx` factories & auth for HTTP-based transports.
- Callback support: logging + progress notifications via MCP SDK wrappers.
- Hook support: mutate tool request/response (e.g., rewrite headers) via
  `Hooks.before_tool_call` and `Hooks.after_tool_call`.

### Example Servers & Utilities

- `tests/servers/` includes math/weather/time FastMCP examples for stdio +
  websocket.
- `examples/servers/streamable-http-stateless/` demonstrates streamable HTTP
  transport.

## Installation Notes

- Executed:
  ```bash
  cd ~/noa-server/adapters
  source ../noa/venv/bin/activate
  pip install -e .
  ```
- Repository does **not** define an `[all]` extra; `pip` warns but installation
  succeeds with core dependencies.
- Additional test tooling installed:
  - `pytest>=8.4`, `pytest-socket`, `pytest-asyncio`, `pytest-timeout`,
    `websockets`.

## Validation

- Test suite run from repo root:
  ```bash
  cd ~/noa-server/adapters
  source ../noa/venv/bin/activate
  pytest
  ```
- Result: **51 passed** in ~9.5s (Python 3.12.3 on Linux).
- Slowest tests exercise multi-server client, hook behavior, and stream
  transports.

## Integration Guidance

- Update `~/noa-server/langgraph.json` with adapter graphs to expose MCP tools
  inside LangGraph API server.
- Use `MultiServerMCPClient` in LangGraph graphs to surface MCP tools to agents;
  example patterns:

  ```python
  from langchain_mcp_adapters.client import MultiServerMCPClient
  from langchain_mcp_adapters.tools import load_mcp_tools

  client = MultiServerMCPClient({
      "math": {"command": "python", "args": ["/abs/path/math_server.py"], "transport": "stdio"},
      "weather": {"transport": "streamable_http", "url": "http://localhost:8000/mcp"}
  })
  tools = await client.get_tools()
  ```

- To convert LangChain tools into FastMCP for server-side exposure:

  ```python
  from langchain_core.tools import tool
  from langchain_mcp_adapters.tools import to_fastmcp
  from mcp.server.fastmcp import FastMCP

  @tool
  def add(a: int, b: int) -> int:
      return a + b

  fast_tool = to_fastmcp(add)
  mcp = FastMCP("MyServer", tools=[fast_tool])
  mcp.run(transport="stdio")
  ```

- Headers & auth: provide `headers`/`auth` entries in connection config or
  mutate via `Hooks.before_tool_call` for runtime injection.

## Next Steps

1. Wire desired MCP servers into `start.sh` (optional) or dedicated LangGraph
   graphs.
2. Create `.env` files with API keys for MCP servers / LangGraph agents.
3. Extend LangGraph graphs to call `MultiServerMCPClient` at startup and cache
   loaded tools.
4. Configure monitoring/logging via `Callbacks` to surface progress + logging
   notifications.

## Artifact Hashes

- Repo clone (HEAD): `$(git -C ~/noa-server/adapters rev-parse HEAD)`
- Test log stored in shell history (pytest output above).

```text
Generated: 2025-10-10
Environment: Python 3.12.3 (~/noa-server/noa/venv)
```
