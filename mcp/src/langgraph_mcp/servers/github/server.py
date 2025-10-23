"""GitHub MCP Server implementation."""

import os
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import json
from .tools import GitHubTools


def create_github_server(token: str | None = None) -> Server:
    """Create and configure the GitHub MCP server.

    Args:
        token: GitHub personal access token.
               If None, uses GITHUB_TOKEN env var.

    Returns:
        Configured MCP Server instance
    """
    server = Server("github")

    # Get token from env or parameter
    if token is None:
        token = os.getenv("GITHUB_TOKEN")

    github_tools = GitHubTools(token)

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        """List available GitHub tools."""
        return [
            Tool(
                name="list_repositories",
                description="List repositories for a GitHub user",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "username": {
                            "type": "string",
                            "description": "GitHub username (default: authenticated user)"
                        },
                        "sort": {
                            "type": "string",
                            "description": "Sort order: created, updated, pushed, full_name",
                            "default": "updated"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of repositories",
                            "default": 30
                        }
                    }
                }
            ),
            Tool(
                name="get_repository",
                description="Get detailed information about a repository",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "owner": {
                            "type": "string",
                            "description": "Repository owner username"
                        },
                        "repo_name": {
                            "type": "string",
                            "description": "Repository name"
                        }
                    },
                    "required": ["owner", "repo_name"]
                }
            ),
            Tool(
                name="list_issues",
                description="List issues for a repository",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "owner": {
                            "type": "string",
                            "description": "Repository owner username"
                        },
                        "repo_name": {
                            "type": "string",
                            "description": "Repository name"
                        },
                        "state": {
                            "type": "string",
                            "description": "Issue state: open, closed, all",
                            "default": "open"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of issues",
                            "default": 30
                        }
                    },
                    "required": ["owner", "repo_name"]
                }
            ),
            Tool(
                name="create_issue",
                description="Create a new issue in a repository",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "owner": {
                            "type": "string",
                            "description": "Repository owner username"
                        },
                        "repo_name": {
                            "type": "string",
                            "description": "Repository name"
                        },
                        "title": {
                            "type": "string",
                            "description": "Issue title"
                        },
                        "body": {
                            "type": "string",
                            "description": "Issue description/body"
                        },
                        "labels": {
                            "type": "array",
                            "description": "Issue labels",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["owner", "repo_name", "title"]
                }
            ),
            Tool(
                name="list_pull_requests",
                description="List pull requests for a repository",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "owner": {
                            "type": "string",
                            "description": "Repository owner username"
                        },
                        "repo_name": {
                            "type": "string",
                            "description": "Repository name"
                        },
                        "state": {
                            "type": "string",
                            "description": "PR state: open, closed, all",
                            "default": "open"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of PRs",
                            "default": 30
                        }
                    },
                    "required": ["owner", "repo_name"]
                }
            ),
            Tool(
                name="get_file_content",
                description="Get the contents of a file from a repository",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "owner": {
                            "type": "string",
                            "description": "Repository owner username"
                        },
                        "repo_name": {
                            "type": "string",
                            "description": "Repository name"
                        },
                        "file_path": {
                            "type": "string",
                            "description": "Path to file in repository"
                        },
                        "branch": {
                            "type": "string",
                            "description": "Branch name (default: default branch)"
                        }
                    },
                    "required": ["owner", "repo_name", "file_path"]
                }
            )
        ]

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[TextContent]:
        """Execute a GitHub tool."""
        tool_methods = {
            "list_repositories": github_tools.list_repositories,
            "get_repository": github_tools.get_repository,
            "list_issues": github_tools.list_issues,
            "create_issue": github_tools.create_issue,
            "list_pull_requests": github_tools.list_pull_requests,
            "get_file_content": github_tools.get_file_content,
        }

        if name not in tool_methods:
            return [TextContent(
                type="text",
                text=json.dumps({"error": f"Unknown tool: {name}", "success": False})
            )]

        try:
            result = tool_methods[name](**arguments)
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        except Exception as e:
            return [TextContent(
                type="text",
                text=json.dumps({"error": str(e), "success": False}, indent=2)
            )]

    return server


async def main():
    """Run the GitHub MCP server."""
    server = create_github_server()
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
