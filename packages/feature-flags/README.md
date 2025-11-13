# @noa/feature-flags

Feature flag management system for Noa Server with support for multiple
providers and rollout strategies.

## Features

- Multiple providers (LaunchDarkly, Custom)
- Percentage-based rollouts
- User and group targeting
- Redis caching
- A/B testing support
- TypeScript support

## Installation

```bash
pnpm add @noa/feature-flags
```

## Quick Start

### LaunchDarkly Provider

```typescript
import { FeatureFlagManager } from '@noa/feature-flags';

const manager = new FeatureFlagManager({
  provider: 'launchdarkly',
  sdkKey: process.env.LAUNCHDARKLY_SDK_KEY,
  cacheEnabled: true,
  cacheTtl: 300,
});

await manager.initialize();

// Check if feature is enabled
const enabled = await manager.isEnabled('new-feature', {
  userId: 'user-123',
  userEmail: 'user@example.com',
});

if (enabled) {
  // Feature code
}
```

### Custom Provider

```typescript
import { FeatureFlagManager, CustomProvider } from '@noa/feature-flags';

const manager = new FeatureFlagManager({
  provider: 'custom',
  cacheEnabled: true,
  redisUrl: process.env.REDIS_URL,
});

await manager.initialize();

// Define a flag
const provider = manager['provider'] as CustomProvider;
await provider.setFlag({
  key: 'beta-feature',
  name: 'Beta Feature',
  enabled: true,
  defaultValue: true,
  strategy: {
    type: 'percentage',
    config: { percentage: 50 },
  },
});
```

## Usage Examples

### Boolean Flags

```typescript
const enabled = await manager.isEnabled('new-ui', context);
```

### String Variants

```typescript
const variant = await manager.variant(
  'button-color',
  context,
  ['blue', 'green', 'red'],
  'blue'
);
```

### Percentage Rollout

```typescript
import { PercentageStrategy } from '@noa/feature-flags';

const strategy = PercentageStrategy.create(25); // 25% rollout
```

### User Targeting

```typescript
import { UserStrategy } from '@noa/feature-flags';

const strategy = UserStrategy.createForUsers(['user-1', 'user-2']);
```

### Group Targeting

```typescript
const strategy = UserStrategy.createForGroups(['beta-testers', 'internal']);
```

### Gradual Rollout

```typescript
const stages = PercentageStrategy.createGradualRollout([10, 25, 50, 100]);
```

### Conditional Execution

```typescript
await manager.withFlag(
  'new-feature',
  context,
  async () => {
    // Feature enabled
    return newImplementation();
  },
  async () => {
    // Feature disabled
    return oldImplementation();
  }
);
```

## API Reference

### FeatureFlagManager

#### Methods

- `initialize(): Promise<void>` - Initialize the manager
- `isReady(): boolean` - Check if manager is ready
- `isEnabled(flagKey, context, defaultValue): Promise<boolean>` - Check if flag
  is enabled
- `getValue(flagKey, context, defaultValue): Promise<T>` - Get flag value
- `getAllFlags(context): Promise<Record<string, any>>` - Get all flags
- `track(eventName, context, data): Promise<void>` - Track event
- `withFlag(flagKey, context, enabledFn, disabledFn): Promise<T>` - Conditional
  execution
- `variant(flagKey, context, variants, default): Promise<T>` - Get variant
- `close(): Promise<void>` - Close manager

### PercentageStrategy

- `create(percentage): RolloutStrategy` - Create percentage strategy
- `shouldEnable(userId, flagKey, percentage): boolean` - Check if user should
  see feature
- `createGradualRollout(stages): RolloutStrategy[]` - Create gradual rollout

### UserStrategy

- `createForUsers(users): RolloutStrategy` - Target specific users
- `createForGroups(groups): RolloutStrategy` - Target user groups
- `shouldEnableForUser(userId, targetUsers): boolean` - Check user match
- `shouldEnableForGroups(userGroups, targetGroups): boolean` - Check group match
- `createForBetaTesters(): RolloutStrategy` - Beta tester strategy
- `createForInternalTeam(): RolloutStrategy` - Internal team strategy

## Environment Variables

```env
LAUNCHDARKLY_SDK_KEY=sdk-key-here
REDIS_URL=redis://localhost:6379
```

## Testing

```bash
pnpm test
pnpm test:coverage
```

## License

MIT
