"""
MCP Metrics Collection

Provides Prometheus-compatible metrics collection for MCP servers.
"""

import time
import logging
from typing import Dict, Any, Optional, List, Callable
from functools import wraps
from collections import defaultdict
from datetime import datetime
import threading

logger = logging.getLogger(__name__)


class Counter:
    """Thread-safe counter metric"""

    def __init__(self, name: str, description: str, labels: Optional[List[str]] = None):
        self.name = name
        self.description = description
        self.labels = labels or []
        self._values: Dict[tuple, float] = defaultdict(float)
        self._lock = threading.Lock()

    def inc(self, value: float = 1.0, **label_values):
        """Increment counter"""
        label_tuple = self._make_label_tuple(label_values)
        with self._lock:
            self._values[label_tuple] += value

    def get(self, **label_values) -> float:
        """Get current value"""
        label_tuple = self._make_label_tuple(label_values)
        with self._lock:
            return self._values[label_tuple]

    def _make_label_tuple(self, label_values: Dict[str, str]) -> tuple:
        """Create label tuple for indexing"""
        return tuple(label_values.get(label, "") for label in self.labels)

    def to_prometheus(self) -> str:
        """Export in Prometheus format"""
        lines = [
            f"# HELP {self.name} {self.description}",
            f"# TYPE {self.name} counter"
        ]

        with self._lock:
            for label_tuple, value in self._values.items():
                if self.labels:
                    label_str = ",".join(
                        f'{label}="{val}"'
                        for label, val in zip(self.labels, label_tuple)
                    )
                    lines.append(f"{self.name}{{{label_str}}} {value}")
                else:
                    lines.append(f"{self.name} {value}")

        return "\n".join(lines)


class Gauge:
    """Thread-safe gauge metric"""

    def __init__(self, name: str, description: str, labels: Optional[List[str]] = None):
        self.name = name
        self.description = description
        self.labels = labels or []
        self._values: Dict[tuple, float] = defaultdict(float)
        self._lock = threading.Lock()

    def set(self, value: float, **label_values):
        """Set gauge value"""
        label_tuple = self._make_label_tuple(label_values)
        with self._lock:
            self._values[label_tuple] = value

    def inc(self, value: float = 1.0, **label_values):
        """Increment gauge"""
        label_tuple = self._make_label_tuple(label_values)
        with self._lock:
            self._values[label_tuple] += value

    def dec(self, value: float = 1.0, **label_values):
        """Decrement gauge"""
        label_tuple = self._make_label_tuple(label_values)
        with self._lock:
            self._values[label_tuple] -= value

    def get(self, **label_values) -> float:
        """Get current value"""
        label_tuple = self._make_label_tuple(label_values)
        with self._lock:
            return self._values[label_tuple]

    def _make_label_tuple(self, label_values: Dict[str, str]) -> tuple:
        """Create label tuple for indexing"""
        return tuple(label_values.get(label, "") for label in self.labels)

    def to_prometheus(self) -> str:
        """Export in Prometheus format"""
        lines = [
            f"# HELP {self.name} {self.description}",
            f"# TYPE {self.name} gauge"
        ]

        with self._lock:
            for label_tuple, value in self._values.items():
                if self.labels:
                    label_str = ",".join(
                        f'{label}="{val}"'
                        for label, val in zip(self.labels, label_tuple)
                    )
                    lines.append(f"{self.name}{{{label_str}}} {value}")
                else:
                    lines.append(f"{self.name} {value}")

        return "\n".join(lines)


class Histogram:
    """Thread-safe histogram metric"""

    def __init__(
        self,
        name: str,
        description: str,
        labels: Optional[List[str]] = None,
        buckets: Optional[List[float]] = None
    ):
        self.name = name
        self.description = description
        self.labels = labels or []
        self.buckets = buckets or [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

        self._counts: Dict[tuple, Dict[float, int]] = defaultdict(
            lambda: {bucket: 0 for bucket in self.buckets + [float('inf')]}
        )
        self._sums: Dict[tuple, float] = defaultdict(float)
        self._lock = threading.Lock()

    def observe(self, value: float, **label_values):
        """Observe a value"""
        label_tuple = self._make_label_tuple(label_values)

        with self._lock:
            # Update sum
            self._sums[label_tuple] += value

            # Update bucket counts
            for bucket in self.buckets + [float('inf')]:
                if value <= bucket:
                    self._counts[label_tuple][bucket] += 1

    def get_count(self, **label_values) -> int:
        """Get total count"""
        label_tuple = self._make_label_tuple(label_values)
        with self._lock:
            return self._counts[label_tuple][float('inf')]

    def get_sum(self, **label_values) -> float:
        """Get sum of all observed values"""
        label_tuple = self._make_label_tuple(label_values)
        with self._lock:
            return self._sums[label_tuple]

    def _make_label_tuple(self, label_values: Dict[str, str]) -> tuple:
        """Create label tuple for indexing"""
        return tuple(label_values.get(label, "") for label in self.labels)

    def to_prometheus(self) -> str:
        """Export in Prometheus format"""
        lines = [
            f"# HELP {self.name} {self.description}",
            f"# TYPE {self.name} histogram"
        ]

        with self._lock:
            for label_tuple in self._counts.keys():
                label_base = ""
                if self.labels:
                    label_base = ",".join(
                        f'{label}="{val}"'
                        for label, val in zip(self.labels, label_tuple)
                    )

                # Bucket counts
                for bucket in self.buckets + [float('inf')]:
                    bucket_label = f'le="{bucket}"'
                    if label_base:
                        full_labels = f"{label_base},{bucket_label}"
                    else:
                        full_labels = bucket_label

                    count = self._counts[label_tuple][bucket]
                    lines.append(f"{self.name}_bucket{{{full_labels}}} {count}")

                # Sum and count
                if label_base:
                    lines.append(f"{self.name}_sum{{{label_base}}} {self._sums[label_tuple]}")
                    lines.append(f"{self.name}_count{{{label_base}}} {self._counts[label_tuple][float('inf')]}")
                else:
                    lines.append(f"{self.name}_sum {self._sums[label_tuple]}")
                    lines.append(f"{self.name}_count {self._counts[label_tuple][float('inf')]}")

        return "\n".join(lines)


class MetricsCollector:
    """
    Prometheus-compatible metrics collector for MCP

    Features:
    - Counter, Gauge, Histogram metrics
    - Label support for dimensions
    - Thread-safe operations
    - Prometheus exposition format
    - Automatic metric registration
    """

    def __init__(self):
        """Initialize metrics collector"""
        self.metrics: Dict[str, Any] = {}
        self._lock = threading.Lock()

        # Initialize standard MCP metrics
        self._init_standard_metrics()

        logger.info("MetricsCollector initialized")

    def _init_standard_metrics(self):
        """Initialize standard MCP metrics"""

        # Request metrics
        self.register_counter(
            "mcp_requests_total",
            "Total number of MCP requests",
            labels=["tool", "operation", "status"]
        )

        self.register_histogram(
            "mcp_request_duration_seconds",
            "MCP request duration in seconds",
            labels=["tool", "operation"]
        )

        self.register_counter(
            "mcp_request_errors_total",
            "Total number of MCP request errors",
            labels=["tool", "operation", "error_type"]
        )

        # Agent metrics
        self.register_gauge(
            "mcp_agents_active",
            "Number of active MCP agents",
            labels=["type", "status"]
        )

        self.register_counter(
            "mcp_agents_spawned_total",
            "Total number of agents spawned",
            labels=["type"]
        )

        self.register_counter(
            "mcp_agents_failed_total",
            "Total number of failed agents",
            labels=["type", "reason"]
        )

        # Task metrics
        self.register_gauge(
            "mcp_tasks_pending",
            "Number of pending tasks",
            labels=["priority"]
        )

        self.register_gauge(
            "mcp_tasks_running",
            "Number of running tasks",
            labels=[]
        )

        self.register_histogram(
            "mcp_task_duration_seconds",
            "Task execution duration in seconds",
            labels=["task_type", "status"]
        )

        # Memory metrics
        self.register_gauge(
            "mcp_memory_usage_bytes",
            "Memory usage in bytes",
            labels=["type"]
        )

        self.register_counter(
            "mcp_memory_operations_total",
            "Total number of memory operations",
            labels=["operation", "status"]
        )

        # Neural processing metrics
        self.register_histogram(
            "mcp_neural_inference_duration_seconds",
            "Neural inference duration in seconds",
            labels=["model", "operation"]
        )

        self.register_counter(
            "mcp_neural_tokens_processed_total",
            "Total number of tokens processed",
            labels=["model", "direction"]
        )

        # System metrics
        self.register_gauge(
            "mcp_system_cpu_usage_percent",
            "System CPU usage percentage",
            labels=[]
        )

        self.register_gauge(
            "mcp_system_memory_usage_percent",
            "System memory usage percentage",
            labels=[]
        )

        # Authentication metrics
        self.register_counter(
            "mcp_auth_attempts_total",
            "Total number of authentication attempts",
            labels=["method", "status"]
        )

        self.register_counter(
            "mcp_auth_rate_limit_exceeded_total",
            "Total number of rate limit violations",
            labels=["user_id"]
        )

    def register_counter(
        self,
        name: str,
        description: str,
        labels: Optional[List[str]] = None
    ) -> Counter:
        """Register a counter metric"""
        with self._lock:
            if name in self.metrics:
                return self.metrics[name]

            counter = Counter(name, description, labels)
            self.metrics[name] = counter
            logger.debug(f"Registered counter: {name}")
            return counter

    def register_gauge(
        self,
        name: str,
        description: str,
        labels: Optional[List[str]] = None
    ) -> Gauge:
        """Register a gauge metric"""
        with self._lock:
            if name in self.metrics:
                return self.metrics[name]

            gauge = Gauge(name, description, labels)
            self.metrics[name] = gauge
            logger.debug(f"Registered gauge: {name}")
            return gauge

    def register_histogram(
        self,
        name: str,
        description: str,
        labels: Optional[List[str]] = None,
        buckets: Optional[List[float]] = None
    ) -> Histogram:
        """Register a histogram metric"""
        with self._lock:
            if name in self.metrics:
                return self.metrics[name]

            histogram = Histogram(name, description, labels, buckets)
            self.metrics[name] = histogram
            logger.debug(f"Registered histogram: {name}")
            return histogram

    def get_metric(self, name: str) -> Optional[Any]:
        """Get metric by name"""
        with self._lock:
            return self.metrics.get(name)

    def export_prometheus(self) -> str:
        """
        Export all metrics in Prometheus format

        Returns:
            Prometheus exposition format string
        """
        lines = []

        with self._lock:
            for metric in self.metrics.values():
                lines.append(metric.to_prometheus())
                lines.append("")  # Empty line between metrics

        return "\n".join(lines)

    def export_json(self) -> Dict[str, Any]:
        """
        Export all metrics in JSON format

        Returns:
            Dictionary of metrics
        """
        result = {
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": {}
        }

        with self._lock:
            for name, metric in self.metrics.items():
                if isinstance(metric, Counter):
                    result["metrics"][name] = {
                        "type": "counter",
                        "description": metric.description,
                        "values": dict(metric._values)
                    }
                elif isinstance(metric, Gauge):
                    result["metrics"][name] = {
                        "type": "gauge",
                        "description": metric.description,
                        "values": dict(metric._values)
                    }
                elif isinstance(metric, Histogram):
                    result["metrics"][name] = {
                        "type": "histogram",
                        "description": metric.description,
                        "counts": dict(metric._counts),
                        "sums": dict(metric._sums)
                    }

        return result

    def reset_all(self):
        """Reset all metrics (use with caution)"""
        with self._lock:
            self.metrics.clear()
            self._init_standard_metrics()
        logger.warning("All metrics reset")


# Global metrics collector instance
_metrics_collector = MetricsCollector()


def get_metrics_collector() -> MetricsCollector:
    """Get global metrics collector instance"""
    return _metrics_collector


# Decorator for automatic metric tracking
def track_request_metrics(tool: str, operation: str):
    """
    Decorator to automatically track request metrics

    Args:
        tool: Tool name
        operation: Operation name
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            collector = get_metrics_collector()
            start_time = time.time()

            try:
                # Execute function
                result = func(*args, **kwargs)

                # Track success
                collector.get_metric("mcp_requests_total").inc(
                    tool=tool,
                    operation=operation,
                    status="success"
                )

                # Track duration
                duration = time.time() - start_time
                collector.get_metric("mcp_request_duration_seconds").observe(
                    duration,
                    tool=tool,
                    operation=operation
                )

                return result

            except Exception as e:
                # Track error
                collector.get_metric("mcp_requests_total").inc(
                    tool=tool,
                    operation=operation,
                    status="error"
                )

                collector.get_metric("mcp_request_errors_total").inc(
                    tool=tool,
                    operation=operation,
                    error_type=type(e).__name__
                )

                raise

        return wrapper
    return decorator
