# MCP Monitoring & Metrics

Comprehensive monitoring and observability for MCP servers with Prometheus metrics, structured logging, and distributed tracing.

## Features

- **Prometheus Metrics**
  - Request rate, latency, and error tracking
  - Agent and task monitoring
  - Memory and system metrics
  - Authentication metrics
  - Neural processing metrics

- **Structured Logging**
  - JSON-formatted logs
  - Context propagation
  - Request/session tracking
  - Integration with log aggregation systems

- **Distributed Tracing**
  - OpenTelemetry-compatible tracing
  - Span context propagation
  - Multiple export formats (Jaeger, Zipkin)
  - Performance analysis

- **Grafana Dashboards**
  - Pre-configured visualizations
  - Real-time monitoring
  - Alert integration

- **Prometheus Alerts**
  - Predefined alert rules
  - Multiple severity levels
  - Comprehensive coverage

## Quick Start

### 1. Metrics Collection

```python
from mcp.monitoring.metrics import get_metrics_collector, track_request_metrics

# Get metrics collector
collector = get_metrics_collector()

# Manually track metrics
collector.get_metric("mcp_requests_total").inc(
    tool="swarm.init",
    operation="execute",
    status="success"
)

# Or use decorator for automatic tracking
@track_request_metrics(tool="swarm.init", operation="execute")
def handle_swarm_init(request):
    # Your handler code
    return {"status": "success"}
```

### 2. Structured Logging

```python
from mcp.monitoring.logger import setup_logger, set_request_context

# Setup logger
logger = setup_logger(
    name="mcp",
    level=logging.INFO,
    log_file="/var/log/mcp/server.log",
    json_format=True
)

# Set request context
set_request_context(
    request_id="req-123",
    user_id="user-456",
    session_id="sess-789"
)

# Log with context
logger.info("Processing request", extra_fields={
    "tool": "swarm.init",
    "operation": "execute"
})
```

### 3. Distributed Tracing

```python
from mcp.monitoring.tracer import get_tracer, trace_mcp_tool

# Get tracer
tracer = get_tracer()

# Manual tracing
with tracer.span("database_query") as span:
    span.set_attribute("query_type", "select")
    result = execute_query()
    span.add_event("query_completed")

# Or use decorator
@trace_mcp_tool(tool="swarm", operation="init")
def handle_swarm_init(request):
    # Your handler code
    return {"status": "success"}
```

## Prometheus Setup

### Install Prometheus

```bash
# Download Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-2.45.0.linux-amd64.tar.gz
cd prometheus-2.45.0.linux-amd64
```

### Configure Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - localhost:9093

# Load alert rules
rule_files:
  - "/path/to/mcp/monitoring/alerts.yml"

# Scrape configurations
scrape_configs:
  - job_name: "mcp-server"
    static_configs:
      - targets: ["localhost:8080"]
    metrics_path: "/metrics"
```

### Start Prometheus

```bash
./prometheus --config.file=prometheus.yml
```

Access Prometheus UI at http://localhost:9090

### Expose Metrics Endpoint

Add metrics endpoint to your MCP server:

```python
from flask import Flask, Response
from mcp.monitoring.metrics import get_metrics_collector

app = Flask(__name__)

@app.route('/metrics')
def metrics():
    collector = get_metrics_collector()
    prometheus_data = collector.export_prometheus()
    return Response(prometheus_data, mimetype='text/plain')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Grafana Setup

### Install Grafana

```bash
# Debian/Ubuntu
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt-get update
sudo apt-get install grafana

# Start Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

Access Grafana at http://localhost:3000 (default: admin/admin)

### Add Prometheus Data Source

1. Go to Configuration > Data Sources
2. Click "Add data source"
3. Select "Prometheus"
4. Set URL: http://localhost:9090
5. Click "Save & Test"

### Import Dashboard

1. Go to Dashboards > Import
2. Upload `/home/deflex/noa-server/mcp/monitoring/dashboard.json`
3. Select Prometheus data source
4. Click "Import"

## Logging Setup

### Basic Configuration

```python
from mcp.monitoring.logger import setup_logger

# JSON logging for production
logger = setup_logger(
    name="mcp",
    level=logging.INFO,
    log_file="/var/log/mcp/server.log",
    json_format=True
)

# Plain text for development
dev_logger = setup_logger(
    name="mcp.dev",
    level=logging.DEBUG,
    json_format=False
)
```

### Log Aggregation Integration

#### ELK Stack (Elasticsearch, Logstash, Kibana)

Logstash configuration:

```ruby
input {
  file {
    path => "/var/log/mcp/server.log"
    codec => json
  }
}

filter {
  if [mcp_event] {
    mutate {
      add_tag => ["mcp"]
    }
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "mcp-logs-%{+YYYY.MM.dd}"
  }
}
```

#### Fluentd

Fluentd configuration:

```xml
<source>
  @type tail
  path /var/log/mcp/server.log
  pos_file /var/log/td-agent/mcp.pos
  tag mcp.server
  <parse>
    @type json
  </parse>
</source>

<match mcp.**>
  @type elasticsearch
  host localhost
  port 9200
  index_name mcp-logs
  type_name log
</match>
```

## Tracing Setup

### Export to Jaeger

```python
from mcp.monitoring.tracer import get_tracer
import requests

tracer = get_tracer()

# Get trace data
trace_data = tracer.export_jaeger("trace-id-here")

# Send to Jaeger
requests.post(
    "http://localhost:14268/api/traces",
    json=trace_data
)
```

### Jaeger Installation

```bash
# Docker
docker run -d --name jaeger \
  -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
  -p 5775:5775/udp \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 14268:14268 \
  -p 14250:14250 \
  -p 9411:9411 \
  jaegertracing/all-in-one:latest
```

Access Jaeger UI at http://localhost:16686

## Metrics Reference

### Request Metrics

- `mcp_requests_total` - Total requests (counter)
  - Labels: `tool`, `operation`, `status`

- `mcp_request_duration_seconds` - Request duration (histogram)
  - Labels: `tool`, `operation`

- `mcp_request_errors_total` - Total errors (counter)
  - Labels: `tool`, `operation`, `error_type`

### Agent Metrics

- `mcp_agents_active` - Active agents (gauge)
  - Labels: `type`, `status`

- `mcp_agents_spawned_total` - Total agents spawned (counter)
  - Labels: `type`

- `mcp_agents_failed_total` - Failed agents (counter)
  - Labels: `type`, `reason`

### Task Metrics

- `mcp_tasks_pending` - Pending tasks (gauge)
  - Labels: `priority`

- `mcp_tasks_running` - Running tasks (gauge)

- `mcp_task_duration_seconds` - Task duration (histogram)
  - Labels: `task_type`, `status`

### Memory Metrics

- `mcp_memory_usage_bytes` - Memory usage (gauge)
  - Labels: `type`

- `mcp_memory_operations_total` - Memory operations (counter)
  - Labels: `operation`, `status`

### Neural Metrics

- `mcp_neural_inference_duration_seconds` - Inference duration (histogram)
  - Labels: `model`, `operation`

- `mcp_neural_tokens_processed_total` - Tokens processed (counter)
  - Labels: `model`, `direction`

### System Metrics

- `mcp_system_cpu_usage_percent` - CPU usage (gauge)

- `mcp_system_memory_usage_percent` - Memory usage (gauge)

### Authentication Metrics

- `mcp_auth_attempts_total` - Authentication attempts (counter)
  - Labels: `method`, `status`

- `mcp_auth_rate_limit_exceeded_total` - Rate limit violations (counter)
  - Labels: `user_id`

## Alert Rules

### Severity Levels

- **Critical**: Immediate action required
- **Warning**: Attention needed
- **Info**: Informational only

### Key Alerts

1. **HighErrorRate**: Error rate > 5% for 2 minutes
2. **CriticalErrorRate**: Error rate > 15% for 1 minute
3. **HighRequestLatency**: P95 latency > 5s for 3 minutes
4. **HighAgentFailureRate**: Agent failure rate > 20% for 2 minutes
5. **HighTaskQueueDepth**: > 50 pending tasks for 5 minutes
6. **HighMemoryUsage**: Memory usage > 85% for 3 minutes
7. **HighCPUUsage**: CPU usage > 85% for 5 minutes
8. **PossibleBruteForceAttack**: > 10 failed auth attempts/sec

## Performance Optimization

### Metrics

- Use appropriate metric types (counter, gauge, histogram)
- Limit cardinality of labels
- Use sampling for high-volume metrics
- Export metrics periodically, not per-request

### Logging

- Use structured logging (JSON) in production
- Set appropriate log levels (INFO in production, DEBUG in dev)
- Rotate log files to prevent disk space issues
- Use asynchronous logging for high-throughput

### Tracing

- Use sampling to reduce overhead (default: 100%)
- Export traces in batches
- Use separate storage for traces
- Set appropriate retention policies

## Troubleshooting

### High Memory Usage

1. Check `mcp_memory_usage_bytes` metric
2. Review memory operations in logs
3. Check for memory leaks using heap dumps
4. Adjust memory limits

### High Error Rate

1. Check `mcp_request_errors_total` by error type
2. Review error logs for patterns
3. Check authentication failures
4. Verify downstream dependencies

### Slow Requests

1. Check `mcp_request_duration_seconds` histogram
2. Review distributed traces for bottlenecks
3. Check database query performance
4. Verify network latency

### Agent Failures

1. Check `mcp_agents_failed_total` by type and reason
2. Review agent logs for errors
3. Check resource availability (CPU, memory)
4. Verify agent configuration

## Best Practices

1. **Always monitor in production**
   - Enable metrics collection
   - Configure alerts
   - Review dashboards regularly

2. **Use structured logging**
   - JSON format for production
   - Include context (request ID, user ID)
   - Log at appropriate levels

3. **Implement distributed tracing**
   - Trace critical paths
   - Use sampling in production
   - Export to dedicated storage

4. **Set up alerts**
   - Monitor key metrics
   - Configure appropriate thresholds
   - Test alert notifications

5. **Regular maintenance**
   - Review and update alert rules
   - Rotate and archive logs
   - Clean up old traces
   - Update dashboards

## Integration Example

Complete monitoring setup:

```python
from mcp.monitoring.metrics import get_metrics_collector, track_request_metrics
from mcp.monitoring.logger import setup_logger, set_request_context, log_mcp_operation
from mcp.monitoring.tracer import get_tracer, trace_mcp_tool

# Setup
logger = setup_logger("mcp", level=logging.INFO, json_format=True)
tracer = get_tracer()
collector = get_metrics_collector()

@track_request_metrics(tool="swarm", operation="init")
@trace_mcp_tool(tool="swarm", operation="init")
def handle_swarm_init(request):
    # Set request context
    set_request_context(
        request_id=request["id"],
        user_id=request["user_id"]
    )

    # Log operation start
    logger.info("Starting swarm initialization")

    try:
        # Business logic with tracing
        with tracer.span("validate_config") as span:
            validate_config(request["config"])
            span.set_attribute("config_valid", True)

        with tracer.span("create_swarm") as span:
            swarm = create_swarm(request["config"])
            span.set_attribute("swarm_id", swarm["id"])

        # Log success
        log_mcp_operation(
            logger,
            operation="init",
            tool="swarm",
            status="success",
            duration=time.time() - start_time
        )

        return {"status": "success", "swarm_id": swarm["id"]}

    except Exception as e:
        # Log error
        logger.error(f"Swarm initialization failed: {e}", exc_info=True)
        raise
```

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/deflex/noa-server/issues
- Documentation: https://docs.noa-server.io/mcp/monitoring
