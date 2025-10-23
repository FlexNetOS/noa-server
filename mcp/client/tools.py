"""Tool management and invocation for MCP clients"""

from typing import Any, Callable, Dict, List, Optional

from .types import (
    MCPTool,
    MCPToolCall,
    MCPToolResult,
    MCPToolError,
    CallToolRequest,
    CallToolResponse,
    ListToolsResponse,
    MCPTextContent,
    MCPImageContent,
    MCPResourceContent,
)


class MCPToolManager:
    """Tool management and invocation for MCP clients"""

    def __init__(self, send_request: Callable):
        self.tools: Dict[str, MCPTool] = {}
        self.send_request = send_request

    async def list_tools(self) -> List[MCPTool]:
        """List all available tools from the server"""
        try:
            response = await self.send_request("tools/list")

            if isinstance(response, dict) and "tools" in response:
                tools = [MCPTool(**tool) for tool in response["tools"]]
            else:
                tools = []

            # Update local cache
            self.tools.clear()
            for tool in tools:
                self.tools[tool.name] = tool

            return tools

        except Exception as e:
            raise MCPToolError(f"Failed to list tools: {e}")

    def get_tool(self, name: str) -> Optional[MCPTool]:
        """Get a specific tool by name"""
        return self.tools.get(name)

    def get_all_tools(self) -> List[MCPTool]:
        """Get all cached tools"""
        return list(self.tools.values())

    def has_tool(self, name: str) -> bool:
        """Check if a tool exists"""
        return name in self.tools

    async def call_tool(self, call: MCPToolCall) -> MCPToolResult:
        """Call a tool with the given arguments"""
        tool = self.tools.get(call.name)
        if not tool:
            raise MCPToolError(f"Tool not found: {call.name}")

        # Validate arguments against schema
        if call.arguments:
            self._validate_arguments(tool, call.arguments)

        try:
            request = CallToolRequest(
                name=call.name,
                arguments=call.arguments
            )

            response = await self.send_request("tools/call", request.__dict__)

            if isinstance(response, dict):
                return MCPToolResult(
                    content=response.get("content", []),
                    is_error=response.get("is_error", False)
                )

            raise MCPToolError("Invalid response format")

        except Exception as e:
            raise MCPToolError(f"Tool execution failed: {e}")

    async def call_tools_sequence(self, calls: List[MCPToolCall]) -> List[MCPToolResult]:
        """Call multiple tools in sequence"""
        results = []

        for call in calls:
            result = await self.call_tool(call)
            results.append(result)

            # Stop if we encounter an error
            if result.is_error:
                break

        return results

    async def call_tools_parallel(self, calls: List[MCPToolCall]) -> List[MCPToolResult]:
        """Call multiple tools in parallel"""
        import asyncio
        tasks = [self.call_tool(call) for call in calls]
        return await asyncio.gather(*tasks)

    def _validate_arguments(self, tool: MCPTool, args: Dict[str, Any]) -> None:
        """Validate tool arguments against schema"""
        schema = tool.input_schema

        # Check required fields
        if schema.required:
            for field in schema.required:
                if field not in args:
                    raise MCPToolError(
                        f"Missing required argument '{field}' for tool '{tool.name}'"
                    )

        # Check for unexpected fields if additionalProperties is False
        if schema.additional_properties is False and schema.properties:
            allowed_keys = set(schema.properties.keys())
            provided_keys = set(args.keys())

            unexpected = provided_keys - allowed_keys
            if unexpected:
                raise MCPToolError(
                    f"Unexpected arguments {unexpected} for tool '{tool.name}'"
                )

        # Basic type validation
        if schema.properties:
            for key, value in args.items():
                if key in schema.properties:
                    prop_schema = schema.properties[key]
                    expected_type = prop_schema.get("type")

                    if expected_type:
                        actual_type = "array" if isinstance(value, list) else type(value).__name__
                        if expected_type == "object":
                            expected_type = "dict"
                        if expected_type == "integer":
                            expected_type = "int"
                        if expected_type == "string":
                            expected_type = "str"

                        if actual_type != expected_type:
                            raise MCPToolError(
                                f"Invalid type for argument '{key}' in tool '{tool.name}': "
                                f"expected {expected_type}, got {actual_type}"
                            )

    def clear(self) -> None:
        """Clear the tool cache"""
        self.tools.clear()

    async def refresh(self) -> List[MCPTool]:
        """Refresh the tool list from the server"""
        return await self.list_tools()


class MCPToolUtils:
    """Utility functions for working with tools"""

    @staticmethod
    def create_tool_call(name: str, args: Optional[Dict[str, Any]] = None) -> MCPToolCall:
        """Create a tool call object"""
        return MCPToolCall(name=name, arguments=args)

    @staticmethod
    def extract_text_content(result: MCPToolResult) -> List[str]:
        """Extract text content from tool results"""
        texts = []
        for item in result.content:
            if isinstance(item, dict) and item.get("type") == "text":
                texts.append(item.get("text", ""))
            elif isinstance(item, MCPTextContent):
                texts.append(item.text)
        return texts

    @staticmethod
    def extract_image_content(result: MCPToolResult) -> List[Dict[str, str]]:
        """Extract image content from tool results"""
        images = []
        for item in result.content:
            if isinstance(item, dict) and item.get("type") == "image":
                images.append({
                    "data": item.get("data", ""),
                    "mime_type": item.get("mime_type", "")
                })
            elif isinstance(item, MCPImageContent):
                images.append({
                    "data": item.data,
                    "mime_type": item.mime_type
                })
        return images

    @staticmethod
    def extract_resource_content(result: MCPToolResult) -> List[Dict[str, Optional[str]]]:
        """Extract resource content from tool results"""
        resources = []
        for item in result.content:
            if isinstance(item, dict) and item.get("type") == "resource":
                resource = item.get("resource", {})
                resources.append({
                    "uri": resource.get("uri", ""),
                    "text": resource.get("text")
                })
            elif isinstance(item, MCPResourceContent):
                resources.append({
                    "uri": item.resource.uri,
                    "text": item.resource.text
                })
        return resources

    @staticmethod
    def has_error(result: MCPToolResult) -> bool:
        """Check if a tool result contains errors"""
        return result.is_error is True

    @staticmethod
    def format_result(result: MCPToolResult) -> str:
        """Format tool result as string"""
        parts = []

        for content in result.content:
            if isinstance(content, dict):
                content_type = content.get("type")
                if content_type == "text":
                    parts.append(content.get("text", ""))
                elif content_type == "image":
                    parts.append(f"[Image: {content.get('mime_type', 'unknown')}]")
                elif content_type == "resource":
                    resource = content.get("resource", {})
                    parts.append(f"[Resource: {resource.get('uri', 'unknown')}]")
            elif isinstance(content, MCPTextContent):
                parts.append(content.text)
            elif isinstance(content, MCPImageContent):
                parts.append(f"[Image: {content.mime_type}]")
            elif isinstance(content, MCPResourceContent):
                parts.append(f"[Resource: {content.resource.uri}]")

        return "\n".join(parts)
