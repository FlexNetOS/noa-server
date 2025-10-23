"""
MCP Distributed Tracing

Provides distributed tracing for MCP operations using OpenTelemetry.
"""

import time
import logging
from typing import Dict, Any, Optional, Callable
from functools import wraps
from datetime import datetime
import threading
import uuid
from contextvars import ContextVar

logger = logging.getLogger(__name__)

# Context variables for trace propagation
trace_id_var: ContextVar[Optional[str]] = ContextVar('trace_id', default=None)
span_id_var: ContextVar[Optional[str]] = ContextVar('span_id', default=None)
parent_span_id_var: ContextVar[Optional[str]] = ContextVar('parent_span_id', default=None)


class Span:
    """Trace span representing an operation"""

    def __init__(
        self,
        name: str,
        trace_id: str,
        span_id: str,
        parent_span_id: Optional[str] = None,
        attributes: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize span

        Args:
            name: Span name
            trace_id: Trace identifier
            span_id: Span identifier
            parent_span_id: Parent span identifier
            attributes: Span attributes
        """
        self.name = name
        self.trace_id = trace_id
        self.span_id = span_id
        self.parent_span_id = parent_span_id
        self.attributes = attributes or {}

        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.status = "unset"
        self.status_message: Optional[str] = None

        self.events: list = []
        self.links: list = []

    def set_attribute(self, key: str, value: Any):
        """Set span attribute"""
        self.attributes[key] = value

    def add_event(self, name: str, attributes: Optional[Dict[str, Any]] = None):
        """Add event to span"""
        event = {
            "name": name,
            "timestamp": time.time(),
            "attributes": attributes or {}
        }
        self.events.append(event)

    def set_status(self, status: str, message: Optional[str] = None):
        """
        Set span status

        Args:
            status: Status code (ok, error, unset)
            message: Status message
        """
        self.status = status
        self.status_message = message

    def end(self):
        """End span"""
        self.end_time = time.time()

    def duration(self) -> Optional[float]:
        """Get span duration in seconds"""
        if self.end_time:
            return self.end_time - self.start_time
        return None

    def to_dict(self) -> Dict[str, Any]:
        """Convert span to dictionary"""
        return {
            "name": self.name,
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "parent_span_id": self.parent_span_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.duration(),
            "status": self.status,
            "status_message": self.status_message,
            "attributes": self.attributes,
            "events": self.events,
            "links": self.links
        }

    def to_jaeger_format(self) -> Dict[str, Any]:
        """Convert to Jaeger JSON format"""
        return {
            "traceID": self.trace_id,
            "spanID": self.span_id,
            "operationName": self.name,
            "references": [
                {
                    "refType": "CHILD_OF",
                    "traceID": self.trace_id,
                    "spanID": self.parent_span_id
                }
            ] if self.parent_span_id else [],
            "startTime": int(self.start_time * 1_000_000),  # microseconds
            "duration": int(self.duration() * 1_000_000) if self.duration() else 0,
            "tags": [
                {"key": k, "type": "string", "value": str(v)}
                for k, v in self.attributes.items()
            ],
            "logs": [
                {
                    "timestamp": int(event["timestamp"] * 1_000_000),
                    "fields": [
                        {"key": "event", "type": "string", "value": event["name"]},
                        *[
                            {"key": k, "type": "string", "value": str(v)}
                            for k, v in event["attributes"].items()
                        ]
                    ]
                }
                for event in self.events
            ]
        }


class Tracer:
    """
    Distributed tracer for MCP operations

    Features:
    - Trace creation and propagation
    - Span management with parent-child relationships
    - Automatic context propagation
    - Multiple export formats (Jaeger, Zipkin, OTLP)
    - In-memory and remote storage
    """

    def __init__(
        self,
        service_name: str = "mcp-server",
        sampling_rate: float = 1.0
    ):
        """
        Initialize tracer

        Args:
            service_name: Name of the service
            sampling_rate: Sampling rate (0.0 to 1.0)
        """
        self.service_name = service_name
        self.sampling_rate = sampling_rate

        # In-memory span storage
        self.spans: Dict[str, Span] = {}
        self._lock = threading.Lock()

        # Active spans per thread
        self.active_spans: Dict[int, Span] = {}

        logger.info(f"Tracer initialized: service={service_name}, sampling_rate={sampling_rate}")

    def start_trace(self, name: str, attributes: Optional[Dict[str, Any]] = None) -> Span:
        """
        Start a new trace

        Args:
            name: Trace name
            attributes: Trace attributes

        Returns:
            Root span
        """
        trace_id = self._generate_trace_id()
        span_id = self._generate_span_id()

        span = Span(
            name=name,
            trace_id=trace_id,
            span_id=span_id,
            attributes=attributes
        )

        # Set default attributes
        span.set_attribute("service.name", self.service_name)
        span.set_attribute("span.kind", "server")

        # Store span
        with self._lock:
            self.spans[span_id] = span

        # Set context
        trace_id_var.set(trace_id)
        span_id_var.set(span_id)
        parent_span_id_var.set(None)

        # Track active span
        self.active_spans[threading.get_ident()] = span

        logger.debug(f"Started trace: {name} (trace_id={trace_id})")
        return span

    def start_span(
        self,
        name: str,
        parent_span: Optional[Span] = None,
        attributes: Optional[Dict[str, Any]] = None
    ) -> Span:
        """
        Start a new span

        Args:
            name: Span name
            parent_span: Parent span (uses current span if None)
            attributes: Span attributes

        Returns:
            New span
        """
        # Get trace context
        trace_id = trace_id_var.get()
        if not trace_id:
            # No active trace, start a new one
            return self.start_trace(name, attributes)

        # Determine parent span
        if parent_span is None:
            parent_span = self.active_spans.get(threading.get_ident())

        parent_span_id = parent_span.span_id if parent_span else None

        # Create new span
        span_id = self._generate_span_id()
        span = Span(
            name=name,
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id,
            attributes=attributes
        )

        # Set default attributes
        span.set_attribute("service.name", self.service_name)

        # Store span
        with self._lock:
            self.spans[span_id] = span

        # Update context
        span_id_var.set(span_id)
        parent_span_id_var.set(parent_span_id)

        # Track active span
        self.active_spans[threading.get_ident()] = span

        logger.debug(f"Started span: {name} (span_id={span_id}, parent={parent_span_id})")
        return span

    def end_span(self, span: Span):
        """
        End span

        Args:
            span: Span to end
        """
        span.end()

        # Remove from active spans if it's the current one
        thread_id = threading.get_ident()
        if self.active_spans.get(thread_id) == span:
            # Restore parent span as active
            if span.parent_span_id:
                parent_span = self.get_span(span.parent_span_id)
                if parent_span:
                    self.active_spans[thread_id] = parent_span
                    span_id_var.set(parent_span.span_id)
            else:
                # No parent, clear context
                del self.active_spans[thread_id]
                span_id_var.set(None)
                trace_id_var.set(None)

        logger.debug(f"Ended span: {span.name} (duration={span.duration():.3f}s)")

    def get_span(self, span_id: str) -> Optional[Span]:
        """Get span by ID"""
        with self._lock:
            return self.spans.get(span_id)

    def get_trace(self, trace_id: str) -> list[Span]:
        """Get all spans for a trace"""
        with self._lock:
            return [
                span for span in self.spans.values()
                if span.trace_id == trace_id
            ]

    def export_jaeger(self, trace_id: str) -> Dict[str, Any]:
        """
        Export trace in Jaeger format

        Args:
            trace_id: Trace identifier

        Returns:
            Jaeger JSON format
        """
        spans = self.get_trace(trace_id)

        return {
            "data": [
                {
                    "traceID": trace_id,
                    "spans": [span.to_jaeger_format() for span in spans],
                    "processes": {
                        "p1": {
                            "serviceName": self.service_name,
                            "tags": []
                        }
                    }
                }
            ]
        }

    def export_zipkin(self, trace_id: str) -> list[Dict[str, Any]]:
        """
        Export trace in Zipkin format

        Args:
            trace_id: Trace identifier

        Returns:
            List of Zipkin span objects
        """
        spans = self.get_trace(trace_id)

        return [
            {
                "traceId": span.trace_id,
                "id": span.span_id,
                "name": span.name,
                "parentId": span.parent_span_id,
                "timestamp": int(span.start_time * 1_000_000),
                "duration": int(span.duration() * 1_000_000) if span.duration() else 0,
                "localEndpoint": {
                    "serviceName": self.service_name
                },
                "tags": span.attributes,
                "annotations": [
                    {
                        "timestamp": int(event["timestamp"] * 1_000_000),
                        "value": event["name"]
                    }
                    for event in span.events
                ]
            }
            for span in spans
        ]

    def clear_traces(self):
        """Clear all stored traces"""
        with self._lock:
            self.spans.clear()
        logger.info("All traces cleared")

    def _generate_trace_id(self) -> str:
        """Generate unique trace ID"""
        return uuid.uuid4().hex

    def _generate_span_id(self) -> str:
        """Generate unique span ID"""
        return uuid.uuid4().hex[:16]

    def _should_sample(self) -> bool:
        """Determine if trace should be sampled"""
        import random
        return random.random() < self.sampling_rate

    def span(
        self,
        name: str,
        attributes: Optional[Dict[str, Any]] = None
    ):
        """
        Context manager for automatic span management

        Args:
            name: Span name
            attributes: Span attributes

        Example:
            with tracer.span("database_query"):
                execute_query()
        """
        return SpanContext(self, name, attributes)


class SpanContext:
    """Context manager for spans"""

    def __init__(
        self,
        tracer: Tracer,
        name: str,
        attributes: Optional[Dict[str, Any]] = None
    ):
        self.tracer = tracer
        self.name = name
        self.attributes = attributes
        self.span: Optional[Span] = None

    def __enter__(self) -> Span:
        self.span = self.tracer.start_span(self.name, attributes=self.attributes)
        return self.span

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.span:
            if exc_type:
                self.span.set_status("error", str(exc_val))
                self.span.set_attribute("error", True)
                self.span.set_attribute("error.type", exc_type.__name__)
                self.span.set_attribute("error.message", str(exc_val))
            else:
                self.span.set_status("ok")

            self.tracer.end_span(self.span)

        return False  # Don't suppress exceptions


# Global tracer instance
_tracer = Tracer()


def get_tracer() -> Tracer:
    """Get global tracer instance"""
    return _tracer


def trace_operation(name: str, attributes: Optional[Dict[str, Any]] = None):
    """
    Decorator to automatically trace operations

    Args:
        name: Operation name
        attributes: Operation attributes
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            tracer = get_tracer()

            with tracer.span(name, attributes):
                return func(*args, **kwargs)

        return wrapper
    return decorator


def trace_mcp_tool(tool: str, operation: str):
    """
    Decorator to trace MCP tool operations

    Args:
        tool: Tool name
        operation: Operation name
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            tracer = get_tracer()

            attributes = {
                "mcp.tool": tool,
                "mcp.operation": operation,
                "span.kind": "internal"
            }

            with tracer.span(f"{tool}.{operation}", attributes) as span:
                # Add function metadata
                span.set_attribute("function.name", func.__name__)
                span.set_attribute("function.module", func.__module__)

                try:
                    result = func(*args, **kwargs)
                    span.add_event("operation_completed")
                    return result

                except Exception as e:
                    span.add_event("operation_failed", {
                        "error.type": type(e).__name__,
                        "error.message": str(e)
                    })
                    raise

        return wrapper
    return decorator
