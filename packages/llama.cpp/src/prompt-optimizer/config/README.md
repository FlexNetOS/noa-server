# Prompt Optimizer Configuration

## Configuration Files

### Production Configuration
- **File**: `production.json`
- **Purpose**: Optimized settings for production deployments
- **Environment**: Production, high-traffic systems
- **Quality Threshold**: 8.5
- **Cache Size**: 10,000 entries
- **Cache TTL**: 7,200 seconds (2 hours)

### Development Configuration
- **File**: `automation-rules.json`
- **Purpose**: Default settings for development
- **Environment**: Development, testing, local
- **Quality Threshold**: 7.0
- **Cache Size**: 1,000 entries
- **Cache TTL**: 3,600 seconds (1 hour)

## Quick Start

### Load Production Configuration

```typescript
import { AutomationConfigLoader } from '../automation/config';

// Load production config
const configPath = './src/prompt-optimizer/config/production.json';
const config = new AutomationConfigLoader(configPath);

// Get configuration
const settings = config.getConfig();
console.log('Quality Threshold:', settings.quality.threshold);
```

### Environment-Based Loading

```typescript
const configPath = process.env.NODE_ENV === 'production'
  ? './config/production.json'
  : './config/automation-rules.json';

const config = new AutomationConfigLoader(configPath);
```

## Configuration Validation

### Validate Configuration

```bash
# Validate production config
npm run validate-config

# Validate specific file
npm run validate-config -- ./src/prompt-optimizer/config/production.json

# Or use Node directly
node ./src/prompt-optimizer/config/validate-config.js production.json
```

### Programmatic Validation

```typescript
import { ConfigValidator } from './validate-config';

const result = ConfigValidator.validateConfig('./production.json');

if (!result.valid) {
  console.error('Configuration errors:', result.errors);
  process.exit(1);
}

console.log('Configuration is valid ✅');
```

## Key Configuration Sections

### 1. Quality Settings
Controls optimization quality thresholds and retry logic.

```json
{
  "quality": {
    "threshold": 8.5,
    "blockBelowThreshold": false,
    "autoRetryOnFailure": true,
    "maxRetries": 3
  }
}
```

### 2. Caching Configuration
Optimizes performance through intelligent caching.

```json
{
  "caching": {
    "enabled": true,
    "ttl": 7200,
    "maxEntries": 10000,
    "strategy": "lru",
    "compressionEnabled": true
  }
}
```

### 3. Performance Tuning
Configures timeouts, throttling, and circuit breakers.

```json
{
  "performance": {
    "maxProcessingTime": 3000,
    "timeoutAction": "passthrough",
    "parallelOptimization": true,
    "circuitBreaker": {
      "enabled": true,
      "threshold": 0.5
    }
  }
}
```

### 4. Monitoring & Alerting
Enables metrics tracking and alerting.

```json
{
  "monitoring": {
    "enabled": true,
    "trackMetrics": true,
    "alertOnFailures": true,
    "performanceThresholds": {
      "p50": 50,
      "p95": 200,
      "p99": 500
    }
  }
}
```

### 5. Security Settings
Configures input sanitization and rate limiting.

```json
{
  "security": {
    "sanitizeInput": true,
    "maxPromptLength": 50000,
    "rejectMaliciousPatterns": true,
    "rateLimiting": {
      "enabled": true,
      "maxRequestsPerMinute": 100
    }
  }
}
```

## Configuration Comparison

| Setting | Development | Production |
|---------|-------------|------------|
| Quality Threshold | 7.0 | 8.5 |
| Cache TTL | 3600s (1h) | 7200s (2h) |
| Cache Entries | 1,000 | 10,000 |
| Max Processing Time | 5000ms | 3000ms |
| Timeout Action | passthrough | passthrough |
| Circuit Breaker | disabled | enabled |
| Throttling | disabled | enabled |
| Monitoring Alerts | disabled | enabled |
| Log Level | info | info |
| Log Destination | console | file |

## Bypass Mechanisms

### Bypass Prefixes
Use these prefixes to skip optimization when needed:

- `@raw:` - Pass through without modification
- `@skip:` - Skip optimization entirely
- `@direct:` - Direct passthrough
- `@noopt:` - Disable optimization
- `@passthrough:` - Bypass with logging

### Usage Example

```typescript
// Skip optimization for debugging
const result = await optimizer.intercept('@raw:exact prompt text');
console.log('Bypassed:', result.bypassed); // true
```

## Request Type Configuration

Fine-tune optimization for different request types:

- **creative**: Creative writing (threshold: 8.0)
- **technical**: Code generation (threshold: 9.0)
- **educational**: Learning materials (threshold: 8.5)
- **complex**: Multi-step reasoning (threshold: 9.0)
- **hybrid**: Mixed-purpose (threshold: 8.5)

## Production Deployment

### Pre-Deployment Checklist

1. ✅ Validate configuration: `npm run validate-config`
2. ✅ Review quality thresholds (8.5+ recommended)
3. ✅ Configure caching (10k entries, 2h TTL)
4. ✅ Enable monitoring and alerting
5. ✅ Set up circuit breaker
6. ✅ Enable throttling
7. ✅ Configure security settings
8. ✅ Test bypass mechanisms
9. ✅ Set appropriate log level
10. ✅ Configure log rotation

### Post-Deployment Verification

1. ✅ Verify monitoring metrics
2. ✅ Check cache hit rate (target: >60%)
3. ✅ Monitor P99 latency (target: <500ms)
4. ✅ Review error rate (target: <5%)
5. ✅ Test alert delivery
6. ✅ Verify bypass functionality

## Performance Targets

### Production Metrics

- **Throughput**: 100-200 optimizations/second (8-core CPU)
- **Latency (P50)**: 30-50ms
- **Latency (P95)**: 150-200ms
- **Latency (P99)**: 400-500ms
- **Cache Hit Rate**: 60-80%
- **Success Rate**: >95%
- **Error Rate**: <5%

### Resource Usage

- **Memory**: 200-500MB (10k cache entries)
- **CPU**: 20-40% (idle), 60-80% (peak)
- **Disk**: 50-100MB (logs, cache persistence)

## Configuration Updates

### Runtime Updates

```typescript
import { automationConfig } from '../automation/config';

// Update configuration at runtime
automationConfig.updateConfig({
  quality: {
    threshold: 9.0
  },
  caching: {
    maxEntries: 15000
  }
});

// Reload from file
automationConfig.reloadConfig();
```

### Emergency Override

```typescript
// Enable emergency bypass (all prompts pass through)
automationConfig.setEmergencyOverride(true, 'emergency-key-123');

// Disable emergency override
automationConfig.setEmergencyOverride(false);
```

## Documentation

### Comprehensive Guides

1. **Production Configuration Guide**: `/docs/PRODUCTION_CONFIG_GUIDE.md`
   - Complete parameter documentation
   - Performance tuning guidelines
   - Security hardening
   - Troubleshooting

2. **Configuration Validation Guide**: `/docs/CONFIG_VALIDATION.md`
   - Validation process
   - Error resolution
   - CI/CD integration
   - Best practices

3. **Quick Reference Guide**: `/docs/CONFIG_QUICK_REFERENCE.md`
   - Configuration tiers
   - Quick settings guide
   - Common patterns
   - Deployment checklist

4. **Automation Guide**: `/docs/AUTOMATION_GUIDE.md`
   - Usage examples
   - Integration patterns
   - Monitoring setup
   - Performance optimization

## Support

### Configuration Issues

1. Validate configuration: `npm run validate-config`
2. Review validation report
3. Check documentation
4. Consult configuration schema: `../automation/config.ts`

### Performance Issues

1. Check cache hit rate (target: >60%)
2. Review P99 latency (target: <500ms)
3. Monitor error rate (target: <5%)
4. Adjust throttling and concurrency limits
5. Optimize cache size and TTL

### Security Concerns

1. Enable input sanitization
2. Configure rate limiting
3. Set maximum prompt length
4. Enable malicious pattern rejection
5. Require authentication for bypass
6. Enable audit logging

## Files in this Directory

```
config/
├── README.md                    # This file
├── production.json              # Production configuration (v2.0.0)
├── automation-rules.json        # Development configuration (v1.0.0)
└── validate-config.ts           # Configuration validator
```

## Version Information

- **Production Config Version**: 2.0.0
- **Development Config Version**: 1.0.0
- **Schema Version**: 2.0.0
- **Last Updated**: 2025-10-23

## License

Part of the Prompt Optimizer system. See project LICENSE for details.
