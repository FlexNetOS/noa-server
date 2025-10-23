"""
MCP Monitoring & Metrics Package

Provides comprehensive monitoring, metrics, logging, and tracing for MCP servers.
"""

from .metrics import (
    MetricsCollector,
    Counter,
    Gauge,
    Histogram,
    get_metrics_collector,
    track_request_metrics
)
from .logger import (
    StructuredFormatter,
    StructuredLoggerAdapter,
    setup_logger,
    get_logger,
    set_request_context,
    clear_request_context,
    log_mcp_operation,
    log_agent_event,
    log_task_event,
    log_auth_event,
    log_error,
    log_operation,
    mcp_logger
)
from .tracer import (
    Tracer,
    Span,
    SpanContext,
    get_tracer,
    trace_operation,
    trace_mcp_tool
)

__all__ = [
    # Metrics
    'MetricsCollector',
    'Counter',
    'Gauge',
    'Histogram',
    'get_metrics_collector',
    'track_request_metrics',

    # Logging
    'StructuredFormatter',
    'StructuredLoggerAdapter',
    'setup_logger',
    'get_logger',
    'set_request_context',
    'clear_request_context',
    'log_mcp_operation',
    'log_agent_event',
    'log_task_event',
    'log_auth_event',
    'log_error',
    'log_operation',
    'mcp_logger',

    # Tracing
    'Tracer',
    'Span',
    'SpanContext',
    'get_tracer',
    'trace_operation',
    'trace_mcp_tool'
]

__version__ = '1.0.0'
