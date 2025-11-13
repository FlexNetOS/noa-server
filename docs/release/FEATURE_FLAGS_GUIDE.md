# Feature Flags Guide

Complete guide to using feature flags for gradual rollouts and A/B testing.

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Basic Usage](#basic-usage)
4. [Rollout Strategies](#rollout-strategies)
5. [A/B Testing](#ab-testing)
6. [Best Practices](#best-practices)

## Overview

Feature flags (feature toggles) allow you to deploy code but control feature
visibility at runtime. This enables:

- Gradual feature rollouts
- A/B testing
- Kill switches for problematic features
- Dark launches (deploy without releasing)
- Canary releases

## Setup

### Installation

```bash
cd packages/feature-flags
pnpm install
pnpm run build
```

### LaunchDarkly Setup

```bash
# Set SDK key
export LAUNCHDARKLY_SDK_KEY=sdk-xxx

# Initialize in application
import { FeatureFlagManager } from '@noa/feature-flags';

const flags = new FeatureFlagManager({
  provider: 'launchdarkly',
  sdkKey: process.env.LAUNCHDARKLY_SDK_KEY,
  cacheEnabled: true,
  cacheTtl: 300,
});

await flags.initialize();
```

### Custom Provider Setup

```bash
# Set Redis URL
export REDIS_URL=redis://localhost:6379

# Initialize
const flags = new FeatureFlagManager({
  provider: 'custom',
  cacheEnabled: true,
  redisUrl: process.env.REDIS_URL,
});

await flags.initialize();
```

## Basic Usage

### Boolean Flags

Enable/disable features:

```typescript
// Check if feature is enabled
const enabled = await flags.isEnabled('new-ui', {
  userId: user.id,
  userEmail: user.email,
});

if (enabled) {
  return renderNewUI();
} else {
  return renderOldUI();
}
```

### String Variants

Return different values:

```typescript
// Get variant
const theme = await flags.getValue('ui-theme', context, 'light');

// Use variant
switch (theme) {
  case 'dark':
    return DarkTheme;
  case 'light':
    return LightTheme;
  case 'auto':
    return AutoTheme;
}
```

### Conditional Execution

Execute different code paths:

```typescript
await flags.withFlag(
  'new-algorithm',
  context,
  async () => {
    // New implementation
    return newAlgorithm(data);
  },
  async () => {
    // Old implementation
    return oldAlgorithm(data);
  }
);
```

## Rollout Strategies

### Percentage-Based Rollout

Gradually roll out to users:

```typescript
import { PercentageStrategy } from '@noa/feature-flags';

// 10% rollout
const strategy = PercentageStrategy.create(10);

// Gradual rollout: 10% -> 25% -> 50% -> 100%
const stages = PercentageStrategy.createGradualRollout([10, 25, 50, 100]);
```

**Example**: New checkout flow

```typescript
// Week 1: 10% of users
// Week 2: 25% of users
// Week 3: 50% of users
// Week 4: 100% of users

const enabled = await flags.percentage('new-checkout', context, 25);
```

### User-Based Targeting

Target specific users:

```typescript
import { UserStrategy } from '@noa/feature-flags';

// Target specific users
const strategy = UserStrategy.createForUsers(['user-123', 'user-456']);

// Beta testers
const betaStrategy = UserStrategy.createForBetaTesters();

// Internal team
const internalStrategy = UserStrategy.createForInternalTeam();
```

**Example**: Beta feature for select users

```typescript
const enabled = await flags.isEnabled('beta-feature', {
  userId: user.id,
  userGroups: user.groups, // ['beta-testers']
});
```

### Group-Based Targeting

Target user groups:

```typescript
const strategy = UserStrategy.createForGroups([
  'beta-testers',
  'premium-users',
  'enterprise-customers',
]);

// Check if user's groups match
const enabled = await flags.isEnabled('premium-feature', {
  userId: user.id,
  userGroups: ['premium-users'],
});
```

## Rollout Workflows

### Gradual Feature Rollout

**Phase 1: Internal Testing** (Week 1)

```typescript
// Target: Internal team only
const strategy = UserStrategy.createForInternalTeam();

// In LaunchDarkly UI:
// - Enable flag
// - Target: internal team
// - Monitor: errors, performance
```

**Phase 2: Beta Testing** (Week 2)

```typescript
// Target: Beta testers
const strategy = UserStrategy.createForBetaTesters();

// Expand to beta users
// Monitor: user feedback, metrics
```

**Phase 3: Gradual Rollout** (Weeks 3-6)

```typescript
// Week 3: 10% of users
const stage1 = PercentageStrategy.create(10);

// Week 4: 25% of users
const stage2 = PercentageStrategy.create(25);

// Week 5: 50% of users
const stage3 = PercentageStrategy.create(50);

// Week 6: 100% of users
const stage4 = PercentageStrategy.create(100);
```

**Phase 4: Full Release**

```typescript
// Enable for all users
// Remove flag from code after 2 weeks
```

### Kill Switch Pattern

Emergency disable for problematic features:

```typescript
// In emergency: disable flag in LaunchDarkly
// Feature immediately disabled for all users

const enabled = await flags.isEnabled('new-feature', context, false);

if (!enabled) {
  // Fallback to old implementation
  return safeOldImplementation();
}

// New feature code
return riskyNewFeature();
```

## A/B Testing

### Simple A/B Test

```typescript
const variant = await flags.variant(
  'button-color',
  context,
  ['red', 'blue', 'green'],
  'blue'
);

// Track conversion
await flags.track('button-clicked', context, {
  variant,
  timestamp: Date.now(),
});

// Render variant
return <Button color={variant}>Click Me</Button>;
```

### Multi-Variant Test

```typescript
const algorithm = await flags.variant(
  'recommendation-algorithm',
  context,
  ['collaborative', 'content-based', 'hybrid'],
  'collaborative'
);

const recommendations = await getRecommendations(user, algorithm);

// Track interaction
await flags.track('recommendation-clicked', context, {
  algorithm,
  itemId: clicked.id,
});
```

### A/B Test Workflow

1. **Setup** (LaunchDarkly)

   ```json
   {
     "key": "checkout-flow",
     "variations": [
       { "name": "control", "value": "old-checkout" },
       { "name": "variant-a", "value": "new-checkout-v1" },
       { "name": "variant-b", "value": "new-checkout-v2" }
     ],
     "targeting": {
       "percentage": {
         "control": 34,
         "variant-a": 33,
         "variant-b": 33
       }
     }
   }
   ```

2. **Implementation**

   ```typescript
   const variant = await flags.getValue('checkout-flow', context, 'old-checkout');

   switch (variant) {
     case 'old-checkout':
       return <OldCheckout />;
     case 'new-checkout-v1':
       return <NewCheckoutV1 />;
     case 'new-checkout-v2':
       return <NewCheckoutV2 />;
   }
   ```

3. **Tracking**

   ```typescript
   // Track conversion
   await flags.track('checkout-completed', context, {
     variant,
     revenue: order.total,
     items: order.items.length,
   });
   ```

4. **Analysis**
   - Compare conversion rates
   - Analyze revenue per variant
   - Statistical significance testing
   - Choose winner

5. **Rollout Winner**
   ```typescript
   // Update flag to 100% winning variant
   // Remove other variants from code
   ```

## Integration with Deployment

### Canary Release with Feature Flags

Combine blue-green deployment with feature flags:

```typescript
// Deploy code with flag disabled
const enabled = await flags.percentage('new-feature', context, 0);

// Gradually enable:
// 1. Enable for 10% in blue deployment
// 2. Monitor metrics
// 3. Increase to 25%, 50%, 100%
// 4. Switch to green deployment
// 5. Disable flag after verification
```

### Dark Launch

Deploy code but keep feature hidden:

```typescript
// Deploy with flag disabled
const enabled = await flags.isEnabled('dark-feature', context, false);

// Code is deployed but not accessible
if (enabled) {
  // New feature (currently disabled)
  return newFeature();
}

// Old behavior (everyone sees this)
return oldBehavior();
```

## Best Practices

### 1. Flag Naming Conventions

```typescript
// Good names
'new-checkout-flow';
'recommendation-algorithm-v2';
'beta-dashboard-widgets';

// Bad names
'flag1';
'test';
'temp-fix';
```

### 2. Context Information

Always provide rich context:

```typescript
const context = {
  userId: user.id,
  userEmail: user.email,
  userGroups: user.groups,
  customAttributes: {
    accountType: user.accountType,
    registrationDate: user.createdAt,
    country: user.country,
  },
};
```

### 3. Default Values

Always provide safe defaults:

```typescript
// Good: Safe default
const enabled = await flags.isEnabled('risky-feature', context, false);

// Good: Fallback behavior
const theme = await flags.getValue('theme', context, 'light');
```

### 4. Flag Lifecycle

```typescript
// 1. Create flag (disabled)
// 2. Test with internal team
// 3. Gradual rollout
// 4. Full release (100%)
// 5. Remove flag after 2 weeks
// 6. Clean up code
```

### 5. Monitoring

Track flag usage:

```typescript
// Track when flag is evaluated
await flags.track('flag-evaluated', context, {
  flagKey: 'new-feature',
  value: enabled,
  timestamp: Date.now(),
});

// Monitor in dashboards
// Alert on unexpected changes
```

### 6. Documentation

Document all flags:

```typescript
/**
 * Feature: New Checkout Flow
 * Flag: new-checkout-flow
 * Type: Boolean
 * Rollout: 10% -> 25% -> 50% -> 100%
 * Metrics: Conversion rate, revenue
 * Owner: @checkout-team
 * Cleanup: 2025-11-22
 */
const enabled = await flags.isEnabled('new-checkout-flow', context);
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature with flag', () => {
  let flags: FeatureFlagManager;

  beforeEach(() => {
    flags = new FeatureFlagManager({
      provider: 'custom',
      cacheEnabled: false,
    });
  });

  it('should use new implementation when enabled', async () => {
    // Mock flag as enabled
    const result = await processWithFlag(flags, context, true);
    expect(result).toBe('new-implementation');
  });

  it('should use old implementation when disabled', async () => {
    // Mock flag as disabled
    const result = await processWithFlag(flags, context, false);
    expect(result).toBe('old-implementation');
  });
});
```

### Integration Tests

```typescript
describe('Feature rollout', () => {
  it('should rollout to 50% of users', async () => {
    const iterations = 1000;
    let enabled = 0;

    for (let i = 0; i < iterations; i++) {
      const result = await flags.percentage(
        'test-flag',
        { userId: `user-${i}` },
        50
      );
      if (result) enabled++;
    }

    const percentage = (enabled / iterations) * 100;
    expect(percentage).toBeGreaterThan(45);
    expect(percentage).toBeLessThan(55);
  });
});
```

## Troubleshooting

### Flag Not Working

```typescript
// Check if manager is ready
console.log('Ready:', flags.isReady());

// Check context
console.log('Context:', context);

// Get all flags for debugging
const allFlags = await flags.getAllFlags(context);
console.log('All flags:', allFlags);
```

### Cache Issues

```typescript
// Clear cache if values seem stale
const flags = new FeatureFlagManager({
  provider: 'custom',
  cacheEnabled: true,
  cacheTtl: 60, // Reduce TTL for testing
});
```

### Provider Issues

```typescript
// Test provider connection
try {
  await flags.initialize();
  console.log('Provider ready');
} catch (error) {
  console.error('Provider error:', error);
}
```

## Support

- Documentation: `packages/feature-flags/README.md`
- Examples: `packages/feature-flags/examples/`
- Slack: #feature-flags
- LaunchDarkly: https://app.launchdarkly.com
