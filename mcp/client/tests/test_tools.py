"""Tests for tool management"""

import pytest
from mcp.client.tools import MCPToolManager, MCPToolUtils
from mcp.client.types import (
    MCPTool,
    MCPToolCall,
    MCPToolResult,
    MCPTextContent,
    MCPImageContent,
    MCPToolInputSchema,
)


class TestMCPToolManager:
    """Test tool manager functionality"""

    @pytest.fixture
    def mock_send_request(self):
        """Create a mock send request function"""
        async def send_request(method, params=None):
            if method == "tools/list":
                return {
                    "tools": [
                        {
                            "name": "test_tool",
                            "description": "A test tool",
                            "input_schema": {
                                "type": "object",
                                "properties": {
                                    "param": {"type": "string"}
                                },
                                "required": ["param"]
                            }
                        }
                    ]
                }
            elif method == "tools/call":
                return {
                    "content": [{"type": "text", "text": "result"}],
                    "is_error": False
                }
            return {}

        return send_request

    @pytest.fixture
    def tool_manager(self, mock_send_request):
        """Create a tool manager with mock send request"""
        return MCPToolManager(mock_send_request)

    @pytest.mark.asyncio
    async def test_list_tools(self, tool_manager):
        """Test listing tools"""
        tools = await tool_manager.list_tools()

        assert len(tools) == 1
        assert tools[0].name == "test_tool"
        assert tool_manager.has_tool("test_tool")

    @pytest.mark.asyncio
    async def test_get_tool(self, tool_manager):
        """Test getting a specific tool"""
        await tool_manager.list_tools()

        tool = tool_manager.get_tool("test_tool")
        assert tool is not None
        assert tool.name == "test_tool"

        missing_tool = tool_manager.get_tool("missing")
        assert missing_tool is None

    @pytest.mark.asyncio
    async def test_call_tool(self, tool_manager):
        """Test calling a tool"""
        await tool_manager.list_tools()

        call = MCPToolCall(
            name="test_tool",
            arguments={"param": "value"}
        )

        result = await tool_manager.call_tool(call)

        assert len(result.content) == 1
        assert result.is_error is False

    @pytest.mark.asyncio
    async def test_call_missing_tool(self, tool_manager):
        """Test calling a non-existent tool"""
        await tool_manager.list_tools()

        call = MCPToolCall(name="missing_tool")

        with pytest.raises(Exception, match="Tool not found"):
            await tool_manager.call_tool(call)

    @pytest.mark.asyncio
    async def test_validate_required_arguments(self, tool_manager):
        """Test validation of required arguments"""
        await tool_manager.list_tools()

        call = MCPToolCall(
            name="test_tool",
            arguments={}  # Missing required param
        )

        with pytest.raises(Exception, match="Missing required argument"):
            await tool_manager.call_tool(call)

    @pytest.mark.asyncio
    async def test_call_tools_sequence(self, tool_manager):
        """Test calling tools in sequence"""
        await tool_manager.list_tools()

        calls = [
            MCPToolCall(name="test_tool", arguments={"param": "value1"}),
            MCPToolCall(name="test_tool", arguments={"param": "value2"}),
        ]

        results = await tool_manager.call_tools_sequence(calls)

        assert len(results) == 2

    @pytest.mark.asyncio
    async def test_call_tools_parallel(self, tool_manager):
        """Test calling tools in parallel"""
        await tool_manager.list_tools()

        calls = [
            MCPToolCall(name="test_tool", arguments={"param": "value1"}),
            MCPToolCall(name="test_tool", arguments={"param": "value2"}),
        ]

        results = await tool_manager.call_tools_parallel(calls)

        assert len(results) == 2

    def test_clear_tools(self, tool_manager):
        """Test clearing tool cache"""
        tool_manager.tools["test"] = MCPTool(
            name="test",
            input_schema=MCPToolInputSchema()
        )

        assert len(tool_manager.tools) == 1

        tool_manager.clear()

        assert len(tool_manager.tools) == 0


class TestMCPToolUtils:
    """Test tool utility functions"""

    def test_create_tool_call(self):
        """Test creating a tool call"""
        call = MCPToolUtils.create_tool_call("my_tool", {"arg": "value"})

        assert call.name == "my_tool"
        assert call.arguments == {"arg": "value"}

    def test_extract_text_content(self):
        """Test extracting text content"""
        result = MCPToolResult(
            content=[
                {"type": "text", "text": "Hello"},
                {"type": "text", "text": "World"}
            ]
        )

        texts = MCPToolUtils.extract_text_content(result)

        assert texts == ["Hello", "World"]

    def test_extract_image_content(self):
        """Test extracting image content"""
        result = MCPToolResult(
            content=[
                {
                    "type": "image",
                    "data": "base64data",
                    "mime_type": "image/png"
                }
            ]
        )

        images = MCPToolUtils.extract_image_content(result)

        assert len(images) == 1
        assert images[0]["mime_type"] == "image/png"

    def test_extract_resource_content(self):
        """Test extracting resource content"""
        result = MCPToolResult(
            content=[
                {
                    "type": "resource",
                    "resource": {
                        "uri": "file:///test.txt",
                        "text": "content"
                    }
                }
            ]
        )

        resources = MCPToolUtils.extract_resource_content(result)

        assert len(resources) == 1
        assert resources[0]["uri"] == "file:///test.txt"

    def test_has_error(self):
        """Test error detection"""
        error_result = MCPToolResult(content=[], is_error=True)
        success_result = MCPToolResult(content=[], is_error=False)

        assert MCPToolUtils.has_error(error_result) is True
        assert MCPToolUtils.has_error(success_result) is False

    def test_format_result(self):
        """Test formatting result as string"""
        result = MCPToolResult(
            content=[
                {"type": "text", "text": "Hello World"}
            ]
        )

        formatted = MCPToolUtils.format_result(result)

        assert formatted == "Hello World"

    def test_format_mixed_content(self):
        """Test formatting result with mixed content types"""
        result = MCPToolResult(
            content=[
                {"type": "text", "text": "Text content"},
                {"type": "image", "mime_type": "image/png"},
                {"type": "resource", "resource": {"uri": "file:///test.txt"}}
            ]
        )

        formatted = MCPToolUtils.format_result(result)

        assert "Text content" in formatted
        assert "[Image: image/png]" in formatted
        assert "[Resource: file:///test.txt]" in formatted
