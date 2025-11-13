# Prompt Optimizer Configuration Quick Reference

## Production Configuration Checklist

### Essential Settings (Must Configure)

```json
{
  "quality": {
    "threshold": 8.5,           // ✅ Set to 8.5+ for production
    "maxRetries": 3             // ✅ 3 retries for reliability
  },
  "caching": {
    "enabled": true,            // ✅ Enable caching
    "ttl": 7200,                // ✅ 2-hour cache (7200s)
    "maxEntries": 10000         // ✅ 10k entries for production
  },
  "monitoring": {
    "enabled": true,            // ✅ Required for production
    "alertOnFailures": true     // ✅ Enable alerts
  },
  "performance": {
    "maxProcessingTime": 3000,  // ✅ 3-second timeout
    "timeoutAction": "passthrough", // ✅ Graceful degradation
    "circuitBreaker": {
      "enabled": true           // ✅ Enable circuit breaker
    }
  }
}
```

## Configuration Tiers

### Tier 1: Development (Permissive)

```json
{
  "quality": { "threshold": 7.0 },
  "caching": { "ttl": 1800, "maxEntries": 1000 },
  "logging": { "level": "verbose", "destination": "console" },
  "monitoring": { "alertOnFailures": false },
  "bypass": { "enabled": true }
}
```

**Use Case**: Local development, testing, debugging

### Tier 2: Staging (Balanced)

```json
{
  "quality": { "threshold": 8.0 },
  "caching": { "ttl": 3600, "maxEntries": 5000 },
  "logging": { "level": "info", "destination": "both" },
  "monitoring": { "alertOnFailures": true },
  "performance": { "circuitBreaker": { "enabled": true } }
}
```

**Use Case**: Pre-production testing, QA, performance testing

### Tier 3: Production (Strict)

```json
{
  "quality": { "threshold": 8.5 },
  "caching": { "ttl": 7200, "maxEntries": 10000 },
  "logging": { "level": "info", "destination": "file" },
  "monitoring": { "alertOnFailures": true },
  "performance": {
    "circuitBreaker": { "enabled": true },
    "throttling": { "enabled": true }
  },
  "security": {
    "sanitizeInput": true,
    "rateLimiting": { "enabled": true }
  }
}
```

**Use Case**: Production deployments, customer-facing systems

## Quick Settings Guide

### Quality Thresholds

| Threshold | Quality Level | Use Case |
|-----------|--------------|----------|
| 6.0-7.0   | Basic        | Development, testing |
| 7.0-8.0   | Good         | Staging, internal tools |
| 8.0-8.5   | High         | Production, standard quality |
| 8.5-9.0   | Premium      | Production, high quality |
| 9.0+      | Elite        | Critical systems, maximum quality |

**Recommendation**: 8.5 for production

### Cache TTL (Time-to-Live)

| TTL (seconds) | Duration | Use Case |
|---------------|----------|----------|
| 300-900       | 5-15 min | Dynamic content, frequent updates |
| 1800-3600     | 30-60 min| Moderate update frequency |
| 3600-7200     | 1-2 hours| Stable prompts, production |
| 7200-14400    | 2-4 hours| Very stable prompts |
| 14400+        | 4+ hours | Static content |

**Recommendation**: 7200 (2 hours) for production

### Cache Entries

| Traffic (req/min) | Cache Entries | Memory (MB) |
|------------------|---------------|-------------|
| 10-50            | 1,000         | 50          |
| 50-100           | 2,000         | 100         |
| 100-500          | 5,000         | 250         |
| 500-1000         | 10,000        | 500         |
| 1000-5000        | 25,000        | 1,250       |
| 5000+            | 50,000        | 2,500       |

**Recommendation**: 10,000 for production (500-1000 req/min)

### Performance Timeouts

| Timeout (ms) | Latency | Use Case |
|--------------|---------|----------|
| 1000         | Low     | Fast responses, simple prompts |
| 2000-3000    | Medium  | Standard production (recommended) |
| 5000         | High    | Complex prompts, detailed optimization |
| 10000+       | Very High| Batch processing, non-critical |

**Recommendation**: 3000ms for production

### Concurrent Processing

| CPU Cores | Max Concurrent | Queue Size |
|-----------|----------------|------------|
| 2         | 10             | 30         |
| 4         | 25             | 75         |
| 8         | 50             | 200        |
| 16        | 100            | 400        |
| 32        | 200            | 800        |

**Formula**: maxConcurrent = cores × 6-8, queueSize = maxConcurrent × 4

**Recommendation**: 50 concurrent (8-core server)

## Configuration Patterns

### Pattern 1: High Performance

Focus: Maximum throughput, low latency

```json
{
  "quality": { "threshold": 8.0 },
  "caching": {
    "enabled": true,
    "ttl": 7200,
    "maxEntries": 25000,
    "compressionEnabled": true
  },
  "performance": {
    "maxProcessingTime": 2000,
    "parallelOptimization": true,
    "batchOptimization": { "enabled": true, "batchSize": 20 },
    "throttling": { "maxConcurrent": 100 }
  }
}
```

### Pattern 2: High Quality

Focus: Maximum optimization quality

```json
{
  "quality": {
    "threshold": 9.0,
    "blockBelowThreshold": false,
    "autoRetryOnFailure": true,
    "maxRetries": 5
  },
  "performance": {
    "maxProcessingTime": 5000,
    "timeoutAction": "retry"
  },
  "requestTypes": {
    "technical": { "minQualityScore": 9.5 },
    "complex": { "minQualityScore": 9.5 }
  }
}
```

### Pattern 3: High Reliability

Focus: Maximum uptime, fault tolerance

```json
{
  "performance": {
    "timeoutAction": "passthrough",
    "circuitBreaker": {
      "enabled": true,
      "threshold": 0.4,
      "resetTimeout": 15000
    },
    "throttling": { "enabled": true }
  },
  "emergency": {
    "autoRecovery": true,
    "fallbackMode": "passthrough"
  },
  "monitoring": {
    "enabled": true,
    "alertOnFailures": true
  }
}
```

### Pattern 4: High Security

Focus: Maximum security, compliance

```json
{
  "security": {
    "sanitizeInput": true,
    "maxPromptLength": 25000,
    "rejectMaliciousPatterns": true,
    "rateLimiting": {
      "enabled": true,
      "maxRequestsPerMinute": 50,
      "maxRequestsPerHour": 2000
    }
  },
  "bypass": {
    "enabled": true,
    "requireAuthentication": true,
    "logBypassAttempts": true,
    "maxBypassRate": 0.05
  },
  "compliance": {
    "auditLogging": { "enabled": true, "logAllRequests": true }
  }
}
```

## Bypass Prefixes

### Standard Prefixes

| Prefix | Description | Use Case |
|--------|-------------|----------|
| `@raw:` | Pass through without modification | Debugging, testing |
| `@skip:` | Skip optimization entirely | Emergency, maintenance |
| `@direct:` | Direct passthrough with logging | Troubleshooting |
| `@noopt:` | Disable optimization | Special cases |
| `@passthrough:` | Bypass with full logging | Auditing |

### Usage Examples

```typescript
// Skip optimization for specific prompt
const result = await optimizer.intercept('@raw:exact prompt text');

// Emergency bypass during incident
const result = await optimizer.intercept('@skip:critical request');

// Debugging with full logs
const result = await optimizer.intercept('@passthrough:debug this');
```

## Monitoring Thresholds

### Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| P50 Latency | <50ms | >100ms |
| P95 Latency | <200ms | >400ms |
| P99 Latency | <500ms | >1000ms |
| Success Rate | >95% | <90% |
| Error Rate | <5% | >10% |
| Cache Hit Rate | >60% | <40% |

### Alert Configuration

```json
{
  "monitoring": {
    "performanceThresholds": {
      "p50": 50,
      "p95": 200,
      "p99": 500
    },
    "alerting": {
      "enabled": true,
      "thresholds": {
        "errorRate": 0.05,      // Alert at 5% errors
        "successRate": 0.95,    // Alert below 95% success
        "avgProcessingTime": 1000  // Alert above 1000ms avg
      }
    }
  }
}
```

## Environment Variables

### Configuration Loading

```bash
# Set environment
export NODE_ENV=production

# Set config path
export OPTIMIZER_CONFIG_PATH=/path/to/production.json

# Enable verbose logging
export OPTIMIZER_LOG_LEVEL=verbose

# Override cache TTL
export OPTIMIZER_CACHE_TTL=3600
```

### Environment-Based Loading

```typescript
const configPath = process.env.OPTIMIZER_CONFIG_PATH ||
  (process.env.NODE_ENV === 'production'
    ? './config/production.json'
    : './config/automation-rules.json');
```

## Common Adjustments

### Increase Throughput

1. ✅ Enable caching: `caching.enabled = true`
2. ✅ Increase cache size: `caching.maxEntries = 25000`
3. ✅ Enable batching: `performance.batchOptimization.enabled = true`
4. ✅ Increase concurrency: `performance.throttling.maxConcurrent = 100`
5. ✅ Enable compression: `caching.compressionEnabled = true`

### Reduce Latency

1. ✅ Decrease timeout: `performance.maxProcessingTime = 2000`
2. ✅ Increase cache TTL: `caching.ttl = 14400`
3. ✅ Enable parallel processing: `performance.parallelOptimization = true`
4. ✅ Optimize thresholds: `quality.threshold = 8.0`

### Improve Quality

1. ✅ Increase threshold: `quality.threshold = 9.0`
2. ✅ Enable retries: `quality.autoRetryOnFailure = true`
3. ✅ Increase retry count: `quality.maxRetries = 5`
4. ✅ Set type-specific thresholds: `requestTypes.technical.minQualityScore = 9.5`

### Reduce Memory Usage

1. ✅ Decrease cache size: `caching.maxEntries = 5000`
2. ✅ Enable compression: `caching.compressionEnabled = true`
3. ✅ Reduce TTL: `caching.ttl = 3600`
4. ✅ Increase prune frequency: `caching.pruneInterval = 1800`

## Validation Commands

```bash
# Validate configuration
npm run validate-config

# Validate specific file
npm run validate-config -- ./config/production.json

# Test configuration loading
node -e "require('./config/production.json')"

# Check JSON syntax
python3 -m json.tool config/production.json
```

## Deployment Checklist

### Pre-Deployment

- [ ] Validate configuration: `npm run validate-config`
- [ ] Review quality thresholds (8.5+ recommended)
- [ ] Configure caching (10k entries, 2-hour TTL)
- [ ] Enable monitoring and alerting
- [ ] Set up circuit breaker
- [ ] Enable throttling
- [ ] Configure security settings
- [ ] Test bypass mechanisms
- [ ] Set appropriate log level (info/warn)
- [ ] Configure log rotation

### Post-Deployment

- [ ] Verify monitoring metrics
- [ ] Check cache hit rate (>60%)
- [ ] Monitor P99 latency (<500ms)
- [ ] Review error rate (<5%)
- [ ] Test alert delivery
- [ ] Verify bypass functionality
- [ ] Monitor memory usage
- [ ] Review performance thresholds
- [ ] Check circuit breaker operation
- [ ] Validate log output

## Support Resources

- **Full Documentation**: `/docs/PRODUCTION_CONFIG_GUIDE.md`
- **Validation Guide**: `/docs/CONFIG_VALIDATION.md`
- **Automation Guide**: `/docs/AUTOMATION_GUIDE.md`
- **Configuration Schema**: `/src/prompt-optimizer/automation/config.ts`
- **Production Config**: `/src/prompt-optimizer/config/production.json`

## Configuration Version

- **Current Version**: 2.0.0
- **Environment**: Production
- **Last Updated**: 2025-10-23
- **Recommended For**: Production deployments, high-traffic systems
