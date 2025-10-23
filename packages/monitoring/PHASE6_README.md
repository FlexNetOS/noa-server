# Noa Server Phase 6: Monitoring Infrastructure

Comprehensive monitoring solution with metrics, tracing, and logging for the Noa Server platform.

## Packages

### [@noa/metrics](./metrics/README.md)
Application metrics collection and Prometheus integration.

- **Metrics Types**: Counters, Gauges, Histograms, Summaries
- **Specialized Collectors**: HTTP, Database, Cache, Queue metrics
- **Prometheus Export**: Built-in HTTP server for scraping
- **Custom Metrics**: Easy registration of application-specific metrics

### [@noa/tracing](./tracing/README.md)
Distributed tracing with OpenTelemetry, Jaeger, and Zipkin.

- **OpenTelemetry**: Industry-standard tracing implementation
- **Multiple Exporters**: Jaeger, Zipkin, OTLP, Console
- **Auto-Instrumentation**: HTTP, Express, Database, Queue
- **Context Propagation**: Trace requests across services

### [@noa/logging](./logging/README.md)
Structured logging with ELK stack integration.

- **Structured Logs**: JSON-formatted logs with metadata
- **Multiple Transports**: Console, File, Elasticsearch
- **ELK Integration**: Direct Elasticsearch/Logstash/Kibana support
- **Correlation IDs**: Track requests across services

## Quick Start

### 1. Install Packages

```bash
cd /home/deflex/noa-server/packages/monitoring/metrics && npm install
cd /home/deflex/noa-server/packages/monitoring/tracing && npm install
cd /home/deflex/noa-server/packages/monitoring/logging && npm install
```

### 2. Build Packages

```bash
cd /home/deflex/noa-server/packages/monitoring/metrics && npm run build
cd /home/deflex/noa-server/packages/monitoring/tracing && npm run build
cd /home/deflex/noa-server/packages/monitoring/logging && npm run build
```

### 3. Run Tests

```bash
cd /home/deflex/noa-server/packages/monitoring/metrics && npm test
cd /home/deflex/noa-server/packages/monitoring/tracing && npm test
cd /home/deflex/noa-server/packages/monitoring/logging && npm test
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Metrics  │  │ Tracing  │  │ Logging  │                   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
└───────┼─────────────┼─────────────┼─────────────────────────┘
        │             │             │
        ▼             ▼             ▼
┌──────────────────────────────────────────────────────────────┐
│                  Collection & Export Layer                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │Prometheus│  │  Jaeger  │  │ Zipkin   │  │   ELK    │    │
│  │ Exporter │  │ Exporter │  │ Exporter │  │Transport │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
└───────┼─────────────┼─────────────┼─────────────┼───────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌──────────────────────────────────────────────────────────────┐
│                   Storage & Visualization                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │Prometheus│  │  Jaeger  │  │ Zipkin   │  │Elastic-  │    │
│  │    +     │  │    UI    │  │    UI    │  │ search   │    │
│  │ Grafana  │  │          │  │          │  │    +     │    │
│  │          │  │          │  │          │  │  Kibana  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## Environment Variables

```bash
# Metrics
METRICS_PREFIX=myapp
METRICS_PORT=9090
METRICS_ENABLE_DEFAULT=true

# Tracing
TRACING_SERVICE_NAME=api-server
TRACING_EXPORTER_TYPE=jaeger
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Logging
LOG_LEVEL=info
LOG_SERVICE_NAME=api-server
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX=logs
```

## License

MIT
