#!/usr/bin/env python3
"""
RTT v1.0.0 - Production Metrics Collection
Collect, aggregate, and export operational metrics.
"""
import time
import json
from pathlib import Path
from collections import defaultdict
from contextlib import contextmanager
from typing import Dict, List, Any, Optional
import threading


class MetricsCollector:
    """Collect and export RTT operational metrics."""

    def __init__(self, metrics_dir: str = ".rtt/metrics"):
        """
        Initialize metrics collector.

        Args:
            metrics_dir: Directory to store metrics files
        """
        self.metrics_dir = Path(metrics_dir)
        self.metrics_dir.mkdir(parents=True, exist_ok=True)

        self.counters: Dict[str, int] = defaultdict(int)
        self.timings: Dict[str, List[float]] = defaultdict(list)
        self.gauges: Dict[str, float] = {}
        self.metadata: Dict[str, Any] = {}

        # Thread safety
        self._lock = threading.Lock()

        # Track start time
        self.start_time = time.time()

    def increment(self, metric_name: str, value: int = 1, tags: Optional[Dict] = None):
        """
        Increment a counter metric.

        Args:
            metric_name: Name of the metric
            value: Amount to increment by
            tags: Optional tags for metric
        """
        with self._lock:
            key = self._make_key(metric_name, tags)
            self.counters[key] += value

    def record_timing(self, metric_name: str, duration: float, tags: Optional[Dict] = None):
        """
        Record a timing metric.

        Args:
            metric_name: Name of the metric
            duration: Duration in seconds
            tags: Optional tags for metric
        """
        with self._lock:
            key = self._make_key(metric_name, tags)
            self.timings[key].append(duration)

    def set_gauge(self, metric_name: str, value: float, tags: Optional[Dict] = None):
        """
        Set a gauge metric (point-in-time value).

        Args:
            metric_name: Name of the metric
            value: Current value
            tags: Optional tags for metric
        """
        with self._lock:
            key = self._make_key(metric_name, tags)
            self.gauges[key] = value

    def add_metadata(self, key: str, value: Any):
        """
        Add metadata to metrics export.

        Args:
            key: Metadata key
            value: Metadata value
        """
        with self._lock:
            self.metadata[key] = value

    def _make_key(self, metric_name: str, tags: Optional[Dict] = None) -> str:
        """Create metric key with optional tags."""
        if not tags:
            return metric_name
        tag_str = ",".join(f"{k}={v}" for k, v in sorted(tags.items()))
        return f"{metric_name}[{tag_str}]"

    def get_summary(self) -> Dict[str, Any]:
        """
        Get current metrics summary.

        Returns:
            Dictionary of all metrics
        """
        with self._lock:
            return {
                "timestamp": time.time(),
                "uptime_seconds": time.time() - self.start_time,
                "counters": dict(self.counters),
                "timings": {
                    k: self._timing_stats(v)
                    for k, v in self.timings.items()
                },
                "gauges": dict(self.gauges),
                "metadata": dict(self.metadata)
            }

    def _timing_stats(self, timings: List[float]) -> Dict[str, float]:
        """Calculate statistics for timing metrics."""
        if not timings:
            return {
                "count": 0,
                "min": 0.0,
                "max": 0.0,
                "avg": 0.0,
                "sum": 0.0,
                "p50": 0.0,
                "p95": 0.0,
                "p99": 0.0
            }

        sorted_timings = sorted(timings)
        count = len(sorted_timings)

        return {
            "count": count,
            "min": sorted_timings[0],
            "max": sorted_timings[-1],
            "avg": sum(sorted_timings) / count,
            "sum": sum(sorted_timings),
            "p50": sorted_timings[int(count * 0.50)],
            "p95": sorted_timings[int(count * 0.95)] if count > 1 else sorted_timings[0],
            "p99": sorted_timings[int(count * 0.99)] if count > 1 else sorted_timings[0]
        }

    def export(self, filename: Optional[str] = None) -> Path:
        """
        Export metrics to JSON file.

        Args:
            filename: Optional custom filename

        Returns:
            Path to exported metrics file
        """
        metrics = self.get_summary()

        if filename is None:
            timestamp = int(time.time())
            filename = f"metrics-{timestamp}.json"

        output_file = self.metrics_dir / filename
        with open(output_file, "w", encoding='utf-8') as f:
            json.dump(metrics, f, indent=2)

        return output_file

    def reset(self):
        """Reset all metrics (useful for testing)."""
        with self._lock:
            self.counters.clear()
            self.timings.clear()
            self.gauges.clear()
            self.start_time = time.time()

    def __str__(self) -> str:
        """String representation of current metrics."""
        summary = self.get_summary()
        return json.dumps(summary, indent=2)


# Global metrics instance
_global_metrics: Optional[MetricsCollector] = None


def get_metrics(metrics_dir: str = ".rtt/metrics") -> MetricsCollector:
    """
    Get or create global metrics collector.

    Args:
        metrics_dir: Directory for metrics

    Returns:
        Global MetricsCollector instance
    """
    global _global_metrics
    if _global_metrics is None:
        _global_metrics = MetricsCollector(metrics_dir)
    return _global_metrics


@contextmanager
def timed(metrics: MetricsCollector, metric_name: str, tags: Optional[Dict] = None):
    """
    Context manager for timing operations.

    Usage:
        metrics = get_metrics()
        with timed(metrics, "operation_duration"):
            # code to time
            pass

    Args:
        metrics: MetricsCollector instance
        metric_name: Name of the timing metric
        tags: Optional tags for the metric
    """
    start = time.time()
    try:
        yield
    finally:
        duration = time.time() - start
        metrics.record_timing(metric_name, duration, tags)


@contextmanager
def counted(metrics: MetricsCollector, metric_name: str, tags: Optional[Dict] = None):
    """
    Context manager that increments counter on success.

    Args:
        metrics: MetricsCollector instance
        metric_name: Name of the counter metric
        tags: Optional tags for the metric
    """
    try:
        yield
        metrics.increment(metric_name, 1, tags)
    except Exception:
        metrics.increment(f"{metric_name}_errors", 1, tags)
        raise


if __name__ == "__main__":
    # Test metrics collection
    metrics = get_metrics()

    # Test counters
    metrics.increment("test_counter", 5)
    metrics.increment("test_counter", 3)

    # Test timings
    with timed(metrics, "test_operation"):
        time.sleep(0.1)

    with timed(metrics, "fast_operation"):
        time.sleep(0.01)

    # Test gauges
    metrics.set_gauge("memory_usage_mb", 128.5)
    metrics.set_gauge("cpu_percent", 45.2)

    # Test metadata
    metrics.add_metadata("version", "1.0.0")
    metrics.add_metadata("hostname", "rtt-server")

    # Export
    output_file = metrics.export()
    print(f"Metrics exported to: {output_file}")
    print(f"\nMetrics summary:\n{metrics}")
