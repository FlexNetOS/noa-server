"""
MCP (Model Context Protocol) Server Infrastructure

Provides authentication, authorization, monitoring, and observability for MCP servers.
"""

from . import auth
from . import monitoring

__all__ = ['auth', 'monitoring']
__version__ = '1.0.0'
