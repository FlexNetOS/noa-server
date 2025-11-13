# Load Testing Framework

Comprehensive load testing infrastructure using K6 for performance validation
and stress testing.

## Overview

This load testing framework provides:

- **Multiple Test Scenarios**: Smoke, Load, Stress, Spike, Soak, and Breakpoint
  tests
- **Performance Metrics**: Response times, throughput, error rates
- **Detailed Reports**: JSON, HTML, and text summaries
- **Configurable Thresholds**: Pass/fail criteria for automated testing

## Prerequisites

### Installation

Install K6 on your system:

```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows (using Chocolatey)
choco install k6

# Docker
docker pull grafana/k6
```

## Test Scenarios

### 1. Smoke Test

Minimal load to verify basic functionality.

```bash
k6 run --env SCENARIO=smoke tests/load/scenarios.js
```

- **Duration**: 30 seconds
- **Virtual Users**: 1
- **Purpose**: Quick validation that API works

### 2. Average Load Test

Simulates normal expected usage patterns.

```bash
k6 run --env SCENARIO=average_load tests/load/scenarios.js
```

- **Duration**: 16 minutes
- **Virtual Users**: 0 → 10 → 20 → 0
- **Purpose**: Validate performance under typical load

### 3. Stress Test

Tests system behavior under high load.

```bash
k6 run --env SCENARIO=stress tests/load/scenarios.js
```

- **Duration**: 19 minutes
- **Virtual Users**: 0 → 20 → 50 → 100 → 150 → 0
- **Purpose**: Find performance degradation point

### 4. Spike Test

Tests sudden traffic increase handling.

```bash
k6 run --env SCENARIO=spike tests/load/scenarios.js
```

- **Duration**: 7 minutes
- **Virtual Users**: 10 → 200 (sudden) → 10 → 0
- **Purpose**: Validate autoscaling and recovery

### 5. Soak Test

Extended duration test to find memory leaks.

```bash
k6 run --env SCENARIO=soak tests/load/scenarios.js
```

- **Duration**: 1 hour
- **Virtual Users**: 30 (constant)
- **Purpose**: Identify memory leaks and degradation

### 6. Breakpoint Test

Gradually increases load to find breaking point.

```bash
k6 run --env SCENARIO=breakpoint tests/load/scenarios.js
```

- **Duration**: 22 minutes
- **Request Rate**: 10 → 50 → 100 → 200 → 400 → 800 req/s
- **Purpose**: Determine maximum capacity

## Running Tests

### Basic Usage

```bash
# Run default configuration
k6 run tests/load/k6-config.js

# Run API-specific tests
k6 run tests/load/api-load.js

# Run specific scenario
k6 run --env SCENARIO=stress tests/load/scenarios.js

# Custom base URL
k6 run --env BASE_URL=https://api.example.com tests/load/api-load.js
```

### Advanced Options

```bash
# Run with custom VUs and duration
k6 run --vus 50 --duration 5m tests/load/api-load.js

# Run with stages
k6 run --stage 2m:10,5m:20,2m:0 tests/load/api-load.js

# Output results to file
k6 run --out json=results.json tests/load/api-load.js

# Run in Docker
docker run -i grafana/k6 run - <tests/load/api-load.js
```

### Cloud Execution

```bash
# Run on K6 Cloud
k6 cloud tests/load/api-load.js

# Stream results to cloud
k6 run --out cloud tests/load/api-load.js
```

## Configuration

### Environment Variables

- `BASE_URL`: API base URL (default: `http://localhost:3000`)
- `SCENARIO`: Test scenario to run
- `VUS`: Number of virtual users
- `DURATION`: Test duration

### Thresholds

Configure pass/fail criteria:

```javascript
thresholds: {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],  // Response time
  http_req_failed: ['rate<0.01'],                   // Error rate < 1%
  checks: ['rate>0.95']                             // 95% checks pass
}
```

## Metrics

### HTTP Metrics

- `http_reqs`: Total HTTP requests
- `http_req_duration`: Request duration
- `http_req_waiting`: Time to first byte
- `http_req_connecting`: Connection time
- `http_req_blocked`: Time blocked before request
- `http_req_failed`: Failed request rate

### Custom Metrics

- `errors`: Custom error rate
- `successful_requests`: Successful request counter
- `api_duration`: API-specific duration trend

## Reports

### Report Locations

Reports are generated in `/home/deflex/noa-server/docs/reports/`:

- `load-test-[timestamp].json`: Raw metrics data
- `load-test-[timestamp].html`: Visual HTML report
- `load-test-[timestamp].txt`: Text summary

### Viewing Reports

```bash
# View JSON report
cat docs/reports/load-test-*.json | jq .

# Open HTML report
open docs/reports/load-test-*.html

# View text summary
cat docs/reports/load-test-*.txt
```

## Interpreting Results

### Response Times

- **p(50)**: Median response time
- **p(90)**: 90th percentile (10% slower)
- **p(95)**: 95th percentile (5% slower)
- **p(99)**: 99th percentile (1% slower)

### Target Performance

| Metric              | Target   |
| ------------------- | -------- |
| p(95) Response Time | < 500ms  |
| p(99) Response Time | < 1000ms |
| Error Rate          | < 1%     |
| Check Success Rate  | > 95%    |

### Identifying Issues

**High Response Times**:

- Database query optimization needed
- Insufficient server resources
- Network latency

**High Error Rates**:

- Server overload
- Resource exhaustion
- Rate limiting activated

**Degrading Performance**:

- Memory leaks
- Connection pool exhaustion
- Cache inefficiency

## Best Practices

### Test Strategy

1. **Start Small**: Run smoke tests first
2. **Incremental Load**: Gradually increase load
3. **Monitor Resources**: Watch CPU, memory, disk I/O
4. **Isolate Tests**: Run one scenario at a time
5. **Consistent Environment**: Use same test environment

### Pre-Test Checklist

- [ ] API is accessible and healthy
- [ ] Database is properly indexed
- [ ] Monitoring is enabled
- [ ] Baseline performance established
- [ ] Resource limits are known

### During Tests

- Monitor system resources (CPU, memory, network)
- Watch for error logs
- Track database connection pools
- Observe cache hit rates
- Monitor queue depths

### Post-Test Analysis

- Compare results to baselines
- Identify performance bottlenecks
- Document findings
- Create optimization tasks
- Update thresholds if needed

## Troubleshooting

### Common Issues

**K6 not installed**:

```bash
# Verify installation
k6 version

# Reinstall if needed
brew reinstall k6
```

**API not accessible**:

```bash
# Check API is running
curl http://localhost:3000/api/health

# Check BASE_URL is correct
k6 run --env BASE_URL=http://correct-url tests/load/api-load.js
```

**Tests failing thresholds**:

```bash
# Run with more lenient thresholds
k6 run --no-thresholds tests/load/api-load.js

# Adjust thresholds in test file
```

**Out of memory**:

```bash
# Reduce virtual users
k6 run --vus 10 tests/load/api-load.js

# Use smaller data sets
```

## Integration

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Load Tests
  run: |
    k6 run --quiet \
      --out json=results.json \
      tests/load/api-load.js

- name: Check Thresholds
  run: |
    if [ $? -ne 0 ]; then
      echo "Load tests failed thresholds"
      exit 1
    fi
```

### Monitoring Integration

```bash
# Export to InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 tests/load/api-load.js

# Export to Grafana Cloud
k6 run --out cloud tests/load/api-load.js
```

## Additional Resources

- [K6 Documentation](https://k6.io/docs/)
- [K6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Guides](https://k6.io/docs/testing-guides/)
- [K6 Community](https://community.k6.io/)

## Support

For issues or questions:

1. Check K6 documentation
2. Review test logs in `docs/reports/`
3. Open issue in project repository
4. Contact QA team

---

**Last Updated**: 2025-10-22 **Framework Version**: 1.0.0 **K6 Version**: Latest
