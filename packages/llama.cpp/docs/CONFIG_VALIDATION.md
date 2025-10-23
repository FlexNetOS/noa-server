# Configuration Validation Guide

## Overview

The Configuration Validator ensures that your Prompt Optimizer configuration is properly structured, secure, and optimized for your deployment environment.

## Usage

### Command Line Validation

```bash
# Validate production configuration
npm run validate-config

# Validate specific configuration file
npm run validate-config -- ./src/prompt-optimizer/config/production.json

# Or use Node directly
node src/prompt-optimizer/config/validate-config.js ./config/production.json
```

### Programmatic Validation

```typescript
import { ConfigValidator } from './src/prompt-optimizer/config/validate-config';

// Validate configuration file
const result = ConfigValidator.validateConfig('./config/production.json');

console.log('Valid:', result.valid);
console.log('Errors:', result.errors);
console.log('Warnings:', result.warnings);
console.log('Recommendations:', result.recommendations);

// Generate report
const report = ConfigValidator.generateReport(result);
console.log(report);
```

## Validation Categories

### 1. Structural Validation

Ensures all required configuration fields are present:

- `mandatory` - System-wide toggle
- `enabled` - Feature enablement
- `version` - Configuration version
- `quality` - Quality settings
- `bypass` - Bypass configuration
- `caching` - Cache settings
- `strategies` - Optimization strategies
- `integrations` - Integration settings
- `logging` - Logging configuration
- `monitoring` - Monitoring settings
- `performance` - Performance tuning
- `security` - Security settings

### 2. Quality Validation

Validates quality configuration:

- **threshold**: 1.0-10.0 (recommended: 8.5 for production)
- **maxRetries**: 1-5 retries
- **warningThreshold**: Must be < threshold
- **criticalThreshold**: Must be < warningThreshold

**Warnings:**
- Threshold <7.0: May produce low-quality optimizations
- Threshold >9.5: May be too strict

**Recommendations:**
- Production threshold: ≥8.0

### 3. Caching Validation

Validates cache configuration:

- **ttl**: 300-86400 seconds (5min - 24h)
- **maxEntries**: ≥100 (recommended: ≥5000 for production)
- **strategy**: 'lru', 'lfu', or 'fifo'

**Warnings:**
- maxEntries <100: Frequent cache evictions
- maxEntries >100k: High memory usage

**Recommendations:**
- Production maxEntries: ≥5000
- Enable compression for memory efficiency

### 4. Performance Validation

Validates performance settings:

- **maxProcessingTime**: 1000-30000ms
- **timeoutAction**: 'passthrough', 'error', or 'retry'
- **throttling.maxConcurrent**: ≥1
- **throttling.queueSize**: ≥maxConcurrent
- **circuitBreaker.threshold**: 0-1 (recommended: 0.5)

**Warnings:**
- Circuit breaker threshold >0.7: May trigger too late

**Recommendations:**
- Production timeoutAction: 'passthrough' for reliability

### 5. Monitoring Validation

Validates monitoring configuration:

- **metricsInterval**: 10000-600000ms (10s - 10min)
- **performanceThresholds**: p50 < p95 < p99
- **alerting.thresholds.errorRate**: 0-1
- **alerting.thresholds.successRate**: 0-1

**Warnings:**
- No monitoring in production
- No alert channels configured

**Errors:**
- Invalid threshold ordering (p50 ≥ p95 or p95 ≥ p99)

### 6. Security Validation

Validates security settings:

- **maxPromptLength**: 1000-100000 characters
- **rateLimiting.maxRequestsPerMinute**: ≥1
- **rateLimiting.maxRequestsPerHour**: ≥maxRequestsPerMinute

**Warnings:**
- maxPromptLength <1000: Too restrictive
- maxPromptLength >100k: DoS vulnerability

**Recommendations:**
- Enable input sanitization
- Enable malicious pattern rejection

### 7. Production-Specific Validation

Additional checks for production environment:

**Required:**
- Monitoring must be enabled
- Logging must be enabled

**Warnings:**
- Verbose logging impacts performance
- Console logging in production
- High bypass rate (>20%)

**Recommendations:**
- Quality threshold ≥8.0
- Enable circuit breaker
- Enable throttling
- Enable audit logging
- Use file logging

## Validation Report Format

```
================================================================================
CONFIGURATION VALIDATION REPORT
================================================================================

Status: ✅ VALID

ERRORS:
  1. ❌ quality.threshold must be between 1 and 10

WARNINGS:
  1. ⚠️  quality.threshold below 7.0 may result in low-quality optimizations
  2. ⚠️  caching.maxEntries below 100 may result in frequent evictions

RECOMMENDATIONS:
  1. 💡 Consider increasing quality.threshold to 8.0+ for production
  2. 💡 Enable caching.compressionEnabled for better memory efficiency
  3. 💡 Use performance.timeoutAction="passthrough" for production reliability

================================================================================
```

## Integration with CI/CD

### Pre-Deployment Validation

Add to your CI/CD pipeline:

```yaml
# .github/workflows/deploy.yml
jobs:
  validate-config:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run validate-config
      - name: Fail on validation errors
        if: failure()
        run: exit 1
```

### Pre-Commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
npm run validate-config
if [ $? -ne 0 ]; then
  echo "Configuration validation failed. Fix errors before committing."
  exit 1
fi
```

## Common Validation Errors

### Error: Missing Required Field

```
❌ Missing required field: quality
```

**Solution**: Add missing field to configuration:

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

### Error: Invalid Threshold Value

```
❌ quality.threshold must be between 1 and 10
```

**Solution**: Set threshold within valid range:

```json
{
  "quality": {
    "threshold": 8.5  // Changed from 12.0
  }
}
```

### Error: Performance Threshold Ordering

```
❌ monitoring.performanceThresholds.p50 must be < p95
```

**Solution**: Ensure proper ordering:

```json
{
  "monitoring": {
    "performanceThresholds": {
      "p50": 50,   // Median
      "p95": 200,  // 95th percentile
      "p99": 500   // 99th percentile
    }
  }
}
```

### Warning: Low Cache Entries

```
⚠️  caching.maxEntries below 100 may result in frequent evictions
```

**Solution**: Increase cache size:

```json
{
  "caching": {
    "maxEntries": 10000  // Changed from 50
  }
}
```

### Warning: Production Logging

```
⚠️  Verbose logging in production may impact performance
```

**Solution**: Use appropriate log level:

```json
{
  "logging": {
    "level": "info"  // Changed from "verbose"
  }
}
```

## Best Practices

### 1. Validate Before Deployment

Always validate configuration before deploying:

```bash
# Development
npm run validate-config -- ./config/automation-rules.json

# Staging
npm run validate-config -- ./config/staging.json

# Production
npm run validate-config -- ./config/production.json
```

### 2. Address All Errors

Never deploy with validation errors. Fix all errors before proceeding.

### 3. Review Warnings

Warnings indicate potential issues. Review and address them:

- **Critical warnings**: Address before production
- **Minor warnings**: Address in next release
- **Informational warnings**: Consider for optimization

### 4. Implement Recommendations

Recommendations improve performance, security, and reliability:

- **Performance**: Cache tuning, throttling, circuit breakers
- **Security**: Input sanitization, rate limiting
- **Reliability**: Graceful degradation, monitoring

### 5. Regular Validation

Re-validate configuration after changes:

- Manual configuration updates
- Version upgrades
- Infrastructure changes
- Load pattern changes

## Validation Checklist

### Pre-Production Deployment

- [ ] Run full validation on production config
- [ ] Zero validation errors
- [ ] All critical warnings addressed
- [ ] Security recommendations implemented
- [ ] Performance tuning complete
- [ ] Monitoring configured
- [ ] Alerting tested
- [ ] Backup configuration saved
- [ ] Rollback plan documented

### Configuration Updates

- [ ] Validate updated configuration
- [ ] Test in staging environment
- [ ] Review validation warnings
- [ ] Document changes
- [ ] Update version number
- [ ] Notify team of changes

## Troubleshooting

### Validation Script Not Found

```bash
# Install dependencies
npm install

# Build TypeScript files
npm run build

# Run validation
npm run validate-config
```

### Permission Denied

```bash
# Make script executable
chmod +x src/prompt-optimizer/config/validate-config.ts

# Or run with node
node src/prompt-optimizer/config/validate-config.js
```

### Invalid JSON

```
❌ Failed to load configuration: Unexpected token } in JSON
```

**Solution**: Fix JSON syntax errors. Use a JSON validator or linter.

### TypeScript Compilation Errors

```bash
# Rebuild TypeScript
npm run build

# Or compile specific file
tsc src/prompt-optimizer/config/validate-config.ts
```

## Support

For issues with configuration validation:

1. Review this guide
2. Check configuration schema in `/src/prompt-optimizer/automation/config.ts`
3. Consult production guide in `/docs/PRODUCTION_CONFIG_GUIDE.md`
4. Review automation guide in `/docs/AUTOMATION_GUIDE.md`

## Version History

- **v2.0.0**: Production configuration validation
- **v1.0.0**: Initial validation implementation
