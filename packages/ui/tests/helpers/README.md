# Test Helpers

This directory contains test utilities and helpers for the UI package test suite.

## Files

- `test-utils.tsx` - Custom render functions, mocks, and test helpers

## Usage

### Custom Render

```typescript
import { render, screen } from '../helpers/test-utils';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Mock Helpers

```typescript
import {
  createMockFile,
  mockLocalStorage,
  mockWebSocket,
} from '../helpers/test-utils';

// Create mock file
const file = createMockFile('test.txt', 'content');

// Mock localStorage
const storage = mockLocalStorage();
global.localStorage = storage as any;

// Mock WebSocket
mockWebSocket();
const ws = new WebSocket('ws://localhost');
```

### Mock Data

```typescript
import { createMockMessages, createMockFiles } from '../helpers/test-utils';

// Create 10 mock chat messages
const messages = createMockMessages(10);

// Create 5 mock files
const files = createMockFiles(5);
```

## Available Mocks

- **File System**: `createMockFile`, `createMockImage`
- **Browser APIs**: `mockLocalStorage`, `mockIntersectionObserver`, `mockResizeObserver`, `mockMatchMedia`
- **Network**: `mockFetch`, `mockWebSocket`
- **IndexedDB**: `mockIndexedDB`
- **Clipboard**: `mockClipboard`
- **Data Generators**: `createMockMessages`, `createMockFiles`
- **Performance**: `measureTestPerformance`

## Best Practices

1. Always clean up mocks in `afterEach` hooks
2. Use specific mocks instead of global mocks when possible
3. Reset mocks between tests to avoid state leakage
4. Use the custom `render` function for consistent provider setup
